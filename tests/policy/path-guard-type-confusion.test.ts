import { describe, expect, it } from 'vitest';
import { createSensitivePathGuard, type HookContext } from '../../src/policy/tool-call-hooks.js';

/** Found by the MCP protocol fuzzer: a non-string path skipped both path lists. */
const guard = createSensitivePathGuard(['/workspace/*'], ['/etc/*']);

const call = (args: Record<string, unknown>) =>
  guard.beforeToolCall({
    tool: { name: 'read_file', arguments: args },
    timestamp: new Date().toISOString(),
    hookState: new Map(),
  } as unknown as HookContext);

describe('sensitive path guard: path type confusion', () => {
  it('blocks a path given as an object, array or number', async () => {
    for (const path of [{ $gt: '' }, ['/etc/passwd'], 42]) {
      const result = await call({ path });
      expect(result.allowed, JSON.stringify(path)).toBe(false);
      expect(result.reason).toMatch(/must be a string/);
    }
    expect((await call({ file: { $ne: null } })).allowed).toBe(false);
  });

  it('still applies the deny and allow lists to string paths', async () => {
    expect((await call({ path: '/etc/passwd' })).allowed).toBe(false);
    expect((await call({ path: '/tmp/x' })).allowed).toBe(false);
    expect((await call({ path: '/workspace/notes.md' })).allowed).toBe(true);
  });

  it('ignores calls with no path argument', async () => {
    expect((await call({ query: 'weather' })).allowed).toBe(true);
    expect((await call({ path: null })).allowed).toBe(true);
  });
});
