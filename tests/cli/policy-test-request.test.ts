import { describe, expect, it } from 'vitest';
import { policyTestRequest } from '../../src/cli/policy-test-request.js';

describe('POST /api/policy/test body', () => {
  it('reads `arguments` / `mode` (dashboard) and `args` / `blockingMode` (older middlewares) alike', () => {
    const current = policyTestRequest({ tool: 't', arguments: { path: '/x' }, mode: 'block' }, 'p.yaml');
    const older = policyTestRequest({ tool: 't', args: { path: '/x' }, blockingMode: 'block' }, 'p.yaml');
    expect(current).toEqual(older);
    expect(JSON.parse(current.args)).toEqual({ path: '/x' });
    expect(current.blockingMode).toBe('block');
    expect(current.policy).toBe('p.yaml');
  });

  it('prefers `arguments` when both are sent', () => {
    expect(JSON.parse(policyTestRequest({ arguments: { a: 1 }, args: { b: 2 } }, 'p').args)).toEqual({ a: 1 });
  });

  it('defaults to empty arguments, the given policy and no mode', () => {
    expect(policyTestRequest({ tool: 't', arguments: 'not-an-object' }, 'p.yaml')).toMatchObject({
      args: '{}',
      server: 'dashboard-test',
      blockingMode: undefined,
    });
  });
});
