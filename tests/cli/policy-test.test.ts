import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { policyTestRequest, runPolicyTest } from '../../src/cli/policy-test.js';

const defaultPolicy = join(process.cwd(), 'default-policy.yaml');

describe('policy test CLI', () => {
  it('returns JSON decision for a tool call', () => {
    const result = runPolicyTest({
      policy: defaultPolicy,
      tool: 'read_file',
      args: JSON.stringify({ path: '/etc/passwd' }),
      server: 'test',
    });
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('rule');
    expect(result).toHaveProperty('reason');
    expect(['pass', 'block', 'flag']).toContain(result.action);
  });
});

describe('POST /api/policy/test, end to end', () => {
  it('evaluates the arguments a middleware sends as `args` (they used to be dropped)', () => {
    const dangerous = { path: '/etc/passwd' };
    const sentAsArgs = runPolicyTest(
      policyTestRequest({ tool: 'read_file', server: 'openai-agent', args: dangerous }, defaultPolicy),
    );
    const sentAsArguments = runPolicyTest(
      policyTestRequest({ tool: 'read_file', server: 'openai-agent', arguments: dangerous }, defaultPolicy),
    );
    const ignored = runPolicyTest(policyTestRequest({ tool: 'read_file', server: 'openai-agent' }, defaultPolicy));

    expect(sentAsArgs).toEqual(sentAsArguments);
    expect(sentAsArgs.action).not.toBe('pass');
    expect(ignored.action).toBe('pass');
  });
});
