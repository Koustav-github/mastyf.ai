import { afterEach, describe, expect, it } from 'vitest';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { McpProxyServer } from '../../src/proxy/proxy-server.js';
import { HistoryDatabase } from '../../src/database/history-db.js';
import { PolicyEngine } from '../../src/policy/policy-engine.js';
import type { PolicyConfig } from '../../src/policy/policy-types.js';

/**
 * The upstream echoes every tools/call it receives, so an echoed read_file means the call
 * reached the tool. Before the fix, a tools/call with no id, or one inside a JSON-RPC batch,
 * skipped every policy check and was forwarded (found by the MCP protocol fuzzer).
 */
const __dir = dirname(fileURLToPath(import.meta.url));
const MOCK_SERVER = resolve(__dir, '../../adversarial-harness/node/mock-mcp-server.mjs');

const policy: PolicyConfig = {
  policy: {
    mode: 'block',
    rules: [{ name: 'allow-echo', action: 'pass', tools: { allow: ['echo'] } }],
    default_action: 'block',
  },
};

type Line = { id?: string | number; result?: { content?: Array<{ text?: string }> }; error?: { code: number; message: string } };

describe('stdio proxy: calls that used to skip the policy', () => {
  let proxy: McpProxyServer | null = null;
  let db: HistoryDatabase | null = null;
  const out: string[] = [];
  const origWrite = process.stdout.write.bind(process.stdout);

  afterEach(() => {
    proxy?.kill();
    proxy = null;
    db?.close();
    db = null;
    out.length = 0;
    process.stdout.write = origWrite;
  });

  async function start() {
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;
    db = new HistoryDatabase(':memory:');
    proxy = new McpProxyServer('node', [MOCK_SERVER], {}, db, 'bypass-test', new PolicyEngine(policy));
    await new Promise((r) => setTimeout(r, 400));
    await proxy.handleClientInput(
      JSON.stringify({ jsonrpc: '2.0', id: 'init', method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } } }),
    );
    await new Promise((r) => setTimeout(r, 200));
  }

  const lines = (): Line[] =>
    out.flatMap((chunk) =>
      chunk
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as Line];
          } catch {
            return [];
          }
        }),
    );
  const reachedTool = (tool: string) =>
    lines().some((l) => l.result?.content?.some((c) => c.text?.includes(`"tool":"${tool}"`)));
  const settle = () => new Promise((r) => setTimeout(r, 400));

  it('drops a tools/call sent without an id instead of forwarding it', async () => {
    await start();
    await proxy!.handleClientInput(
      JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'read_file', arguments: { path: '/etc/passwd' } } }),
    );
    await settle();
    expect(reachedTool('read_file')).toBe(false);
  }, 15000);

  it('rejects a JSON-RPC batch, answering each request and forwarding nothing', async () => {
    await start();
    await proxy!.handleClientInput(
      JSON.stringify([
        { jsonrpc: '2.0', id: 'b1', method: 'tools/call', params: { name: 'read_file', arguments: { path: '/etc/passwd' } } },
        { jsonrpc: '2.0', id: 'b2', method: 'tools/call', params: { name: 'echo', arguments: { message: 'hi' } } },
      ]),
    );
    await settle();
    expect(reachedTool('read_file')).toBe(false);
    expect(reachedTool('echo')).toBe(false);
    for (const id of ['b1', 'b2']) {
      expect(lines().find((l) => l.id === id)?.error?.code, id).toBe(-32600);
    }
  }, 15000);

  it('still evaluates and forwards ordinary requests', async () => {
    await start();
    await proxy!.handleClientInput(
      JSON.stringify({ jsonrpc: '2.0', id: 'ok', method: 'tools/call', params: { name: 'echo', arguments: { message: 'hi' } } }),
    );
    await proxy!.handleClientInput(
      JSON.stringify({ jsonrpc: '2.0', id: 'no', method: 'tools/call', params: { name: 'read_file', arguments: { path: '/etc/passwd' } } }),
    );
    await settle();
    expect(reachedTool('echo')).toBe(true);
    expect(reachedTool('read_file')).toBe(false);
    expect(lines().find((l) => l.id === 'no')?.error?.code).toBe(-32001);
  }, 15000);
});
