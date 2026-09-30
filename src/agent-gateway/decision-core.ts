/**
 * Decision core for the Google Agent Gateway `CONTENT_AUTHZ` extension.
 *
 * This module is deliberately free of gRPC and process concerns: it takes a fully
 * received `(headers, body)` pair and returns an `EnvoyProcessingResponse`. That
 * keeps the security decision unit-testable without a socket, and keeps the
 * stream plumbing in `server.ts` from ever making a policy call.
 *
 * Two rules hold throughout:
 *
 *  1. **Allow and deny are the only two outcomes, and deny always carries an
 *     `immediateResponse`.** The empty object returned for an allow is a
 *     sentinel meaning "no denial", not a message to put on the wire: in
 *     `FULL_DUPLEX_STREAMED` the data plane requires a body request to be
 *     answered with a `streamedResponse` carrying the bytes onward, so
 *     `server.ts` turns this sentinel into the ordered headers/body/trailers
 *     sequence. Treating the empty object as an on-the-wire response would
 *     forward an empty body. The service never rewrites or inspects response
 *     bodies, so it cannot become a data-exfiltration path.
 *
 *  2. **Anything unrecognised is denied.** An unknown payload shape is not
 *     "not a tool call, therefore fine" -- it is a payload this service cannot
 *     reason about. It denies with a distinct `unrecognised-payload` rule so the
 *     case is visible in logs rather than silently passing.
 */
import type {
  ToolCallDefenseInput,
  ToolCallDefenseDeps,
  ToolCallDefenseResult,
} from '../proxy/tool-call-defense-orchestrator.js';
import { evaluateToolCallDefense } from '../proxy/tool-call-defense-orchestrator.js';
import { estimateArgumentTokens } from '../policy/estimate-argument-tokens.js';
import { Logger } from '../utils/logger.js';
import type {
  EnvoyHeaderValue,
  EnvoyHttpHeaders,
  EnvoyProcessingResponse,
} from './protos.js';

/** Result of shaping the inbound payload into a policy input. */
export type ToolCallParse =
  | { ok: true; input: ToolCallDefenseInput }
  | { ok: false; rule: string; reason: string };

/**
 * Max request body this service will buffer and parse.
 *
 * `FULL_DUPLEX_STREAMED` permits buffering the whole message, which is exactly
 * what the server does so a deny can precede any upstream forwarding. This cap
 * is a separate, deliberate bound on that buffer: an oversized body is denied
 * while it is still arriving rather than after it is fully resident.
 */
export const MAX_BODY_BYTES = 8 * 1024 * 1024;

/**
 * Largest serialized `arguments` object this service will hand to the policy
 * engine.
 *
 * This bound exists because of a measured property of the engine, not a guess.
 * `scanForSecrets` runs 268 rules as 268 independent full-string passes, so the
 * decision cost is linear in argument size with a large constant. Measured on the
 * development machine: ~126 ms at 1 kB, ~6.5 s at 50 kB, and still unfinished at
 * 200 kB. The decision timeout cannot rescue that, because the scan is
 * synchronous and blocks the event loop -- a `Promise.race` on a timer does not
 * fire while the CPU is busy.
 *
 * So a large argument object is refused here, before the engine runs, rather than
 * being allowed to stall past the gateway's own extension timeout and surface as
 * an opaque 5xx. A 403 that names its reason is both fail-closed and more useful
 * than a timeout.
 *
 * Deliberately *not* a truncation: scanning only a prefix would leave the tail
 * uninspected, which is a security hole wearing a performance fix's clothing.
 *
 * The cost is real. A legitimate `write_file` or long query can exceed 32 KiB and
 * will be refused. Raising this cap means raising the decision timeout and the
 * extension's `grpc_service.timeout` with it, or fixing the scanner's asymptotics
 * (a worker thread with a hard terminate, or a cheap prefilter that cannot drop a
 * rule). Do not raise it without re-measuring.
 */
export const MAX_SCANNED_ARGUMENT_BYTES = 32 * 1024;

/** Reads the argument cap, falling back to the default when unset or unparseable. */
function maxScannedArgumentBytes(): number {
  const raw = process.env['MASTYF_AGENT_GATEWAY_MAX_SCANNED_ARGUMENT_BYTES'];
  if (raw === undefined) return MAX_SCANNED_ARGUMENT_BYTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    Logger.warn(
      `[agent-gateway] Ignoring invalid MASTYF_AGENT_GATEWAY_MAX_SCANNED_ARGUMENT_BYTES=${raw}; using ${MAX_SCANNED_ARGUMENT_BYTES}`,
    );
    return MAX_SCANNED_ARGUMENT_BYTES;
  }
  return parsed;
}

/**
 * Maps a policy verdict code onto a valid HTTP status.
 *
 * The orchestrator is transport-agnostic and reports MCP/JSON-RPC error codes,
 * which are *negative* (for example -32001). Those are meaningless as an HTTP
 * status, so a raw pass-through would put an invalid status on the wire. A
 * denial is a client-side refusal, hence 4xx; anything outside that range
 * collapses to 403. The original code is preserved in the response body so the
 * transport-specific reason is not lost.
 */
