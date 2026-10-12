export interface TenantRecord {
    id: string;
    displayName: string;
    policyPath: string;
    dailyBudgetUsd?: number;
    createdAt: string;
    updatedAt: string;
}
export declare function listTenants(): TenantRecord[];
export declare function getTenant(id: string): TenantRecord | null;
export declare function createTenant(input: {
    id: string;
    displayName: string;
    policyYaml?: string;
    dailyBudgetUsd?: number;
}): TenantRecord;
export declare function updateTenantPolicy(id: string, policyYaml: string): TenantRecord;
export declare function deleteTenant(id: string): void;
export declare function registerTenantApiRoutes(app: {
    get: Function;
    post: Function;
    put: Function;
    delete: Function;
}): void;
//# sourceMappingURL=tenant-api.d.ts.map