/**
 * End-to-end tests over a real gRPC connection using the real vendored Envoy
 * protos.
 *
 * This is the only layer that can catch a malformed `ImmediateResponse` or a
 * mishandled oneof, because both only surface once protobufjs serialises the
 * bytes. In particular, `ProcessingRequest` carries exactly one field of the
 * `request` oneof, so request headers and request body MUST be written as two
 * separate messages -- combining them silently drops one, which is exactly the
 * bug an earlier version of this file had.
 *
 * The `CONTENT_AUTHZ` profile requires `FULL_DUPLEX_STREAMED` handling of every
 * event, so the lifecycle test drives the full request + response + trailer
 * sequence and asserts the ordered headers/body/trailers response for each.
 *
 * The response-count assertions below are the regression guard for the two bugs
 * a wire-only test can hide:
 *
 *  1. Answering a body request with an empty `ProcessingResponse` does NOT mean
 *     "no modification" in this mode -- it forwards an **empty body**. The body
 *     must come back in a `streamedResponse`, so a permitted call asserts the
 *     exact bytes it sent.
 *  2. The request headers are deliberately *not* answered until the body has
 *     been judged, so a buffered authorizer emits fewer responses than it
 *     receives on the request side. `envoy-integration.test.ts` proves the same
 *     behaviour against a real Envoy.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { createExternalProcessorServer } from '../../src/agent-gateway/server.js';
import { ExternalProcessorService } from '../../src/agent-gateway/protos.js';
import { MAX_BODY_BYTES } from '../../src/agent-gateway/decision-core.js';
import { PolicyEngine } from '../../src/policy/policy-engine.js';
import type { PolicyConfig } from '../../src/policy/policy-types.js';
import type { ToolCallDefenseDeps } from '../../src/proxy/tool-call-defense-orchestrator.js';

type Rule = PolicyConfig['policy']['rules'][number];

/** Denies exactly one tool, so the same server can exercise allow and deny. */
const POLICY: PolicyConfig = {
  version: 'test',
  policy: {
    mode: 'block',
    default_action: 'pass',
    rules: [
      {
        // No `patterns` here: a catch-all pattern matches every argument string
        // and would block the allowed tool too. Denying by tool name keeps the
        // allow path (get_balance) genuinely exercising the default action.
        name: 'deny-reads',
        action: 'block',
        tools: { deny: ['read_file'] },
      } as unknown as Rule,
    ],
  },
};

let server: grpc.Server;
let client: grpc.Client;

function connect(): Promise<number> {
  return new Promise((resolve, reject) => {
    server.bindAsync(
      '127.0.0.1:0',
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => (error ? reject(error) : resolve(boundPort)),
    );
  });
}

function entries(headers: Record<string, string>) {
  return Object.entries(headers).map(([key, value]) => ({
    key,
    rawValue: Buffer.from(value, 'utf8'),
  }));
}

/* Each helper builds exactly one ProcessingRequest, populating one oneof field. */
type Message = Record<string, unknown>;

const requestHeaders = (headers: Record<string, string>, endOfStream: boolean): Message => ({
  requestHeaders: { headers: { headers: entries(headers) }, endOfStream },
});
const requestBody = (body: Buffer, endOfStream: boolean): Message => ({
  requestBody: { body, endOfStream },
});
const responseHeaders = (headers: Record<string, string>): Message => ({
  responseHeaders: { headers: { headers: entries(headers) }, endOfStream: false },
});
const responseBody = (body: Buffer, endOfStream: boolean): Message => ({
  responseBody: { body, endOfStream },
});
const requestTrailers = (headers: Record<string, string>): Message => ({
  requestTrailers: { trailers: { headers: entries(headers) } },
});
const responseTrailers = (headers: Record<string, string>): Message => ({
  responseTrailers: { trailers: { headers: entries(headers) } },
});
/** A message that populates no oneof field at all (flow-control-only shape). */
const flowControlOnly = (): Message => ({
  flowControlInit: {
    initialWindowDownstreamToSidestream: 65536,
    initialWindowSidestreamToUpstream: 65536,
    initialWindowUpstreamToSidestream: 65536,
    initialWindowSidestreamToDownstream: 65536,
  },
});