export function toHttpStatus(code: number | undefined): number {
  if (typeof code === 'number' && Number.isInteger(code) && code >= 400 && code <= 599) {
    return code;
  }
  return 403;
}

/**
 * The allow sentinel.
 *
 * Deliberately *not* an on-the-wire `ProcessingResponse`: see the module note on
 * allow/deny. `server.ts` reads the absence of `immediateResponse` as an allow
 * and emits the required `streamedResponse` body mutation instead.
 */
export function buildAllowResponse(): EnvoyProcessingResponse {
  return {};
}

export function buildDenyResponse(params: {
  code: number;
  details: string;
  body?: unknown;
}): EnvoyProcessingResponse {
  const payload = JSON.stringify(
    params.body ?? {
      error: {
        code: params.code,
        message: 'Blocked by Mastyf AI',
        reason: params.details,
      },
    },
  );

  return {
    immediateResponse: {
      // NOT a bare number: `HttpStatus` is a message that wraps the `StatusCode`
      // enum. `status: 403` fails at serialisation time, not compile time.
      status: { code: params.code },
      body: Buffer.from(payload, 'utf8'),
      details: `mastyf: ${params.details}`,
      headers: {
        setOrAdd: [
          {
            header: { key: 'content-type', value: 'application/json' },
            appendAction: 'OVERWRITE_IF_EXISTS',
          },
        ],
      },
    },
  };
}

/** Flattens an Envoy `HeaderMap` into a plain lower-cased record. */
export function headersToRecord(headers: EnvoyHttpHeaders | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of headers?.headers?.headers ?? []) {
    const key = entry.key?.toLowerCase();
    if (!key) continue;
    const raw = entry.rawValue;
    if (raw !== undefined && raw !== null) {
      out[key] = typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
    } else if (typeof entry.value === 'string') {
      out[key] = entry.value;
    }
  }
  return out;
}

function toBuffer(body: Buffer | Uint8Array | string | undefined): Buffer {
  if (body === undefined || body === null) return Buffer.alloc(0);
  if (typeof body === 'string') return Buffer.from(body, 'utf8');
  return Buffer.from(body);
}

/**
 * Derives the MCP server name from the request path.
 *
 * Agent Gateway routes are typically `/mcp/<server>/...` or `/<server>/v1/...`;
 * the first path segment that is not a well-known prefix is the server name.
 */
function deriveServerName(pathValue: string | undefined, fallback: string): string {
  if (!pathValue) return fallback;
  const segments = pathValue.split('/').filter(Boolean);
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (lower === 'mcp' || lower === 'v1' || lower === 'v1beta' || lower === 'rpc') continue;
    return segment;
  }
  return fallback;
}

/**
 * Shapes a received HTTP request into a policy input.
 *
 * Supports the MCP JSON-RPC `tools/call` shape. Any other JSON-RPC method, a
 * non-JSON body, an oversized body, or JSON that does not match the expected
 * shape all fail closed with a specific rule.
 */
export function parseToolCall(params: {
  headers: Record<string, string>;
  body: Buffer;
  defaultServerName: string;
  defaultTenantId: string;
}): ToolCallParse {
  const { headers, body, defaultServerName, defaultTenantId } = params;

  if (body.length === 0) {
    return { ok: false, rule: 'empty-payload', reason: 'Request carried no body to authorize' };
  }
  if (body.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      rule: 'payload-too-large',
      reason: `Body of ${body.length} bytes exceeds the ${MAX_BODY_BYTES} byte authorization limit`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    return {
      ok: false,
      rule: 'unrecognised-payload',
      reason: 'Body is not valid JSON; this service authorizes JSON tool calls only',
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      rule: 'unrecognised-payload',
      reason: 'Body is not a JSON-RPC object',
    };
  }

  const envelope = parsed as { jsonrpc?: unknown; method?: unknown; id?: unknown; params?: unknown };
  if (envelope.jsonrpc !== '2.0') {
    return {
      ok: false,
      rule: 'unrecognised-payload',
      reason: 'Missing JSON-RPC 2.0 envelope',
    };
  }
  if (envelope.method !== 'tools/call') {
    return {
      ok: false,
      rule: 'unauthorised-method',
      reason: `JSON-RPC method '${String(envelope.method)}' is not authorized by this extension`,
    };
  }

  const rpcParams = envelope.params as { name?: unknown; arguments?: unknown } | undefined;
  if (!rpcParams || typeof rpcParams.name !== 'string' || rpcParams.name.length === 0) {
    return {
      ok: false,
      rule: 'unrecognised-payload',
      reason: "tools/call is missing a string 'name'",
    };
  }

  const args =
    rpcParams.arguments !== undefined && rpcParams.arguments !== null
      ? (rpcParams.arguments as Record<string, unknown>)
      : undefined;
  if (args !== undefined && (typeof args !== 'object' || Array.isArray(args))) {
    return {
      ok: false,
      rule: 'unrecognised-payload',
      reason: "tools/call 'arguments' must be an object",
    };
  }

  const tenantId = headers['x-mastyf-tenant'] ?? defaultTenantId;
  const requestIdHeader = headers['x-request-id'] ?? headers['x-correlation-id'];

  return {
    ok: true,
    input: {
      serverName: headers['x-mastyf-server'] ?? deriveServerName(headers[':path'], defaultServerName),
      toolName: rpcParams.name,
      arguments: args,
      requestId: requestIdHeader ?? `agw-${String(envelope.id ?? 'anon')}`,
      // No transport-reported token count exists at an authorization boundary, so
      // this is an estimate from the argument payload. It used to be a literal 0,
      // which read as "cheap" to every consumer that reads `requestTokens`
      // directly -- loop burn-rate, session-flow token totals, the per-user token
      // budget, and the post-policy spend reservation in `proxy-post-allow-gates`
      // (where 0 collapses `estimateUsd` to its $0.001 floor). The engine's own
      // `maxTokens` rules were unaffected because they take a max over their own
      // estimate, which is why the loss was invisible from the outside.
      //
      // Estimate, not a measurement: it is a guard input. Billing reads real
      // tokenizer counts from proxy records, and this path writes none.
      requestTokens: estimateArgumentTokens(args),
      tenantId,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(
        Object.entries(headers).filter(([key]) => !key.startsWith(':')),
      ),
      meta: { transport: 'agent-gateway-ext-proc' },
    },
  };
}

