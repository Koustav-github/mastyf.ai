import { getIndustryHotState, HOT_TABLE_KEYS, } from './industry-hot-state.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../utils/logger.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
let migrationApplied = false;
let migration013Applied = false;
let migration014Applied = false;
let migration015Applied = false;
let migration016Applied = false;
let migration017Applied = false;
let migration018Applied = false;
let migration019Applied = false;
function applySqlMigration(db, filename, flag) {
    try {
        const sql = readFileSync(join(__dirname, 'migrations', filename), 'utf-8');
        const native = db;
        let ran = false;
        if (typeof native.exec === 'function') {
            native.exec(sql);
            ran = true;
        }
        else if (typeof native.query === 'function') {
            void native.query(sql);
            ran = true;
        }
        if (!ran) {
            Logger.warn(`[industry-standard] Migration ${filename} skipped: database adapter lacks exec/query`);
            return;
        }
        if (!flag.applied) {
            flag.set();
            Logger.info(`[industry-standard] Migration ${filename} applied`);
        }
    }
    catch (err) {
        Logger.warn(`[industry-standard] Migration ${filename} skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
}
export function applyIndustryStandardMigration(db) {
    if (migrationApplied) {
        applyRoadmapMigration013(db);
        applyRoadmapMigration014(db);
        applyRoadmapMigration015(db);
        applyRoadmapMigration016(db);
        applyRoadmapMigration017(db);
        applyRoadmapMigration018(db);
        applyRoadmapMigration019(db);
        return;
    }
    applySqlMigration(db, '012-industry-standard.sql', {
        get applied() { return migrationApplied; },
        set: () => { migrationApplied = true; },
    });
    applyRoadmapMigration013(db);
    applyRoadmapMigration014(db);
    applyRoadmapMigration015(db);
    applyRoadmapMigration016(db);
    applyRoadmapMigration017(db);
    applyRoadmapMigration018(db);
    applyRoadmapMigration019(db);
}
export function applyRoadmapMigration016(db) {
    applySqlMigration(db, '016-plan-compliance.sql', {
        get applied() { return migration016Applied; },
        set: () => { migration016Applied = true; },
    });
}
export function applyRoadmapMigration017(db) {
    applySqlMigration(db, '017-plan-compliance-100.sql', {
        get applied() { return migration017Applied; },
        set: () => { migration017Applied = true; },
    });
}
export function applyRoadmapMigration018(db) {
    applySqlMigration(db, '018-plan-compliance-wot.sql', {
        get applied() { return migration018Applied; },
        set: () => { migration018Applied = true; },
    });
}
export function applyRoadmapMigration019(db) {
    applySqlMigration(db, '019-plan-compliance-final.sql', {
        get applied() { return migration019Applied; },
        set: () => { migration019Applied = true; },
    });
}
export function applyRoadmapMigration013(db) {
    applySqlMigration(db, '013-roadmap-phase1.sql', {
        get applied() { return migration013Applied; },
        set: () => { migration013Applied = true; },
    });
}
export function applyRoadmapMigration014(db) {
    applySqlMigration(db, '014-federated-learning.sql', {
        get applied() { return migration014Applied; },
        set: () => { migration014Applied = true; },
    });
}
export function applyRoadmapMigration015(db) {
    applySqlMigration(db, '015-roadmap-phase3-indexes.sql', {
        get applied() { return migration015Applied; },
        set: () => { migration015Applied = true; },
    });
}
/** The enforcement-path tables the hot-state cache serves; see industry-hot-state.ts. */
const HOT_TABLES = new Set(Object.keys(HOT_TABLE_KEYS));
/** Extract the target table from a statement so the error names it. */
function tableFromSql(sql) {
    const m = /(?:FROM|INTO|UPDATE)\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(sql);
    return m?.[1] ?? 'unknown';
}
/**
 * Thrown when the database cannot serve IndustryStandardStore's synchronous
 * better-sqlite3 statements. This is an architecture error, not an empty
 * dataset, and must never be swallowed into an empty result.
 */
export class IndustryStoreUnsupportedError extends Error {
    table;
    constructor(table, db) {
        super(`IndustryStandardStore cannot read or write table "${table}" through ${db?.constructor?.name ?? 'this database'}: ` +
            'it has no synchronous prepare() API. Returning an empty result here would silently ' +
            'disable enforcement (certification reads look "uncertified"; threat-intel reads empty the ' +
            'guard pattern set), so this is thrown instead. ' +
            (HOT_TABLES.has(table)
                ? 'This table is enforcement-path state: attach the industry hot-state cache ' +
                    '(IndustryHotState.attach) so it is served from memory.'
                : 'This table has no async port yet: use the control-plane API, or run with SQLite.'));
        this.name = 'IndustryStoreUnsupportedError';
        this.table = table;
    }
}
export class IndustryStandardStore {
    db;
    constructor(db) {
        this.db = db;
        applyIndustryStandardMigration(db);
    }
    /**
     * Returns a prepared statement, or null when the database CAN prepare but the
     * table does not exist (migrations may not have run yet -- tolerated).
     *
     * Throws when the database cannot prepare statements AT ALL, which is the
     * PostgreSQL shape: an async pg Pool with no better-sqlite3 prepare().
     *
     * This distinction is the whole point. Returning null in both cases made
     * every read look like "no data" and every write a no-op, so a Postgres
     * deployment looked healthy while storing nothing -- and a failed threat-intel
     * read silently emptied the guard's pattern set, which fails OPEN.
     */
    prep(sql) {
        const fn = this.db.prepare;
        if (typeof fn !== 'function') {
            throw new IndustryStoreUnsupportedError(tableFromSql(sql), this.db);
        }
        return fn.call(this.db, sql);
    }
    /**
     * True when the hot-state cache owns this data (i.e. a network backend is
     * attached). When false, every method below uses the original synchronous
     * SQLite path, unchanged.
     */
    hotActive() {
        return getIndustryHotState().enabled;
    }
    /**
     * Route a write to the hot-state cache when one is attached.
     * Returns true when the write was consumed (caller must not fall through).
     */
    hotWrite(table, row) {
        return getIndustryHotState().enqueue(table, row);
    }
    saveCertification(row) {
        // Column names must be snake_case: the cache keys rows by column name and
        // the Postgres upsert builds its INSERT from Object.keys(row).
        if (this.hotWrite('mcp_certifications', {
            id: row.id,
            server_name: row.serverName,
            package_name: row.packageName,
            version: row.version,
            level: row.level,
            score: row.score,
            certified: row.certified ? 1 : 0,
            attestation_jws: row.attestationJws ?? null,
            checks_json: row.checksJson,
            issued_at: row.issuedAt,
            expires_at: row.expiresAt,
            tenant_id: row.tenantId,
        })) {
            return;
        }
        const exec = this.prep(`INSERT OR REPLACE INTO mcp_certifications
       (id, server_name, package_name, version, level, score, certified, attestation_jws, checks_json, issued_at, expires_at, tenant_id)
       VALUES (@id, @serverName, @packageName, @version, @level, @score, @certified, @attestationJws, @checksJson, @issuedAt, @expiresAt, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            ...row,
            certified: row.certified ? 1 : 0,
        });
    }
    getCertification(serverName) {
        if (this.hotActive()) {
            return this.mapCertification(getIndustryHotState().getCertification(serverName));
        }
        const get = this.prep('SELECT * FROM mcp_certifications WHERE server_name = ? ORDER BY issued_at DESC LIMIT 1');
        if (!get)
            return null;
        const row = get.get(serverName);
        return this.mapCertification(row);
    }
    mapCertification(row) {
        if (!row)
            return null;
        return {
            id: String(row.id),
            serverName: String(row.server_name),
            packageName: String(row.package_name),
            version: String(row.version),
            level: String(row.level),
            score: Number(row.score),
            // SQLite stores 0/1; PostgreSQL round-trips booleans if a future DDL uses
            // one. Accept both rather than treating every row as certified.
            certified: row.certified === true || Number(row.certified) === 1,
            attestationJws: row.attestation_jws ? String(row.attestation_jws) : undefined,
            checksJson: String(row.checks_json ?? '[]'),
            issuedAt: String(row.issued_at),
            expiresAt: String(row.expires_at),
            tenantId: String(row.tenant_id ?? 'default'),
        };
    }
    saveMtxSignature(hash, mtxJson, verified, tenantId = 'default') {
        if (this.hotWrite('mtx_signatures', {
            signature_hash: hash,
            mtx_json: mtxJson,
            report_count: 1,
            verified: verified ? 1 : 0,
            synced_at: new Date().toISOString(),
            tenant_id: tenantId,
        })) {
            return;
        }
        const stmt = this.prep(`INSERT INTO mtx_signatures (signature_hash, mtx_json, report_count, verified, synced_at, tenant_id)
       VALUES (?, ?, 1, ?, datetime('now'), ?)
       ON CONFLICT(signature_hash) DO UPDATE SET report_count = report_count + 1, synced_at = datetime('now')`);
        if (!stmt)
            return;
        stmt.run(hash, mtxJson, verified ? 1 : 0, tenantId);
    }
    recordChainEvent(event) {
        const stmt = this.prep(`INSERT INTO session_chain_events (session_id, agent_id, server_name, tool_name, event_type, edge_json, blocked, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        if (!stmt)
            return;
        stmt.run(event.sessionId, event.agentId ?? null, event.serverName, event.toolName, event.eventType, event.edgeJson ?? null, event.blocked ? 1 : 0, event.tenantId ?? 'default');
    }
    upsertAgentReputation(agentId, score, tier, trend, eventsJson, tenantId = 'default') {
        if (this.hotWrite('agent_reputation', {
            agent_id: agentId,
            score,
            tier,
            trend,
            events_json: eventsJson,
            tenant_id: tenantId,
            // SQLite stamped datetime('now') on every upsert; keep that behaviour.
            updated_at: new Date().toISOString(),
        })) {
            return;
        }
        const stmt = this.prep(`INSERT INTO agent_reputation (agent_id, score, tier, trend, events_json, tenant_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(agent_id) DO UPDATE SET score = excluded.score, tier = excluded.tier, trend = excluded.trend,
         events_json = excluded.events_json, updated_at = datetime('now')`);
        if (!stmt)
            return;
        stmt.run(agentId, score, tier, trend, eventsJson, tenantId);
    }
    getAgentReputation(agentId) {
        const row = this.hotActive()
            ? getIndustryHotState().getAgentReputation(agentId)
            : this.prep('SELECT score, tier, trend FROM agent_reputation WHERE agent_id = ?')?.get(agentId);
        if (!row)
            return null;
        return { score: Number(row.score), tier: String(row.tier), trend: String(row.trend) };
    }
    saveBenchmarkSubmission(row) {
        const stmt = this.prep(`INSERT OR REPLACE INTO benchmark_submissions
       (id, profile, package_name, block_rate, false_positive_rate, p95_latency_ms, scorecard_json, submitted_at, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        if (!stmt)
            return;
        stmt.run(row.id, row.profile, row.packageName ?? null, row.blockRate, row.falsePositiveRate, row.p95LatencyMs ?? null, row.scorecardJson, row.submittedAt, row.tenantId ?? 'default');
    }
    saveCapabilityEdge(edge) {
        const stmt = this.prep(`INSERT INTO capability_graph_edges (server_name, source_tool, target_resource, edge_type, metadata_json, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?)`);
        if (!stmt)
            return;
        stmt.run(edge.serverName, edge.sourceTool, edge.targetResource ?? null, edge.edgeType, edge.metadataJson ?? null, edge.tenantId ?? 'default');
    }
    saveIntentBinding(row) {
        if (this.hotWrite('intent_bindings', {
            session_id: row.sessionId,
            agent_id: row.agentId ?? null,
            declared_intent: row.declaredIntent,
            allowed_tools_json: row.allowedToolsJson,
            expires_at: row.expiresAt,
            tenant_id: row.tenantId ?? 'default',
        })) {
            return;
        }
        const stmt = this.prep(`INSERT OR REPLACE INTO intent_bindings
       (session_id, agent_id, declared_intent, allowed_tools_json, expires_at, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?)`);
        if (!stmt)
            return;
        stmt.run(row.sessionId, row.agentId ?? null, row.declaredIntent, row.allowedToolsJson, row.expiresAt, row.tenantId ?? 'default');
    }
    getIntentBinding(sessionId) {
        const row = this.hotActive()
            ? getIndustryHotState().getIntentBinding(sessionId)
            : this.prep('SELECT declared_intent, allowed_tools_json, expires_at FROM intent_bindings WHERE session_id = ?')?.get(sessionId);
        if (!row)
            return null;
        let allowedTools = [];
        try {
            allowedTools = JSON.parse(String(row.allowed_tools_json ?? '[]'));
        }
        catch {
            allowedTools = [];
        }
        return {
            declaredIntent: String(row.declared_intent),
            allowedTools,
            expiresAt: String(row.expires_at),
        };
    }
    upsertSandboxTier(scopeType, scopeId, tier, rlStateJson, tenantId = 'default') {
        if (this.hotWrite('sandbox_tier_state', {
            id: `${scopeType}:${scopeId}`,
            scope_type: scopeType,
            scope_id: scopeId,
            tier,
            rl_state_json: rlStateJson ?? null,
            tenant_id: tenantId,
            updated_at: new Date().toISOString(),
        })) {
            return;
        }
        const stmt = this.prep(`INSERT INTO sandbox_tier_state (id, scope_type, scope_id, tier, rl_state_json, tenant_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET tier = excluded.tier, rl_state_json = excluded.rl_state_json, updated_at = datetime('now')`);
        if (!stmt)
            return;
        const id = `${scopeType}:${scopeId}`;
        stmt.run(id, scopeType, scopeId, tier, rlStateJson ?? null, tenantId);
    }
    getSandboxTier(scopeType, scopeId) {
        const row = this.hotActive()
            ? getIndustryHotState().getSandboxTier(scopeType, scopeId)
            : this.prep('SELECT tier FROM sandbox_tier_state WHERE scope_type = ? AND scope_id = ?')?.get(scopeType, scopeId);
        return row ? String(row.tier) : null;
    }
    listSandboxTiers() {
        if (this.hotActive()) {
            // Without this the dashboard reports zero sandbox tiers under Postgres
            // while the enforcement path is actively enforcing them.
            return getIndustryHotState()
                .rows('sandbox_tier_state')
                .map((r) => ({
                scopeType: String(r['scope_type'] ?? ''),
                scopeId: String(r['scope_id'] ?? ''),
                tier: String(r['tier'] ?? ''),
            }));
        }
        const stmt = this.prep('SELECT scope_type, scope_id, tier FROM sandbox_tier_state');
        if (!stmt)
            return [];
        const rows = stmt.all() || [];
        return rows.map((row) => {
            const r = row;
            return {
                scopeType: String(r.scope_type || ''),
                scopeId: String(r.scope_id || ''),
                tier: String(r.tier || ''),
            };
        });
    }
    saveFuzzRun(row) {
        const stmt = this.prep(`INSERT OR REPLACE INTO protocol_fuzz_runs
       (id, server_name, total, blocked, passed, bypasses_json, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`);
        if (!stmt)
            return;
        stmt.run(row.id, row.serverName, row.total, row.blocked, row.passed, row.bypassesJson, row.tenantId ?? 'default');
    }
    savePlaybookRun(row) {
        const stmt = this.prep(`INSERT OR REPLACE INTO incident_playbook_runs
       (id, playbook_id, trigger, status, steps_json, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?)`);
        if (!stmt)
            return;
        stmt.run(row.id, row.playbookId, row.trigger, row.status, row.stepsJson, row.tenantId ?? 'default');
    }
    saveComplianceControlStatus(row) {
        const stmt = this.prep(`INSERT INTO compliance_control_status (framework, control_id, status, evidence_json, evaluated_at, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(framework, control_id, tenant_id) DO UPDATE SET
         status = excluded.status, evidence_json = excluded.evidence_json, evaluated_at = excluded.evaluated_at`);
        if (!stmt)
            return;
        stmt.run(row.framework, row.controlId, row.status, row.evidenceJson, row.evaluatedAt, row.tenantId ?? 'default');
    }
    listCertifications(tenantId = 'default', limit = 100) {
        if (this.hotActive()) {
            return getIndustryHotState()
                .rows('mcp_certifications')
                .filter((r) => String(r['tenant_id'] ?? 'default') === tenantId)
                .sort((a, b) => String(b['issued_at'] ?? '').localeCompare(String(a['issued_at'] ?? '')))
                .slice(0, limit)
                .map((row) => this.rowToCertification(row));
        }
        const stmt = this.prep(`SELECT * FROM mcp_certifications WHERE tenant_id = ? ORDER BY issued_at DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map((row) => this.rowToCertification(row));
    }
    listMtxSignatures(tenantId = 'default', limit = 500) {
        const stmt = this.prep(`SELECT signature_hash, mtx_json, report_count, verified, synced_at
       FROM mtx_signatures WHERE tenant_id = ? ORDER BY synced_at DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map((row) => {
            let category = 'unknown';
            let severity = 'medium';
            try {
                const mtx = JSON.parse(String(row.mtx_json ?? '{}'));
                category = String(mtx.category ?? 'unknown');
                const br = String(mtx.blockReason ?? '');
                if (br.startsWith('critical'))
                    severity = 'critical';
                else if (br.startsWith('high'))
                    severity = 'high';
                else if (br.startsWith('low'))
                    severity = 'low';
            }
            catch {
                /* defaults */
            }
            return {
                signatureHash: String(row.signature_hash),
                category,
                severity,
                firstSeen: String(row.synced_at ?? new Date().toISOString()),
                reportCount: Number(row.report_count ?? 1),
                verified: Boolean(row.verified),
            };
        });
    }
    listMtxPatternHashes(tenantId = 'default', limit = 2000) {
        if (this.hotActive()) {
            // This feeds src/policy/threat-intel-guard.ts. Returning [] here does not
            // fail closed -- it silently removes every MTX community signature from
            // the guard's pattern set, so the guard just stops matching. That is a
            // fail-OPEN regression, so the cache must serve it.
            return getIndustryHotState()
                .rows('mtx_signatures')
                .filter((r) => String(r['tenant_id'] ?? 'default') === tenantId)
                .slice(0, limit)
                .map((r) => String(r['signature_hash'] ?? ''))
                .filter(Boolean);
        }
        const stmt = this.prep(`SELECT signature_hash FROM mtx_signatures WHERE tenant_id = ? ORDER BY report_count DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map((r) => String(r.signature_hash)).filter(Boolean);
    }
    listChainEvents(tenantId = 'default', limit = 200) {
        const stmt = this.prep(`SELECT session_id, agent_id, server_name, tool_name, event_type, blocked
       FROM session_chain_events WHERE tenant_id = ? ORDER BY rowid DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map((r) => ({
            sessionId: String(r.session_id),
            agentId: r.agent_id != null ? String(r.agent_id) : null,
            serverName: String(r.server_name),
            toolName: String(r.tool_name),
            eventType: String(r.event_type),
            blocked: Boolean(r.blocked),
        }));
    }
    listCapabilityEdges(tenantId = 'default', limit = 500) {
        const stmt = this.prep(`SELECT server_name, source_tool, target_resource, edge_type
       FROM capability_graph_edges WHERE tenant_id = ? ORDER BY rowid DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map((r) => ({
            serverName: String(r.server_name),
            sourceTool: String(r.source_tool),
            targetResource: r.target_resource != null ? String(r.target_resource) : null,
            edgeType: String(r.edge_type),
        }));
    }
    listBenchmarkSubmissions(profile, tenantId = 'default', limit = 50) {
        const sql = profile
            ? `SELECT id, profile, package_name, block_rate, false_positive_rate, p95_latency_ms, submitted_at
         FROM benchmark_submissions WHERE tenant_id = ? AND profile = ? ORDER BY block_rate DESC LIMIT ?`
            : `SELECT id, profile, package_name, block_rate, false_positive_rate, p95_latency_ms, submitted_at
         FROM benchmark_submissions WHERE tenant_id = ? ORDER BY block_rate DESC LIMIT ?`;
        const stmt = this.prep(sql);
        if (!stmt)
            return [];
        const rows = (profile ? stmt.all(tenantId, profile, limit) : stmt.all(tenantId, limit));
        return rows.map((r) => ({
            id: String(r.id),
            profile: String(r.profile),
            packageName: r.package_name != null ? String(r.package_name) : null,
            blockRate: Number(r.block_rate),
            falsePositiveRate: Number(r.false_positive_rate),
            p95LatencyMs: r.p95_latency_ms != null ? Number(r.p95_latency_ms) : null,
            submittedAt: String(r.submitted_at),
        }));
    }
    getStatus(tenantId = 'default') {
        const scalar = (sql) => this.prep(sql);
        if (!scalar('SELECT 1')) {
            // Previously this returned an all-zero status that was indistinguishable
            // from "you have no certifications" -- the exact failure mode that let
            // Postgres look healthy while storing nothing.
            const unsupported = [
                'mtx_signatures',
                'benchmark_submissions',
                'session_chain_events',
                'config_provenance_events',
                'behavior_anomaly_events',
            ];
            if (this.hotActive()) {
                return {
                    certificationCount: getIndustryHotState()
                        .rows('mcp_certifications')
                        .filter((r) => String(r['tenant_id'] ?? 'default') === tenantId).length,
                    mtxCount: 0,
                    benchmarkCount: 0,
                    chainEventCount: 0,
                    partial: true,
                    unavailable: unsupported,
                };
            }
            return { certificationCount: 0, mtxCount: 0, benchmarkCount: 0, chainEventCount: 0 };
        }
        const cert = scalar('SELECT COUNT(*) AS n FROM mcp_certifications WHERE tenant_id = ?').get(tenantId);
        const mtx = scalar('SELECT COUNT(*) AS n FROM mtx_signatures WHERE tenant_id = ?').get(tenantId);
        const bench = scalar('SELECT COUNT(*) AS n FROM benchmark_submissions WHERE tenant_id = ?').get(tenantId);
        const chain = scalar('SELECT COUNT(*) AS n FROM session_chain_events WHERE tenant_id = ?').get(tenantId);
        const prov = scalar('SELECT COUNT(*) AS n FROM config_provenance_events WHERE tenant_id = ?').get(tenantId);
        const anom = scalar('SELECT COUNT(*) AS n FROM behavior_anomaly_events WHERE tenant_id = ?').get(tenantId);
        return {
            certificationCount: this.hotActive()
                ? getIndustryHotState()
                    .rows('mcp_certifications')
                    .filter((r) => String(r['tenant_id'] ?? 'default') === tenantId).length
                : Number(cert?.n ?? 0),
            mtxCount: Number(mtx?.n ?? 0),
            benchmarkCount: Number(bench?.n ?? 0),
            chainEventCount: Number(chain?.n ?? 0),
            provenanceCount: Number(prov?.n ?? 0),
            anomalyCount: Number(anom?.n ?? 0),
        };
    }
    saveProvenanceEvent(event) {
        const exec = this.prep(`INSERT INTO config_provenance_events
       (event_id, actor, event_type, resource_path, diff_json, prev_hash, entry_hash, signature, approval_id, tenant_id, created_at)
       VALUES (@eventId, @actor, @eventType, @resourcePath, @diffJson, @prevHash, @entryHash, @signature, @approvalId, @tenantId, @createdAt)`);
        if (!exec)
            return;
        exec.run({
            ...event,
            diffJson: event.diff ? JSON.stringify(event.diff) : null,
        });
    }
    listProvenanceEvents(tenantId = 'default', limit = 200) {
        const stmt = this.prep(`SELECT event_id, actor, event_type, resource_path, diff_json, prev_hash, entry_hash, signature, approval_id, created_at
       FROM config_provenance_events WHERE tenant_id = ? ORDER BY rowid DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map(r => ({
            eventId: String(r.event_id),
            actor: String(r.actor),
            eventType: String(r.event_type),
            resourcePath: String(r.resource_path),
            diff: r.diff_json ? JSON.parse(String(r.diff_json)) : undefined,
            prevHash: String(r.prev_hash),
            entryHash: String(r.entry_hash),
            signature: r.signature ? String(r.signature) : undefined,
            approvalId: r.approval_id ? String(r.approval_id) : undefined,
            tenantId,
            createdAt: String(r.created_at),
        }));
    }
    getLatestProvenanceHash(tenantId = 'default') {
        const stmt = this.prep('SELECT entry_hash FROM config_provenance_events WHERE tenant_id = ? ORDER BY rowid DESC LIMIT 1');
        if (!stmt)
            return null;
        const row = stmt.get(tenantId);
        return row?.entry_hash ? String(row.entry_hash) : null;
    }
    saveMerkleCheckpoint(checkpoint, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO config_merkle_checkpoints
       (checkpoint_id, merkle_root, event_count, tenant_id)
       VALUES (@checkpointId, @merkleRoot, @eventCount, @tenantId)`);
        if (!exec)
            return;
        exec.run({ ...checkpoint, tenantId });
    }
    listFederatedDeltas(limit = 100, tenantId = 'default') {
        const stmt = this.prep(`SELECT delta_id, model_version, signature_hash, sample_count, privacy_budget_epsilon, created_at
       FROM federated_model_deltas WHERE tenant_id = ? ORDER BY rowid DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map(r => ({
            deltaId: String(r.delta_id),
            modelVersion: String(r.model_version),
            signatureHash: String(r.signature_hash),
            sampleCount: Number(r.sample_count),
            privacyBudgetEpsilon: Number(r.privacy_budget_epsilon),
            createdAt: String(r.created_at),
        }));
    }
    saveBehaviorFingerprint(fp, tenantId = 'default') {
        if (this.hotWrite('behavior_fingerprints', {
            agent_id: fp.agentId,
            sample_count: fp.sampleCount,
            avg_inter_call_ms: fp.avgInterCallMs,
            avg_arg_bytes: fp.avgArgBytes,
            tool_order_json: JSON.stringify(fp.toolOrder),
            arg_shape_hash: fp.argShapeHash,
            tenant_id: tenantId,
            updated_at: fp.updatedAt,
        })) {
            return;
        }
        const exec = this.prep(`INSERT OR REPLACE INTO behavior_fingerprints
       (agent_id, sample_count, avg_inter_call_ms, avg_arg_bytes, tool_order_json, arg_shape_hash, tenant_id, updated_at)
       VALUES (@agentId, @sampleCount, @avgInterCallMs, @avgArgBytes, @toolOrderJson, @argShapeHash, @tenantId, @updatedAt)`);
        if (!exec)
            return;
        exec.run({
            ...fp,
            toolOrderJson: JSON.stringify(fp.toolOrder),
            tenantId,
        });
    }
    getBehaviorFingerprint(agentId) {
        const row = this.hotActive()
            ? getIndustryHotState().getBehaviorFingerprint(agentId)
            : this.prep('SELECT * FROM behavior_fingerprints WHERE agent_id = ?')?.get(agentId);
        if (!row)
            return null;
        return {
            agentId: String(row.agent_id),
            sampleCount: Number(row.sample_count),
            avgInterCallMs: Number(row.avg_inter_call_ms),
            avgArgBytes: Number(row.avg_arg_bytes),
            toolOrder: JSON.parse(String(row.tool_order_json ?? '[]')),
            argShapeHash: String(row.arg_shape_hash),
            updatedAt: String(row.updated_at),
        };
    }
    saveBehaviorAnomaly(params, tenantId = 'default') {
        const exec = this.prep(`INSERT INTO behavior_anomaly_events (agent_id, anomaly_score, reason, observation_json, blocked, tenant_id)
       VALUES (@agentId, @anomalyScore, @reason, @observationJson, @blocked, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            agentId: params.agentId,
            anomalyScore: params.anomalyScore,
            reason: params.reason,
            observationJson: JSON.stringify(params.observation),
            blocked: params.blocked ? 1 : 0,
            tenantId,
        });
    }
    listBehaviorAnomalies(limit = 50, tenantId = 'default') {
        const stmt = this.prep(`SELECT agent_id, anomaly_score, reason, created_at FROM behavior_anomaly_events
       WHERE tenant_id = ? ORDER BY rowid DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map(r => ({
            agentId: String(r.agent_id),
            anomalyScore: Number(r.anomaly_score),
            reason: String(r.reason),
            createdAt: String(r.created_at),
        }));
    }
    saveFleetChainEvent(params, tenantId = 'default') {
        const exec = this.prep(`INSERT INTO fleet_chain_events
       (global_session_id, agent_id, server_name, tool_name, event_type, mitre_technique, blocked, edge_json, tenant_id)
       VALUES (@globalSessionId, @agentId, @serverName, @toolName, @eventType, @mitreTechnique, @blocked, @edgeJson, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            ...params,
            mitreTechnique: params.mitreTechnique ?? null,
            blocked: params.blocked ? 1 : 0,
            edgeJson: params.edgeJson ? JSON.stringify(params.edgeJson) : null,
            tenantId,
        });
    }
    listFleetChainEvents(globalSessionId, limit = 300, tenantId = 'default') {
        const stmt = this.prep(`SELECT global_session_id, agent_id, server_name, tool_name, event_type, mitre_technique, blocked, edge_json, created_at
       FROM fleet_chain_events
       WHERE global_session_id = ? AND tenant_id = ?
       ORDER BY id DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(globalSessionId, tenantId, limit);
        return rows.reverse().map(r => ({
            globalSessionId: String(r.global_session_id),
            agentId: String(r.agent_id ?? ''),
            serverName: String(r.server_name),
            toolName: String(r.tool_name),
            eventType: String(r.event_type),
            blocked: Boolean(r.blocked),
            mitreTechnique: r.mitre_technique ? String(r.mitre_technique) : undefined,
            edgeJson: r.edge_json ? JSON.parse(String(r.edge_json)) : undefined,
            createdAt: String(r.created_at),
        }));
    }
    saveFleetChainAlert(alert, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO fleet_chain_alerts
       (alert_id, global_session_id, pattern, confidence, agents_json, servers_json, tools_json, mitre_techniques_json, description, tenant_id)
       VALUES (@alertId, @globalSessionId, @pattern, @confidence, @agentsJson, @serversJson, @toolsJson, @mitreTechniquesJson, @description, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            alertId: alert.alertId,
            globalSessionId: alert.globalSessionId,
            pattern: alert.pattern,
            confidence: alert.confidence,
            agentsJson: JSON.stringify(alert.agents),
            serversJson: JSON.stringify(alert.servers),
            toolsJson: JSON.stringify(alert.tools),
            mitreTechniquesJson: JSON.stringify(alert.mitreTechniques),
            description: alert.description,
            tenantId,
        });
    }
    listFleetChainAlerts(globalSessionId, limit = 50, tenantId = 'default') {
        const stmt = globalSessionId
            ? this.prep(`SELECT alert_id, global_session_id, pattern, confidence, agents_json, servers_json, tools_json,
                  mitre_techniques_json, description, created_at
           FROM fleet_chain_alerts WHERE global_session_id = ? AND tenant_id = ?
           ORDER BY created_at DESC LIMIT ?`)
            : this.prep(`SELECT alert_id, global_session_id, pattern, confidence, agents_json, servers_json, tools_json,
                  mitre_techniques_json, description, created_at
           FROM fleet_chain_alerts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = globalSessionId
            ? stmt.all(globalSessionId, tenantId, limit)
            : stmt.all(tenantId, limit);
        return rows.map(r => ({
            alertId: String(r.alert_id),
            globalSessionId: String(r.global_session_id),
            pattern: String(r.pattern),
            confidence: Number(r.confidence),
            agents: JSON.parse(String(r.agents_json ?? '[]')),
            servers: JSON.parse(String(r.servers_json ?? '[]')),
            tools: JSON.parse(String(r.tools_json ?? '[]')),
            mitreTechniques: JSON.parse(String(r.mitre_techniques_json ?? '[]')),
            description: String(r.description),
            createdAt: String(r.created_at),
        }));
    }
    saveDigitalTwinSnapshot(snap, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO digital_twin_snapshots
       (id, server_name, schema_json, latency_p50_ms, latency_p99_ms, response_shape_hash, sample_count, tenant_id, captured_at)
       VALUES (@id, @serverName, @schemaJson, @latencyP50Ms, @latencyP99Ms, @responseShapeHash, @sampleCount, @tenantId, @capturedAt)`);
        if (!exec)
            return;
        exec.run({
            ...snap,
            schemaJson: JSON.stringify(snap.schemaJson),
            tenantId,
        });
    }
    saveReputationEntry(entry, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO reputation_network_entries
       (server_hash, dimensions_json, consensus_score, rater_count, level, tenant_id, updated_at)
       VALUES (@serverHash, @dimensionsJson, @consensusScore, @raterCount, @level, @tenantId, @updatedAt)`);
        if (!exec)
            return;
        exec.run({
            serverHash: entry.serverHash,
            dimensionsJson: JSON.stringify(entry.dimensions),
            consensusScore: entry.consensusScore,
            raterCount: entry.raterCount,
            level: entry.level,
            tenantId,
            updatedAt: entry.updatedAt,
        });
    }
    getReputationEntry(serverHash) {
        const stmt = this.prep('SELECT * FROM reputation_network_entries WHERE server_hash = ?');
        if (!stmt)
            return null;
        const row = stmt.get(serverHash);
        if (!row)
            return null;
        return {
            serverHash: String(row.server_hash),
            dimensions: JSON.parse(String(row.dimensions_json ?? '{}')),
            consensusScore: Number(row.consensus_score),
            raterCount: Number(row.rater_count),
            level: String(row.level),
            updatedAt: String(row.updated_at),
        };
    }
    saveObservatoryMetric(params, tenantId = 'default') {
        const exec = this.prep(`INSERT INTO observatory_telemetry (metric_type, metric_value, dimension_json, tenant_id)
       VALUES (@metricType, @metricValue, @dimensionJson, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            metricType: params.metricType,
            metricValue: params.value,
            dimensionJson: params.dimension ? JSON.stringify(params.dimension) : null,
            tenantId,
        });
    }
    listObservatoryMetrics(limit = 500, tenantId = 'default') {
        const stmt = this.prep(`SELECT metric_type, metric_value, dimension_json, recorded_at FROM observatory_telemetry
       WHERE tenant_id = ? ORDER BY rowid DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map(r => ({
            metricType: String(r.metric_type),
            value: Number(r.metric_value),
            dimension: r.dimension_json ? JSON.parse(String(r.dimension_json)) : undefined,
            recordedAt: String(r.recorded_at),
        }));
    }
    saveInsuranceRiskReport(report, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO insurance_risk_reports (id, tenant_id, ale_usd, exposure_score, report_json)
       VALUES (@id, @tenantId, @aleUsd, @exposureScore, @reportJson)`);
        if (!exec)
            return;
        exec.run({
            id: report.id,
            tenantId,
            aleUsd: report.aleUsd,
            exposureScore: report.exposureScore,
            reportJson: report.reportJson,
        });
    }
    rowToCertification(row) {
        return {
            id: String(row.id),
            serverName: String(row.server_name),
            packageName: String(row.package_name),
            version: String(row.version),
            level: String(row.level),
            score: Number(row.score),
            certified: Boolean(row.certified),
            attestationJws: row.attestation_jws ? String(row.attestation_jws) : undefined,
            checksJson: String(row.checks_json ?? '[]'),
            issuedAt: String(row.issued_at),
            expiresAt: String(row.expires_at),
            tenantId: String(row.tenant_id ?? 'default'),
        };
    }
    saveFederatedDelta(delta, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO federated_model_deltas
       (delta_id, model_version, signature_hash, sample_count, privacy_budget_epsilon, tenant_id, created_at)
       VALUES (@deltaId, @modelVersion, @signatureHash, @sampleCount, @privacyBudgetEpsilon, @tenantId, @createdAt)`);
        if (!exec)
            return;
        exec.run({ ...delta, tenantId });
    }
    saveFederatedModelWeights(weights, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO federated_model_weights
       (model_version, weights_json, contributor_count, tenant_id, created_at)
       VALUES (@modelVersion, @weightsJson, @contributorCount, @tenantId, @createdAt)`);
        if (!exec)
            return;
        exec.run({
            modelVersion: weights.modelVersion,
            weightsJson: JSON.stringify(weights.weights),
            contributorCount: weights.contributorCount,
            tenantId,
            createdAt: weights.createdAt,
        });
    }
    getLatestFederatedModelWeights(tenantId = 'default') {
        const stmt = this.prep(`SELECT model_version, weights_json, contributor_count, created_at
       FROM federated_model_weights WHERE tenant_id = ? ORDER BY rowid DESC LIMIT 1`);
        if (!stmt)
            return null;
        const row = stmt.get(tenantId);
        if (!row)
            return null;
        try {
            const weights = JSON.parse(String(row.weights_json));
            return {
                modelVersion: String(row.model_version),
                weights,
                contributorCount: Number(row.contributor_count),
                createdAt: String(row.created_at),
            };
        }
        catch {
            return null;
        }
    }
    saveFederatedRollout(rollout, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO federated_rollout_decisions
       (rollout_id, model_version, stage, approved, approval_id, reason, tenant_id)
       VALUES (@rolloutId, @modelVersion, @stage, @approved, @approvalId, @reason, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            rolloutId: rollout.rolloutId,
            modelVersion: rollout.modelVersion,
            stage: rollout.stage,
            approved: rollout.approved ? 1 : 0,
            approvalId: rollout.approvalId ?? null,
            reason: rollout.reason ?? null,
            tenantId,
        });
    }
    getRaterTrust(raterId, tenantId = 'default') {
        const stmt = this.prep('SELECT rater_id, trust_score, attestation_count FROM reputation_rater_trust WHERE rater_id = ? AND tenant_id = ?');
        if (!stmt)
            return { raterId, trustScore: 1.0, attestationCount: 0 };
        const row = stmt.get(raterId, tenantId);
        if (!row)
            return { raterId, trustScore: 1.0, attestationCount: 0 };
        return {
            raterId: String(row.rater_id),
            trustScore: Number(row.trust_score),
            attestationCount: Number(row.attestation_count),
        };
    }
    bumpRaterTrust(raterId, delta = 0.05, tenantId = 'default') {
        const current = this.getRaterTrust(raterId, tenantId);
        const exec = this.prep(`INSERT OR REPLACE INTO reputation_rater_trust
       (rater_id, trust_score, attestation_count, tenant_id, updated_at)
       VALUES (@raterId, @trustScore, @attestationCount, @tenantId, datetime('now'))`);
        if (!exec)
            return;
        exec.run({
            raterId,
            trustScore: Math.min(2, Math.max(0.1, current.trustScore + delta)),
            attestationCount: current.attestationCount + 1,
            tenantId,
        });
    }
    saveReputationTrustEdge(edge, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO reputation_trust_edges
       (from_rater_id, to_rater_id, weight, tenant_id, updated_at)
       VALUES (@fromRaterId, @toRaterId, @weight, @tenantId, datetime('now'))`);
        if (!exec)
            return;
        exec.run({ ...edge, tenantId });
    }
    listReputationTrustEdges(tenantId = 'default') {
        const stmt = this.prep('SELECT from_rater_id, to_rater_id, weight FROM reputation_trust_edges WHERE tenant_id = ?');
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId);
        return rows.map(r => ({
            fromRaterId: String(r.from_rater_id),
            toRaterId: String(r.to_rater_id),
            weight: Number(r.weight),
        }));
    }
    saveFederatedGradientSnapshot(snapshot, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO federated_gradient_snapshots
       (snapshot_id, model_version, gradient_json, contributor_count, tenant_id, created_at)
       VALUES (@snapshotId, @modelVersion, @gradientJson, @contributorCount, @tenantId, @createdAt)`);
        if (!exec)
            return;
        exec.run({
            snapshotId: snapshot.snapshotId,
            modelVersion: snapshot.modelVersion,
            gradientJson: JSON.stringify(snapshot.gradient),
            contributorCount: snapshot.contributorCount,
            tenantId,
            createdAt: snapshot.createdAt,
        });
    }
    saveReputationRaterVote(vote, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO reputation_rater_votes
       (server_hash, rater_id, dimensions_json, rater_weight, attestation_jws, tenant_id)
       VALUES (@serverHash, @raterId, @dimensionsJson, @raterWeight, @attestationJws, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            serverHash: vote.serverHash,
            raterId: vote.raterId,
            dimensionsJson: JSON.stringify(vote.dimensions),
            raterWeight: vote.raterWeight,
            attestationJws: vote.attestationJws ?? null,
            tenantId,
        });
    }
    listReputationRaterVotes(serverHash, tenantId = 'default') {
        const stmt = this.prep('SELECT rater_id, dimensions_json, rater_weight, attestation_jws FROM reputation_rater_votes WHERE server_hash = ? AND tenant_id = ?');
        if (!stmt)
            return [];
        const rows = stmt.all(serverHash, tenantId);
        return rows.map(r => ({
            raterId: String(r.rater_id),
            dimensions: JSON.parse(String(r.dimensions_json)),
            raterWeight: Number(r.rater_weight),
            attestationJws: r.attestation_jws ? String(r.attestation_jws) : undefined,
        }));
    }
    saveThreatModelReport(report, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO threat_model_reports
       (report_id, title, config_path, report_json, tenant_id)
       VALUES (@reportId, @title, @configPath, @reportJson, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            reportId: report.reportId,
            title: report.title,
            configPath: report.configPath ?? null,
            reportJson: report.reportJson,
            tenantId,
        });
    }
    getLatestThreatModelReport(tenantId = 'default') {
        const stmt = this.prep('SELECT report_id, title, config_path, report_json, created_at FROM threat_model_reports WHERE tenant_id = ? ORDER BY rowid DESC LIMIT 1');
        if (!stmt)
            return null;
        const row = stmt.get(tenantId);
        if (!row)
            return null;
        return {
            reportId: String(row.report_id),
            title: String(row.title),
            configPath: row.config_path ? String(row.config_path) : undefined,
            reportJson: String(row.report_json),
            createdAt: String(row.created_at),
        };
    }
    saveDigitalTwinObservation(obs, tenantId = 'default') {
        const exec = this.prep(`INSERT INTO digital_twin_observations
       (server_name, tool_name, args_json, latency_ms, response_shape, tenant_id)
       VALUES (@serverName, @toolName, @argsJson, @latencyMs, @responseShape, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            serverName: obs.serverName,
            toolName: obs.toolName,
            argsJson: obs.argsJson ? JSON.stringify(obs.argsJson) : null,
            latencyMs: obs.latencyMs,
            responseShape: obs.responseShape,
            tenantId,
        });
    }
    listDigitalTwinObservations(serverName, limit = 500, tenantId = 'default') {
        const stmt = this.prep(`SELECT server_name, tool_name, args_json, latency_ms, response_shape, recorded_at
       FROM digital_twin_observations WHERE server_name = ? AND tenant_id = ?
       ORDER BY id DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(serverName, tenantId, limit);
        return rows.reverse().map(r => ({
            serverName: String(r.server_name),
            toolName: String(r.tool_name),
            argsJson: r.args_json ? JSON.parse(String(r.args_json)) : undefined,
            latencyMs: Number(r.latency_ms),
            responseShape: String(r.response_shape),
            recordedAt: String(r.recorded_at),
        }));
    }
    savePolicyDraftApproval(draft, tenantId = 'default') {
        const exec = this.prep(`INSERT OR REPLACE INTO policy_draft_approvals
       (request_id, goal, rule_json, yaml, status, created_at, tenant_id)
       VALUES (@requestId, @goal, @ruleJson, @yaml, @status, @createdAt, @tenantId)`);
        if (!exec)
            return;
        exec.run({ ...draft, tenantId });
    }
    getPolicyDraftApproval(requestId, tenantId = 'default') {
        const stmt = this.prep(`SELECT request_id, goal, rule_json, yaml, status, created_at
       FROM policy_draft_approvals WHERE request_id = ? AND tenant_id = ?`);
        if (!stmt)
            return null;
        const row = stmt.get(requestId, tenantId);
        if (!row)
            return null;
        return {
            requestId: String(row.request_id),
            goal: String(row.goal),
            ruleJson: String(row.rule_json),
            yaml: String(row.yaml),
            status: String(row.status),
            createdAt: String(row.created_at),
        };
    }
    listPolicyDraftApprovals(limit = 100, tenantId = 'default') {
        const stmt = this.prep(`SELECT request_id, goal, rule_json, yaml, status, created_at
       FROM policy_draft_approvals WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map(r => ({
            requestId: String(r.request_id),
            goal: String(r.goal),
            ruleJson: String(r.rule_json),
            yaml: String(r.yaml),
            status: String(r.status),
            createdAt: String(r.created_at),
        }));
    }
    saveObservatoryAlert(alert, tenantId = 'default') {
        const exec = this.prep(`INSERT INTO observatory_alerts
       (alert_type, severity, message, metric_type, threshold, observed_value, tenant_id)
       VALUES (@alertType, @severity, @message, @metricType, @threshold, @observedValue, @tenantId)`);
        if (!exec)
            return;
        exec.run({
            alertType: alert.alertType,
            severity: alert.severity,
            message: alert.message,
            metricType: alert.metricType ?? null,
            threshold: alert.threshold ?? null,
            observedValue: alert.observedValue ?? null,
            tenantId,
        });
    }
    listObservatoryAlerts(limit = 50, tenantId = 'default') {
        const stmt = this.prep(`SELECT alert_type, severity, message, metric_type, threshold, observed_value, created_at
       FROM observatory_alerts WHERE tenant_id = ? ORDER BY id DESC LIMIT ?`);
        if (!stmt)
            return [];
        const rows = stmt.all(tenantId, limit);
        return rows.map(r => ({
            alertType: String(r.alert_type),
            severity: String(r.severity),
            message: String(r.message),
            metricType: r.metric_type ? String(r.metric_type) : undefined,
            threshold: r.threshold != null ? Number(r.threshold) : undefined,
            observedValue: r.observed_value != null ? Number(r.observed_value) : undefined,
            createdAt: String(r.created_at),
        }));
    }
}
//# sourceMappingURL=industry-standard-store.js.map