/** Writes each message in order, half-closes, and collects every response. */
function exchange(messages: Message[]): Promise<{ responses: unknown[]; error?: Error }> {
  return new Promise((resolve) => {
    const stream = (client as unknown as {
      Process: () => grpc.ClientDuplexStream<unknown, unknown>;
    }).Process();

    const responses: unknown[] = [];
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      resolve(error ? { responses, error } : { responses });
    };

    stream.on('data', (response: unknown) => responses.push(response));
    stream.on('error', (error: Error) => finish(error));
    stream.on('end', () => finish());

    for (const message of messages) stream.write(message);
    stream.end();
  });
}

interface StreamedBody {
  body?: Buffer;
  endOfStream?: boolean;
}

interface ProcessingView {
  immediateResponse?: { status?: { code?: unknown }; body?: Buffer; details?: string };
  requestHeaders?: unknown;
  responseHeaders?: unknown;
  requestBody?: { response?: { bodyMutation?: { streamedResponse?: StreamedBody } } };
  responseBody?: { response?: { bodyMutation?: { streamedResponse?: StreamedBody } } };
  requestTrailers?: unknown;
  responseTrailers?: unknown;
  serverWindowUpdate?: unknown;
}

const asView = (response: unknown): ProcessingView => response as ProcessingView;
const streamed = (response: unknown): StreamedBody =>
  asView(response).requestBody?.response?.bodyMutation?.streamedResponse ??
  asView(response).responseBody?.response?.bodyMutation?.streamedResponse ??
  {};
const jsonBody = (response: unknown): { error: { reason?: string } } =>
  JSON.parse(asView(response).immediateResponse!.body!.toString('utf8'));

const call = (name: string, args: Record<string, unknown>, id: number): Buffer =>
  Buffer.from(
    JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }),
    'utf8',
  );

const READ_FILE = call('read_file', { path: '/etc/passwd' }, 1);
const GET_BALANCE = call('get_balance', { account: '123' }, 2);

