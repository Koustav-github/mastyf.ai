import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMastyfGuardMiddleware,
  wrapToolsWithMastyfGuard,
} from '../../packages/openai-agents-middleware/src/index';
import {
  createMastyfAgentCallback,
  createMastyfToolWrapper,
} from '../../packages/langchain-middleware/src/index';

const PROXY = 'http://localhost:4000';

const answer = (body: unknown, status = 200) => vi.fn(async () => Response.json(body, { status }));
const down = () =>
  vi.fn(async () => {
    throw new TypeError('fetch failed: ECONNREFUSED');
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OpenAI Agents guard', () => {
  const call = { toolName: 'delete_files', args: { path: '/' } };

  it('blocks by default when the policy says block (it used to allow without an explicit mode)', async () => {
    vi.stubGlobal('fetch', answer({ action: 'block', reason: 'destructive' }));
    const guard = createMastyfGuardMiddleware({ proxyUrl: PROXY });
    expect(await guard.beforeToolCall(call)).toEqual({ allowed: false, reason: 'destructive' });
  });

  it('allows what the policy passes', async () => {
    vi.stubGlobal('fetch', answer({ action: 'pass' }));
    expect(await createMastyfGuardMiddleware({ proxyUrl: PROXY }).beforeToolCall(call)).toEqual({ allowed: true });
  });

  it.each([
    ['unreachable', down()],
    ['HTTP 500', answer({ error: 'boom' }, 500)],
    ['an unrecognised answer', answer({ ok: true })],
  ])('fails closed when the proxy is %s', async (_label, fetchMock) => {
    vi.stubGlobal('fetch', fetchMock);
    const decision = await createMastyfGuardMiddleware({ proxyUrl: PROXY }).beforeToolCall(call);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/unavailable/i);
  });

  it('lets calls through on proxy failure only with failOpen', async () => {
    vi.stubGlobal('fetch', down());
    expect(await createMastyfGuardMiddleware({ proxyUrl: PROXY, failOpen: true }).beforeToolCall(call)).toEqual({
      allowed: true,
    });
  });

  it('warn mode logs a denial and runs; audit mode does not ask the proxy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', answer({ action: 'block', reason: 'destructive' }));
    expect(await createMastyfGuardMiddleware({ proxyUrl: PROXY, mode: 'warn' }).beforeToolCall(call)).toEqual({
      allowed: true,
    });
    expect(warn).toHaveBeenCalled();

    const fetchMock = answer({ action: 'block' });
    vi.stubGlobal('fetch', fetchMock);
    expect((await createMastyfGuardMiddleware({ proxyUrl: PROXY, mode: 'audit' }).beforeToolCall(call)).allowed).toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('wrapped tools do not run when the proxy is down', async () => {
    vi.stubGlobal('fetch', down());
    const execute = vi.fn(async () => 'deleted');
    const [tool] = wrapToolsWithMastyfGuard([{ name: 'delete_files', execute }], { proxyUrl: PROXY });
    await expect(tool!.execute({ path: '/' })).rejects.toMatchObject({ mastyfBlocked: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('wrapped tools honour blockedTools too', async () => {
    const fetchMock = answer({ action: 'pass' });
    vi.stubGlobal('fetch', fetchMock);
    const execute = vi.fn();
    const [tool] = wrapToolsWithMastyfGuard([{ name: 'shell', execute }], { proxyUrl: PROXY, blockedTools: ['shell'] });
    await expect(tool!.execute({})).rejects.toThrow(/blocked/);
    expect(execute).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('LangChain wrapper and callback', () => {
  const baseTool = () => ({ name: 'run_sql', call: vi.fn(async () => 'rows') });

  it('blocks the tool when the proxy is down (it used to run it)', async () => {
    vi.stubGlobal('fetch', down());
    const tool = baseTool();
    const wrapped = createMastyfToolWrapper(tool, { proxyUrl: PROXY });
    await expect(wrapped.call({ query: 'DROP TABLE users' })).rejects.toThrow(/unreachable/);
    expect(tool.call).not.toHaveBeenCalled();
  });

  it('runs the tool on pass, and on proxy failure only with failOpen', async () => {
    vi.stubGlobal('fetch', answer({ action: 'pass' }));
    const ok = baseTool();
    await expect(createMastyfToolWrapper(ok, { proxyUrl: PROXY }).call({ query: 'SELECT 1' })).resolves.toBe('rows');

    vi.stubGlobal('fetch', down());
    const open = baseTool();
    await expect(createMastyfToolWrapper(open, { proxyUrl: PROXY, failOpen: true }).call({ query: 'SELECT 1' })).resolves.toBe(
      'rows',
    );
  });

  it('warn mode runs the tool despite a block', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', answer({ action: 'block', reason: 'nope' }));
    const tool = baseTool();
    await expect(createMastyfToolWrapper(tool, { proxyUrl: PROXY, mode: 'warn' }).call({ q: 1 })).resolves.toBe('rows');
  });

  it('callback checks plain-string input instead of skipping it', async () => {
    const fetchMock = answer({ action: 'block', reason: 'dangerous shell' });
    vi.stubGlobal('fetch', fetchMock);
    const callback = createMastyfAgentCallback({ proxyUrl: PROXY });
    await expect(callback.handleToolStart({ name: 'shell' }, 'rm -rf /')).rejects.toThrow(/dangerous shell/);
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.args).toEqual({ input: 'rm -rf /' });
  });

  it('callback fails closed when the proxy is down', async () => {
    vi.stubGlobal('fetch', down());
    await expect(createMastyfAgentCallback({ proxyUrl: PROXY }).handleToolStart({ name: 'shell' }, '{"cmd":"ls"}')).rejects.toThrow(
      /unreachable/,
    );
  });
});
