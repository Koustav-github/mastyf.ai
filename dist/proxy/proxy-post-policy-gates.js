import { evaluateSyncSemanticRequest } from '../ai/sync-semantic-request.js';
import * as Metrics from '../utils/metrics.js';
export async function runSyncSemanticRequestGate(context, decision, serverName) {
    const semReq = await evaluateSyncSemanticRequest({ context, policyDecision: decision });
    if (!semReq.block) {
        return { block: false };
    }
    Metrics.semanticSyncRequestBlocksTotal.inc(Metrics.withTenantMetricLabels({ server_name: serverName }, context.tenantId));
    Metrics.recordProxyBlock({
        server_name: serverName,
        block_reason: 'semantic_sync_request',
        rule: semReq.rule,
        tenant_id: context.tenantId,
    }, 'semantic');
    return {
        block: true,
        rule: semReq.rule,
        reason: semReq.reason,
        metricCategory: 'semantic_sync_request',
    };
}
//# sourceMappingURL=proxy-post-policy-gates.js.map