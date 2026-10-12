export interface ApprovalRequest {
    id: string;
    approvalId: string;
    serverName: string;
    toolName: string;
    arguments: Record<string, unknown>;
    tenantId: string;
    identity: string;
    status: 'pending' | 'approved' | 'denied' | 'expired';
    createdAt: string;
    expiresAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
}
export declare function persistApprovalRequest(req: ApprovalRequest): void;
export declare function listPendingApprovals(tenantId?: string): ApprovalRequest[];
export declare function resolveApproval(approvalId: string, action: 'approved' | 'denied', resolvedBy?: string): boolean;
//# sourceMappingURL=approval-store.d.ts.map