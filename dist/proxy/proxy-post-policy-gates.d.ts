/**
 * Post-policy allow gates shared across proxy transports (sync semantic request).
 */
import type { CallContext, PolicyDecision } from '../policy/policy-types.js';
export interface PostPolicyGateBlock {
    block: true;
    rule: string;
    reason: string;
    metricCategory: 'semantic_sync_request';
}
export type PostPolicyGateResult = {
    block: false;
} | PostPolicyGateBlock;
export declare function runSyncSemanticRequestGate(context: CallContext, decision: PolicyDecision, serverName: string): Promise<PostPolicyGateResult>;
//# sourceMappingURL=proxy-post-policy-gates.d.ts.map