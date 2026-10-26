import { Readable } from 'stream';
import { describe, expect, it } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import { relayMcpHttpRequest } from '../../src/utils/mcp-http-relay.js';
import type { ProxyManager } from '../../src/proxy/proxy-manager.js';

/** A proxy that answers every request id on stdout, as the stdio proxy does. */
function fakeProxyManager(seen: string[] = []) {
  const proxy = {
    async handleClientInput(raw: string) {
      seen.push(raw);
      const msg = JSON.parse(raw);
      for (const m of Array.isArray(msg) ? msg : [msg]) {
        if (m && m.id !== undefined && m.id !== null) {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, error: { code: -32600, message: 'no' } }) + '\n');
        }
      }
    },
  };
  return { getProxies: () => [proxy] } as unknown as ProxyManager;
}

async function relay(body: unknown, manager = fakeProxyManager()) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]) as unknown as IncomingMessage;
  const out: { status?: number; body?: string } = {};
  const res = {
    writeHead(status: number) {
      out.status = status;
      return this;
    },
    end(chunk?: string) {
      out.body = chunk ?? '';
    },
  } as unknown as ServerResponse;
  const started = Date.now();
  await relayMcpHttpRequest(req, res, manager);
  return { ...out, ms: Date.now() - started };
}

describe('MCP HTTP relay', () => {
  it('answers a notification with 202 at once instead of waiting 15s for a reply', async () => {
    const seen: string[] = [];
    const r = await relay({ jsonrpc: '2.0', method: 'notifications/initialized' }, fakeProxyManager(seen));
    expect(r.status).toBe(202);
    expect(r.ms).toBeLessThan(2000);
    expect(seen).toHaveLength(1);
  });

  it('answers a batch with the replies to its requests, as an array', async () => {
    const r = await relay([
      { jsonrpc: '2.0', id: 'a', method: 'tools/call', params: { name: 'x' } },
      { jsonrpc: '2.0', method: 'notifications/progress' },
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'y' } },
    ]);
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body!).map((m: { id: unknown }) => m.id)).toEqual(['a', 7]);
    expect(r.ms).toBeLessThan(2000);
  });

  it('still returns the matching reply for an ordinary request', async () => {
    const r = await relay({ jsonrpc: '2.0', id: 'q1', method: 'tools/call', params: { name: 'x' } });
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body!).id).toBe('q1');
  });
});
