import { execSync } from 'child_process';
import { Logger } from '../utils/logger.js';
import { fetchSignedRemotePricing } from './pricing-remote.js';
import { detectZeroPricingAlert } from './pricing-signature.js';
// Last reviewed date for live pricing freshness checks.
export const PRICING_TABLE_DATE = '2025-03-01';
export const PRICING_STALENESS_DAYS = 30;
export function getPricingStalenessWarning() {
    const stale = new Date(PRICING_TABLE_DATE);
    const ageMs = Date.now() - stale.getTime();
    const ageDays = Math.floor(ageMs / 86_400_000);
    if (ageDays > PRICING_STALENESS_DAYS) {
        return `Pricing cache is ${ageDays} days old. Run litellm to refresh.`;
    }
    return null;
}
// Live pricing from litellm, cached with 1-hour TTL
const pricingCache = new Map();
const CACHE_TTL_MS = 3600_000; // 1 hour
export class PricingClient {
    customPricing = new Map();
    liveModels = [];
    /**
     * Sync cost estimate (per-million tokens). Third arg `true` = output pricing.
     * Uses configured live/custom pricing only. Unknown pricing is unavailable.
     */
    calculateCost(tokens, model, isOutput = false) {
        const pricing = this.getPricingForModel(model);
        if (!pricing)
            return 0;
        const rate = isOutput ? pricing.output : pricing.input;
        return (tokens / 1_000_000) * rate;
    }
    getPricingForModel(model) {
        return this.customPricing.get(model) ?? null;
    }
    listModels() {
        const names = new Set([
            ...this.customPricing.keys(),
            ...this.liveModels,
        ]);
        return [...names].sort();
    }
    addPricing(model, inputPerMillion, outputPerMillion) {
        if (inputPerMillion <= 0 && outputPerMillion <= 0) {
            Logger.error(`[pricing] Rejected zero-price override for model ${model}`);
            return;
        }
        this.customPricing.set(model, { input: inputPerMillion, output: outputPerMillion });
    }
    /** Best-effort live refresh via signed remote URL or litellm. */
    async refreshLivePricing() {
        const remoteUrl = process.env['MASTYF_AI_PRICING_URL']?.trim();
        if (remoteUrl) {
            try {
                const models = await fetchSignedRemotePricing(remoteUrl);
                if (models) {
                    for (const [model, rates] of Object.entries(models)) {
                        this.customPricing.set(model, rates);
                    }
                    this.liveModels = Object.keys(models);
                    return;
                }
            }
            catch (err) {
                Logger.warn(`[pricing] Signed remote pricing unavailable: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        const models = this.getAvailableModels();
        const fetched = [];
        for (const model of models.slice(0, 5)) {
            const live = await this.fetchLivePricing(model);
            if (live) {
                this.customPricing.set(model, live);
                fetched.push(model);
            }
        }
        this.liveModels = fetched;
    }
    /**
     * Get live pricing for a model via litellm.
     */
    async getModelPricing(model) {
        // Check cache
        const cached = pricingCache.get(model);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            return { input: cached.input, output: cached.output, isLive: true };
        }
        // Try litellm for live pricing
        const livePrice = await this.fetchLivePricing(model);
        if (livePrice) {
            pricingCache.set(model, { input: livePrice.input, output: livePrice.output, fetchedAt: Date.now() });
            return { input: livePrice.input, output: livePrice.output, isLive: true };
        }
        return undefined;
    }
    /**
     * Fetch live pricing via litellm Python subprocess.
     * litellm has built-in pricing for 100+ models updated from provider APIs.
     */
    async fetchLivePricing(model) {
        try {
            const pythonScript = `
import json
try:
    import litellm
    # litellm.model_cost has live pricing for all models
    cost = litellm.model_cost.get("${model}", None)
    if cost:
        print(json.dumps({
            "input": cost.get("input_cost_per_token", 0) * 1_000_000,
            "output": cost.get("output_cost_per_token", 0) * 1_000_000
        }))
    else:
        # Try fuzzy match via litellm
        for k in litellm.model_cost:
            if k.startswith("${model.split('-')[0]}"):
                cost = litellm.model_cost[k]
                print(json.dumps({
                    "input": cost.get("input_cost_per_token", 0) * 1_000_000,
                    "output": cost.get("output_cost_per_token", 0) * 1_000_000,
                    "matched_model": k
                }))
                break
        else:
            print(json.dumps({"error": "model not found"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
            const result = execSync(`python3 -c "${pythonScript}"`, {
                encoding: 'utf-8',
                timeout: 8000,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const data = JSON.parse(result);
            if (data?.input !== undefined && data?.output !== undefined) {
                const zero = detectZeroPricingAlert({ [model]: { input: data.input, output: data.output } });
                if (zero.length > 0) {
                    Logger.error(`[pricing] litellm returned zero price for ${model} — ignored`);
                    return null;
                }
                return { input: data.input, output: data.output };
            }
        }
        catch (err) {
            Logger.debug(`litellm pricing fetch failed for ${model}: ${err instanceof Error ? err.message : String(err)}`);
        }
        return null;
    }
    /**
     * Calculate cost using live pricing when available.
     */
    async calculateCostAsync(model, inputTokens, outputTokens) {
        const pricing = await this.getModelPricing(model);
        if (!pricing) {
            return { cost: 0, isLive: false, priced: false };
        }
        const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        return { cost: Math.round(cost * 1_000_000) / 1_000_000, isLive: pricing.isLive, priced: true };
    }
    /** Synchronous version for compatibility. Returns 0 when pricing is unavailable. */
    estimateCost(model, inputTokens, outputTokens) {
        const pricing = this.getPricingForModel(model);
        if (!pricing)
            return 0;
        return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
    }
    getAvailableModels() {
        return this.listModels();
    }
    getPricingDate() {
        return PRICING_TABLE_DATE;
    }
}
//# sourceMappingURL=pricing-client.js.map