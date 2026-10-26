import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { PolicyEngine } from '../policy/policy-engine.js';
import type { CallContext, PolicyConfig } from '../policy/policy-types.js';

import type { PolicyTestOptions } from './policy-test-request.js';

export { policyTestRequest, type PolicyTestOptions } from './policy-test-request.js';

export interface PolicyTestResult {
  action: string;
  rule: string;
  reason: string;
  mode: string;
}

export function runPolicyTest(opts: PolicyTestOptions): PolicyTestResult {
  const raw = readFileSync(opts.policy, 'utf-8');
  const config = load(raw) as PolicyConfig;
  if (opts.blockingMode && ['audit', 'warn', 'block'].includes(opts.blockingMode)) {
    config.policy.mode = opts.blockingMode as PolicyConfig['policy']['mode'];
  }

  let args: Record<string, unknown> = {};
  if (opts.args) {
    args = JSON.parse(opts.args) as Record<string, unknown>;
  }

  const engine = new PolicyEngine(config);
  const context: CallContext = {
    serverName: opts.server || 'policy-test',
    toolName: opts.tool,
    arguments: args,
    requestId: `policy-test-${Date.now()}`,
    requestTokens: 100,
    timestamp: new Date().toISOString(),
  };

  const decision = engine.evaluate(context);
  return {
    action: decision.action,
    rule: decision.rule,
    reason: decision.reason,
    mode: engine.getMode(),
  };
}
