/**
 * Tests for the Agent Gateway decision core.
 *
 * These assert the security properties, not just the happy path: unrecognised
 * payloads must deny, engine failures must deny, and the `HttpStatus` wrapper
 * must be shaped as a message rather than a scalar.
 */
import { describe, it, expect } from 'vitest';
import {
  buildDenyResponse,
  decideRequest,
  headersToRecord,
  parseToolCall,
  toHttpStatus,
  MAX_BODY_BYTES,
  MAX_SCANNED_ARGUMENT_BYTES,
} from '../../src/agent-gateway/decision-core.js';
import type { ToolCallDefenseDeps } from '../../src/proxy/tool-call-defense-orchestrator.js';
import { PolicyEngine } from '../../src/policy/policy-engine.js';
import type { PolicyConfig } from '../../src/policy/policy-types.js';

const ALLOW_ALL: PolicyConfig = {
  version: 'test',
  policy: { mode: 'block', default_action: 'pass', rules: [] },
};

const DENY_EVERYTHING: PolicyConfig = {
  version: 'test',
  policy: {
    mode: 'block',
    default_action: 'pass',
    rules: [
      {
        name: 'deny-all',
        action: 'block',
        patterns: ['.*'],
        tools: { enforceAllowlist: true },
      },
    ],
  },
};

function deps(config: PolicyConfig = ALLOW_ALL): ToolCallDefenseDeps {
  return { policyEngine: new PolicyEngine(config) };
}

const TOOL_CALL = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'read_file', arguments: { path: '/tmp/report.txt' } },
};