beforeAll(async () => {
  const deps: ToolCallDefenseDeps = { policyEngine: new PolicyEngine(POLICY) };
  server = createExternalProcessorServer({
    deps,
    defaultServerName: 'agw',
    defaultTenantId: 'default',
  });
  const port = await connect();
  client = new (ExternalProcessorService as unknown as new (
    address: string,
    creds: grpc.ChannelCredentials,
  ) => grpc.Client)(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
});

afterAll(() => {
  client?.close();
  server?.forceShutdown();
});

describe('ExternalProcessor deny over the real wire', () => {
  it('withholds the header response, then denies the terminal body chunk', async () => {
    const { responses, error } = await exchange([
      requestHeaders({ ':path': '/mcp/agw/call' }, false),
      requestBody(READ_FILE, true),
    ]);

    // A serialisation failure surfaces here as a gRPC INTERNAL error.
    expect(error).toBeUndefined();
    // One response, not two: the headers are deliberately unanswered so the body
    // can still be withheld from upstream when the verdict is a deny.
    expect(responses).toHaveLength(1);

    const deny = asView(responses[0]).immediateResponse!;
    // The proof that `status` was shaped as a message, not a bare number.
    expect(deny.status).toBeTypeOf('object');
    // This client shares the server's loader options, and `enums: String` decodes
    // enum 403 back to its name. Receiving "Forbidden" proves the number we sent
    // reached the wire as StatusCode 403 rather than being dropped or coerced.
    expect(deny.status?.code).toBe('Forbidden');
    expect(deny.body?.length).toBeGreaterThan(0);
    // Proves the real PolicyEngine denied this call, rather than the request
    // being rejected as an unparseable payload on the way to the engine.
    expect(deny.details).toContain('deny-reads');
    expect(jsonBody(responses[0]).error.reason).toContain('deny-reads');
  }, 15_000);

  it('never forwards a denied body, even in a streamed_response', async () => {
    const { responses } = await exchange([
      requestHeaders({ ':path': '/mcp/agw/call' }, false),
      requestBody(READ_FILE, false), // a non-terminal chunk, denied on the cap check below
      requestBody(READ_FILE, true),
    ]);
    // Two chunks arrive but nothing is echoed: the deny replaces the whole
    // ordered sequence, so no `streamedResponse` can leak the payload upstream.
    const forwarded = responses.filter((response) => streamed(response).body !== undefined);
    expect(forwarded).toHaveLength(0);
    expect(asView(responses[responses.length - 1]).immediateResponse).toBeDefined();
  }, 15_000);

  it('denies a non-JSON payload', async () => {
    const { responses, error } = await exchange([
      requestHeaders({}, false),
      requestBody(Buffer.from('<<< not json >>>'), true),
    ]);
    expect(error).toBeUndefined();
    expect(responses).toHaveLength(1);
    expect(asView(responses[0]).immediateResponse?.details).toContain('unrecognised-payload');
  }, 15_000);

  it('is terminal: no response is produced for events that follow a deny', async () => {
    const { responses, error } = await exchange([
      requestHeaders({}, false),
      requestBody(READ_FILE, true),
      // Envoy should not send response events after an ImmediateResponse, but if
      // the processor kept replying past the deny this would be a second response.
      responseHeaders({ ':status': '403' }),
    ]);
    expect(error).toBeUndefined();
    expect(responses).toHaveLength(1);
    expect(asView(responses[0]).immediateResponse).toBeDefined();
  }, 15_000);
});

describe('ExternalProcessor full-duplex lifecycle', () => {
  it('handles every event in one stream: request, decision, response, trailers', async () => {
    // The real order for one exchange: headers, body chunks, request trailers,
    // then the upstream response headers/body/trailers on the same gRPC stream.
    // The body is split mid-object, so the decision genuinely depends on the
    // chunks having been reassembled before parsing.
    const first = Buffer.from(
      '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_balance",',
      'utf8',
    );
    const second = Buffer.from('"arguments":{"account":"123"}}}', 'utf8');

    const { responses, error } = await exchange([
      requestHeaders({ ':path': '/mcp/agw/call' }, false),
      requestBody(first, false),
      requestBody(second, false),
      requestTrailers({ 'x-trailer': 'a' }),
      responseHeaders({ ':status': '200' }),
      responseBody(Buffer.from('{"ok":true}'), false),
      responseBody(Buffer.from(''), true),
      responseTrailers({ 'x-trailer': 'b' }),
    ]);

    expect(error).toBeUndefined();
    // Eight request messages, seven responses. The buffered authorizer is free to
    // re-chunk, so the two inbound body chunks come back as one reassembled
    // `streamedResponse` -- the proto explicitly allows any chunking. The stream
    // stayed open across the response phase, which is what FULL_DUPLEX_STREAMED
    // requires and the old request-only server could not do.
    expect(responses).toHaveLength(7);
    for (const response of responses) {
      expect(asView(response).immediateResponse).toBeUndefined();
    }

    // Ordered headers -> body -> trailers.
    expect(asView(responses[0]).requestHeaders).toBeDefined();
    // THE REGRESSION GUARD: an empty ack here would forward an empty body. The
    // bytes must be the two chunks joined -- which is also why the verdict was
    // reachable at all, since the JSON only parses once reassembled.
    expect(streamed(responses[1]).body).toEqual(Buffer.concat([first, second]));
    // A trailers response is itself the end-of-stream signal, so the body must
    // NOT also claim to end the stream.
    expect(streamed(responses[1]).endOfStream).toBe(false);
    expect(asView(responses[2]).requestTrailers).toBeDefined();

    // response phase: passed through, content echoed rather than inspected.
    expect(asView(responses[3]).responseHeaders).toBeDefined();
    expect(streamed(responses[4]).body).toEqual(Buffer.from('{"ok":true}'));
    expect(streamed(responses[4]).endOfStream).toBe(false);
    // A terminal empty chunk still has to be answered, and still has to carry
    // the end flag or Envoy waits for a body that never comes.
    expect(asView(responses[5]).responseBody).toBeDefined();
    expect(streamed(responses[5]).endOfStream).toBe(true);

    expect(asView(responses[6]).responseTrailers).toBeDefined();
  }, 15_000);

  it('answers trailers that arrive after the body already completed', async () => {
    // Defensive path: the body ended via end_of_stream, so the ordered sequence
    // went out without a trailers response. The trailers message still needs an
    // answer of its own, or the data plane stalls waiting for one.
    const { responses, error } = await exchange([
      requestHeaders({ ':path': '/mcp/agw/call' }, false),
      requestBody(GET_BALANCE, true),
      requestTrailers({ 'x-trailer': 'late' }),
    ]);

    expect(error).toBeUndefined();
    expect(responses).toHaveLength(3);
    expect(asView(responses[0]).requestHeaders).toBeDefined();
    expect(streamed(responses[1]).body).toEqual(GET_BALANCE);
    expect(streamed(responses[1]).endOfStream).toBe(true);
    expect(asView(responses[2]).requestTrailers).toBeDefined();
  }, 15_000);

  it('forwards a large body as ordered 64KiB chunks with one end_of_stream', async () => {
    // The padding rides in `params.blob`, not `params.arguments`.
    //
    // `parseToolCall` only reads `name` and `arguments`, so an ignored extra field
    // is enough to make the body span several 64 KiB chunks -- while the policy
    // engine still sees a tiny argument set. That matters: `scanForSecrets` runs
    // over the stringified arguments at roughly 130 ns/byte, so a large
    // *argument* would take seconds to judge and this test would measure the
    // scanner instead of the forwarding. See the scanner cost note in the
    // server README.
    const blob = 'x'.repeat(200_000);
    const large = Buffer.from(
      JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'get_balance', arguments: { account: '123' }, blob } }),
      'utf8',
    );
    const { responses, error } = await exchange([
      requestHeaders({ ':path': '/mcp/agw/call' }, false),
      requestBody(large, true),
    ]);

    expect(error).toBeUndefined();
    const header = asView(responses[0]);
    expect(header.requestHeaders).toBeDefined();

    const chunks = responses.slice(1).map(streamed);
    expect(chunks.length).toBeGreaterThan(1);
    // Google caps a ProcessingResponse at 128 kB; the proto recommends 64 KiB.
    for (const chunk of chunks) {
      expect(chunk.body!.length).toBeLessThanOrEqual(64 * 1024);
    }
    // Only the last chunk ends the stream.
    for (const chunk of chunks.slice(0, -1)) expect(chunk.endOfStream).toBe(false);
    expect(chunks[chunks.length - 1].endOfStream).toBe(true);
    // And the reassembled bytes are exactly what was sent.
    expect(Buffer.concat(chunks.map((chunk) => chunk.body!))).toEqual(large);
  }, 20_000);

  it('fails closed when a decision does not arrive in time', async () => {
    // A dedicated server with a 1 ms budget, so the outcome does not depend on
    // how fast the host happens to be. A denied-by-timeout request must be a
    // clean 403 with a stated reason, not a stalled stream: Envoy's own
    // extension timeout is configured above this one precisely so our explicit
    // refusal wins over an opaque gateway-level 504.
    const timedOut = createExternalProcessorServer({
      deps: { policyEngine: new PolicyEngine(POLICY) },
      defaultServerName: 'agw',
      defaultTenantId: 'default',
      decisionTimeoutMs: 1,
    });
    const timedOutPort = await new Promise<number>((resolve, reject) => {
      timedOut.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) =>
        error ? reject(error) : resolve(port),
      );
    });
    const strictClient = new (ExternalProcessorService as unknown as new (
      address: string,
      creds: grpc.ChannelCredentials,
    ) => grpc.Client)(`127.0.0.1:${timedOutPort}`, grpc.credentials.createInsecure());

    try {
      const result = await new Promise<{ responses: unknown[] }>((resolve) => {
        const stream = (strictClient as unknown as {
          Process: () => grpc.ClientDuplexStream<unknown, unknown>;
        }).Process();
        const responses: unknown[] = [];
        stream.on('data', (response: unknown) => responses.push(response));
        stream.on('error', () => resolve({ responses }));
        stream.on('end', () => resolve({ responses }));
        stream.write(requestHeaders({ ':path': '/mcp/agw/call' }, false));
        stream.write(requestBody(GET_BALANCE, true));
        stream.end();
      });

      expect(result.responses).toHaveLength(1);
      expect(asView(result.responses[0]).immediateResponse?.details).toContain('DECISION_TIMEOUT');
    } finally {
      strictClient.close();
      timedOut.forceShutdown();
    }
  }, 15_000);

  it('answers a bodyless request with a header response only', async () => {
    const { responses, error } = await exchange([requestHeaders({ ':method': 'GET' }, true)]);
    expect(error).toBeUndefined();
    expect(responses).toHaveLength(1);
    expect(asView(responses[0]).requestHeaders).toBeDefined();
    expect(asView(responses[0]).immediateResponse).toBeUndefined();
  }, 15_000);

  it('does not answer a message that populates no oneof field', async () => {
    // A spurious response is a stream error to the data plane, so a message
    // carrying only flow_control_init must stay silent.
    const { responses, error } = await exchange([flowControlOnly()]);
    expect(error).toBeUndefined();
    expect(responses).toHaveLength(0);
  }, 15_000);

  it('acknowledges announced flow-control windows on the next real response', async () => {
    const { responses, error } = await exchange([
      flowControlOnly(),
      requestHeaders({}, true),
    ]);
    expect(error).toBeUndefined();
    expect(responses).toHaveLength(1);
    // The acknowledgement rides along with the header response rather than
    // producing a response of its own.
    expect(asView(responses[0]).requestHeaders).toBeDefined();
    expect(asView(responses[0]).serverWindowUpdate).toBeDefined();
  }, 15_000);

  it('denies an oversized streamed body before it is fully buffered', async () => {
    const chunk = Buffer.alloc(Math.floor(MAX_BODY_BYTES / 2) + 1, 0x20);
    const { responses, error } = await exchange([
      requestHeaders({}, false),
      requestBody(chunk, false), // under the cap: buffered, no answer
      requestBody(chunk, true), // cumulative total exceeds the cap -> deny
    ]);
    expect(error).toBeUndefined();
    // The first chunk earns no response because the verdict is still pending.
    expect(responses).toHaveLength(1);
    // The cap is enforced on arrival, not after the whole body is in memory.
    expect(asView(responses[0]).immediateResponse?.details).toContain('payload-too-large');
  }, 15_000);

  it('fails closed when the data plane ends the stream mid-request', async () => {
    // A clean close is read as "proceed unconsulted", so an undecided request
    // must deny instead of closing cleanly.
    const stream = (client as unknown as {
      Process: () => grpc.ClientDuplexStream<unknown, unknown>;
    }).Process();
    const responses: unknown[] = [];
    stream.on('data', (response: unknown) => responses.push(response));

    await new Promise<void>((resolve) => {
      stream.on('end', resolve);
      stream.on('error', () => resolve());
      // Headers and a non-terminal body chunk: the verdict is still outstanding.
      stream.write(requestHeaders({ ':path': '/mcp/agw/call' }, false));
      stream.write(requestBody(GET_BALANCE, false));
      stream.end();
    });

    expect(responses).toHaveLength(1);
    expect(asView(responses[0]).immediateResponse?.details).toContain('STREAM_CLOSED_MID_REQUEST');
  }, 15_000);
});
