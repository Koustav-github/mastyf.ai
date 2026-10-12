/**
 * Resolves the active LLM model and per-million token rates in real time.
 * Priority: MCP message metadata → IDE client state (Cline) → env → live litellm rates.
 * Never falls back to a hardcoded default model for billing.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { PricingClient } from '../clients/pricing-client.js';
import { Logger } from '../utils/logger.js';
import { resolveModelId } from '../config/llm-config.js';
const REFRESH_MS = 2000;
export class RuntimeModelPricing {
    pricingClient = new PricingClient();
    cached = null;
    lastRefresh = 0;
    async getActivePricing() {
        if (Date.now() - this.lastRefresh < REFRESH_MS && this.cached) {
            return this.cached;
        }
        this.cached = await this.detectActivePricing();
        this.lastRefresh = Date.now();
        return this.cached;
    }
    extractModelFromMessage(msg) {
        if (!msg || typeof msg !== 'object')
            return null;
        const m = msg;
        const params = m.params;
        if (!params)
            return null;
        const meta = params._meta;
        if (typeof meta?.model === 'string' && meta.model.trim())
            return meta.model.trim();
        if (typeof meta?.modelId === 'string' && meta.modelId.trim())
            return meta.modelId.trim();
        if (typeof params.model === 'string' && params.model.trim())
            return params.model.trim();
        const args = params.arguments;
        if (args && typeof args === 'object') {
            const a = args;
            if (typeof a.model === 'string' && a.model.trim())
                return a.model.trim();
            if (typeof a.modelId === 'string' && a.modelId.trim())
                return a.modelId.trim();
        }
        return null;
    }
    async resolveForMessage(msg) {
        const fromMsg = msg ? this.extractModelFromMessage(msg) : null;
        if (fromMsg) {
            const resolved = await this.resolveModelId(fromMsg);
            if (resolved)
                return resolved;
        }
        return this.getActivePricing();
    }
    async resolveModelId(modelId) {
        if (this.cached && this.modelsMatch(this.cached.modelId, modelId)) {
            return this.cached;
        }
        return this.resolveModelIdDirect(modelId);
    }
    /** Resolve rates for a model without calling getActivePricing (avoids detectActivePricing ↔ resolve recursion). */
    async resolveModelIdDirect(modelId) {
        const cline = this.readClinePricing();
        if (cline && this.modelsMatch(cline.modelId, modelId)) {
            return cline;
        }
        const live = await this.pricingClient.getModelPricing(modelId);
        if (live) {
            return {
                modelId,
                displayName: modelId,
                inputPerM: live.input,
                outputPerM: live.output,
                source: 'litellm',
                isLive: live.isLive,
            };
        }
        return null;
    }
    computeCost(inputTokens, outputTokens, pricing) {
        if (!pricing) {
            return { costUsd: 0, source: 'unknown', priced: false };
        }
        const costUsd = (inputTokens / 1_000_000) * pricing.inputPerM +
            (outputTokens / 1_000_000) * pricing.outputPerM;
        return {
            costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
            model: pricing.modelId,
            displayName: pricing.displayName,
            source: pricing.source,
            priced: true,
        };
    }
    async computeCostForCall(inputTokens, outputTokens, msg) {
        const pricing = await this.resolveForMessage(msg);
        return this.computeCost(inputTokens, outputTokens, pricing);
    }
    readClineModelIdOnly() {
        const statePath = join(homedir(), '.cline', 'data', 'globalState.json');
        if (!existsSync(statePath))
            return null;
        try {
            const state = JSON.parse(readFileSync(statePath, 'utf-8'));
            const id = String(state.actModeClineModelId || state.actModeAnthropicModelId || state.actModeOpenAiModelId
                || state.actModeGeminiModelId || state.actModeGroqModelId || state.actModeOpenRouterModelId || '').trim();
            return id || null;
        }
        catch {
            return null;
        }
    }
    async detectActivePricing() {
        const cline = this.readClinePricing();
        if (cline)
            return cline;
        const clineId = this.readClineModelIdOnly();
        if (clineId) {
            const resolved = await this.resolveModelIdDirect(clineId);
            if (resolved)
                return resolved;
        }
        const envModel = resolveModelId();
        if (envModel?.trim()) {
            return this.resolveModelIdDirect(envModel.trim());
        }
        return null;
    }
    readClinePricing() {
        const statePath = join(homedir(), '.cline', 'data', 'globalState.json');
        if (!existsSync(statePath))
            return null;
        try {
            const state = JSON.parse(readFileSync(statePath, 'utf-8'));
            const withPrices = (modelId, displayName, info) => {
                if (info.inputPrice == null || info.outputPrice == null)
                    return null;
                return {
                    modelId,
                    displayName,
                    inputPerM: Number(info.inputPrice),
                    outputPerM: Number(info.outputPrice),
                    source: 'cline',
                    isLive: true,
                };
            };
            const clineInfo = state.actModeClineModelInfo;
            if (clineInfo) {
                const id = String(state.actModeClineModelId || clineInfo.name || 'cline');
                const row = withPrices(id, clineInfo.name || id, clineInfo);
                if (row)
                    return row;
            }
            const groqInfo = state.actModeGroqModelInfo;
            if (groqInfo) {
                const id = String(state.actModeGroqModelId || 'groq');
                const row = withPrices(id, groqInfo.description?.split('.')[0] || id, groqInfo);
                if (row)
                    return row;
            }
            const openRouterInfo = state.actModeOpenRouterModelInfo;
            if (openRouterInfo) {
                const id = String(state.actModeOpenRouterModelId || 'openrouter');
                const row = withPrices(id, id, openRouterInfo);
                if (row)
                    return row;
            }
            const modelIdOnly = String(state.actModeAnthropicModelId || state.actModeOpenAiModelId
                || state.actModeGeminiModelId || '').trim();
            if (modelIdOnly) {
                return null;
            }
        }
        catch (err) {
            Logger.debug(`[pricing] Cline state read failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        return null;
    }
    modelsMatch(a, b) {
        const na = a.toLowerCase().replace(/^models\//, '');
        const nb = b.toLowerCase().replace(/^models\//, '');
        return na === nb || na.includes(nb) || nb.includes(na);
    }
}
let singleton = null;
export function getRuntimeModelPricing() {
    if (!singleton)
        singleton = new RuntimeModelPricing();
    return singleton;
}
//# sourceMappingURL=runtime-model-pricing.js.map