function bodyOf(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

function toolCallWithArgs(args: Record<string, unknown>) {
  return { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_balance', arguments: args } };
}

/**
 * A policy engine that allows, and counts how often it is consulted.
 *
 * The orchestrator calls both `evaluateAsync` and `getMode` on the engine, so a
 * stub exposing only `evaluateAsync` fails closed on a missing method -- which
 * would make these tests assert the wrong thing.
 */
function countingAllowEngine(onCall: () => void): ToolCallDefenseDeps {
  return {
    policyEngine: {
      evaluateAsync: async () => {
        onCall();
        return { allowed: true, action: 'pass', code: 200, phase: 'policy-engine', rule: 'default', reason: 'ok' };
      },
      getMode: () => 'block',
    },
  } as unknown as ToolCallDefenseDeps;
}

describe('buildDenyResponse', () => {
  it('shapes status as a message wrapping the enum, not a bare number', () => {
    const response = buildDenyResponse({ code: 403, details: 'test' });
    // `HttpStatus` is a message; `status: 403` fails at serialisation time.
    expect(response.immediateResponse?.status).toEqual({ code: 403 });
    expect(response.immediateResponse?.status).not.toBe(403);
  });

  it('carries a JSON body and a details string', () => {
    const response = buildDenyResponse({ code: 403, details: 'policy:block:secret' });
    const body = JSON.parse(response.immediateResponse!.body!.toString('utf8'));
    expect(body.error.reason).toBe('policy:block:secret');
    expect(response.immediateResponse?.details).toContain('policy:block:secret');
  });
});

describe('headersToRecord', () => {
  it('lower-cases keys and decodes raw_value bytes', () => {
    const record = headersToRecord({
      headers: {
        headers: [
          { key: 'X-Mastyf-Tenant', rawValue: Buffer.from('acme') },
          { key: ':method', rawValue: Buffer.from('POST') },
        ],
      },
    });
    expect(record).toEqual({ 'x-mastyf-tenant': 'acme', ':method': 'POST' });
  });

  it('returns an empty record when headers are absent', () => {
    expect(headersToRecord(undefined)).toEqual({});
  });
});

describe('parseToolCall', () => {
  const base = { headers: {}, defaultServerName: 'agw', defaultTenantId: 'default' };

  it('accepts a well-formed tools/call', () => {
    const parsed = parseToolCall({ ...base, body: bodyOf(TOOL_CALL) });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.input.toolName).toBe('read_file');
      expect(parsed.input.serverName).toBe('agw');
    }
  });

  it('derives the server name from the request path', () => {
    const parsed = parseToolCall({
      ...base,
      headers: { ':path': '/mcp/finance/v1/call' },
      body: bodyOf(TOOL_CALL),
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.input.serverName).toBe('finance');
  });

  it('honours a tenant header', () => {
    const parsed = parseToolCall({
      ...base,
      headers: { 'x-mastyf-tenant': 'acme' },
      body: bodyOf(TOOL_CALL),
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.input.tenantId).toBe('acme');
  });

  it('does not leak pseudo-headers into the policy input', () => {
    const parsed = parseToolCall({
      ...base,
      headers: { ':path': '/mcp/finance/call', ':authority': 'gw.example' },
      body: bodyOf(TOOL_CALL),
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(Object.keys(parsed.input.headers ?? {})).not.toContain(':path');
      expect(Object.keys(parsed.input.headers ?? {})).not.toContain(':authority');
    }
  });

  it.each([
    ['non-JSON body', Buffer.from('not json at all')],
    ['a JSON array', Buffer.from('[1,2,3]')],
    ['a non-2.0 envelope', bodyOf({ method: 'tools/call', params: {} })],
    ['a missing params.name', bodyOf({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {} })],
    ['non-object arguments', bodyOf({ ...TOOL_CALL, params: { name: 'x', arguments: [] } })],
    ['an empty body', Buffer.alloc(0)],
  ])('fails closed on %s', (_label, body) => {
    const parsed = parseToolCall({ ...base, body });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.rule).toBeTruthy();
  });

  it('rejects a non-tools/call method with its own rule', () => {
    const parsed = parseToolCall({
      ...base,
      body: bodyOf({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.rule).toBe('unauthorised-method');
  });

  it('fails closed on an oversized body', () => {
    const huge = Buffer.alloc(MAX_BODY_BYTES + 1, 0x20);
    const parsed = parseToolCall({ ...base, body: huge });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.rule).toBe('payload-too-large');
  });
});

describe('decideRequest', () => {
  const base = { headers: {}, defaultServerName: 'agw', defaultTenantId: 'default' };

  it('allows a permitted tool call with an empty response', async () => {
    const response = await decideRequest({ ...base, body: bodyOf(TOOL_CALL), deps: deps() });
    // "Allow" is the absence of a decision, not an explicit affirmative.
    expect(response.immediateResponse).toBeUndefined();
    expect(response).toEqual({});
  });

  it('denies a blocked tool call with a valid HTTP status', async () => {
    const response = await decideRequest({
      ...base,
      body: bodyOf(TOOL_CALL),
      deps: deps(DENY_EVERYTHING),
    });
    expect(response.immediateResponse).toBeDefined();
    // The orchestrator reports MCP/JSON-RPC codes (e.g. -32001), which are not
    // valid HTTP statuses. They must be mapped, never passed through.
    const status = response.immediateResponse!.status.code;
    expect(typeof status).toBe('number');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThanOrEqual(599);
  });

  it('preserves the transport-specific verdict code in the body', async () => {
    const response = await decideRequest({
      ...base,
      body: bodyOf(TOOL_CALL),
      deps: deps(DENY_EVERYTHING),
    });
    const body = JSON.parse(response.immediateResponse!.body!.toString('utf8'));
    expect(body.error.httpStatus).toBeGreaterThanOrEqual(400);
    expect(body.error.reason).toBeTruthy();
  });

  it('denies an unrecognised payload instead of passing it through', async () => {
    const response = await decideRequest({
      ...base,
      body: Buffer.from('<html>not a tool call</html>'),
      deps: deps(),
    });
    expect(response.immediateResponse).toBeDefined();
    expect(response.immediateResponse?.details).toContain('unrecognised-payload');
  });

  it('fails closed when the policy engine throws', async () => {
    // `evaluateAsync` is the method the orchestrator actually calls. A stub
    // exposing only the sync `evaluate` would still fail closed, but via a
    // TypeError for a missing method -- which would prove nothing about the
    // throw path this test exists to cover.
    const exploding = {
      policyEngine: {
        evaluateAsync: async () => {
          throw new Error('engine exploded');
        },
      },
    } as unknown as ToolCallDefenseDeps;

    const response = await decideRequest({ ...base, body: bodyOf(TOOL_CALL), deps: exploding });
    expect(response.immediateResponse).toBeDefined();
    // The orchestrator catches engine failures itself and reports them as a
    // fail-closed block rather than propagating an error.
    expect(response.immediateResponse?.details).toContain('POLICY_ENGINE_ERROR');
  });

  it('fails closed when the engine returns a malformed decision', async () => {
    // A decision with no `allowed` field is not a decision. Treating it as
    // anything but an error would let a broken policy engine approve traffic,
    // so this is the guard that keeps a silent upstream failure fail-closed.
    const malformed = {
      policyEngine: { evaluateAsync: async () => ({ /* no `allowed` field */ }) },
    } as unknown as ToolCallDefenseDeps;

    const response = await decideRequest({ ...base, body: bodyOf(TOOL_CALL), deps: malformed });
    expect(response.immediateResponse).toBeDefined();
    expect(response.immediateResponse?.details).toContain('POLICY_ENGINE_ERROR');
  });

  it('refuses arguments the engine cannot scan inside the decision budget', async () => {
    // The point of the cap is that the *engine is never reached*, because the
    // scan it triggers is synchronous and blocks the event loop -- a decision
    // timeout cannot interrupt it. A spy is the only way to prove the guard fires
    // before the expensive path rather than after it.
    let engineCalls = 0;
    const counting = countingAllowEngine(() => {
      engineCalls += 1;
    });

    const oversized = toolCallWithArgs({ blob: 'x'.repeat(MAX_SCANNED_ARGUMENT_BYTES + 1) });
    const response = await decideRequest({ ...base, body: bodyOf(oversized), deps: counting });

    expect(response.immediateResponse?.details).toContain('arguments-too-large-for-authorization');
    expect(engineCalls).toBe(0);
  });

  it('still scans an argument set just under the cap', async () => {
    // The guard must be a bound, not a blanket refusal: the common case has to
    // reach the engine or the gateway denies ordinary traffic.
    let engineCalls = 0;
    const counting = countingAllowEngine(() => {
      engineCalls += 1;
    });

    const large = toolCallWithArgs({ blob: 'x'.repeat(MAX_SCANNED_ARGUMENT_BYTES - 1024) });
    const response = await decideRequest({ ...base, body: bodyOf(large), deps: counting });

    expect(response.immediateResponse).toBeUndefined();
    expect(engineCalls).toBe(1);
  });

});

describe('toHttpStatus', () => {
  it('rejects negative JSON-RPC codes and non-status values', () => {
    expect(toHttpStatus(-32001)).toBe(403);
    expect(toHttpStatus(0)).toBe(403);
    expect(toHttpStatus(undefined)).toBe(403);
    expect(toHttpStatus(200)).toBe(403);
    expect(toHttpStatus(1.5)).toBe(403);
  });

  it('passes through real 4xx and 5xx statuses', () => {
    expect(toHttpStatus(403)).toBe(403);
    expect(toHttpStatus(429)).toBe(429);
    expect(toHttpStatus(503)).toBe(503);
  });
});