/**
 * Runs the Mastyf defense pipeline for one received request and maps the verdict
 * onto an Envoy response.
 */
export async function decideRequest(params: {
  headers: Record<string, string>;
  body: Buffer;
  deps: ToolCallDefenseDeps;
  defaultServerName: string;
  defaultTenantId: string;
}): Promise<EnvoyProcessingResponse> {
  const parse = parseToolCall(params);

  if (!parse.ok) {
    Logger.warn(`[agent-gateway] Denying unrecognized request: ${parse.rule} - ${parse.reason}`);
    return buildDenyResponse({ code: 403, details: `${parse.rule}: ${parse.reason}` });
  }

  // Refuse an argument set the engine cannot scan inside the decision budget.
  // Checked before the engine so the cost is never incurred, and denied rather
  // than truncated: a partial scan is an uninspected tail.
  let argumentBytes: number;
  try {
    argumentBytes = Buffer.byteLength(JSON.stringify(parse.input.arguments ?? {}), 'utf8');
  } catch (error) {
    // Defensive only. `arguments` arrives via JSON.parse, which cannot produce a
    // cycle, so this is unreachable through the wire today. It is kept because a
    // future non-JSON caller would otherwise get a thrown TypeError out of a deny
    // path, and because the scanner could not read such a value either.
    const message = error instanceof Error ? error.message : String(error);
    return buildDenyResponse({
      code: 403,
      details: `unserialisable-arguments: ${message}`,
    });
  }
  const argumentCap = maxScannedArgumentBytes();
  if (argumentBytes > argumentCap) {
    Logger.warn(
      `[agent-gateway] Denying call with ${argumentBytes} argument bytes; cap is ${argumentCap}`,
    );
    return buildDenyResponse({
      code: 403,
      details: `arguments-too-large-for-authorization: ${argumentBytes} bytes exceeds cap ${argumentCap}`,
      body: {
        error: {
          code: -32001,
          httpStatus: 403,
          message: 'Blocked by Mastyf AI',
          reason: `arguments-too-large-for-authorization: ${argumentBytes} bytes exceeds cap ${argumentCap}`,
        },
      },
    });
  }

  let result: ToolCallDefenseResult;
  try {
    result = await evaluateToolCallDefense(parse.input, params.deps);
  } catch (error) {
    // Mirrors the stdio transport: an engine failure is a deny, never an approval.
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`[agent-gateway] Policy engine failure; failing closed: ${message}`);
    return buildDenyResponse({
      code: 403,
      details: `fail-closed-invariant: POLICY_ENGINE_ERROR (${message})`,
    });
  }

  if (!result || typeof result.allowed !== 'boolean') {
    Logger.error('[agent-gateway] Malformed policy decision; failing closed');
    return buildDenyResponse({
      code: 403,
      details: 'fail-closed-invariant: MALFORMED_DECISION',
    });
  }

  if (result.allowed) {
    return buildAllowResponse();
  }

  // The verdict may carry a transport-specific (possibly negative) code; it goes
  // in the body for traceability, while `status` gets a real HTTP status.
  return buildDenyResponse({
    code: toHttpStatus(result.code),
    details: `${result.phase}:${result.rule}:${result.reason}`,
    body: {
      error: {
        code: result.code,
        httpStatus: toHttpStatus(result.code),
        message: 'Blocked by Mastyf AI',
        reason: `${result.phase}:${result.rule}:${result.reason}`,
      },
    },
  });
}
