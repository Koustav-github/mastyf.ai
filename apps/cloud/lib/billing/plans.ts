/**
 * Plans sold through Razorpay. Prices live here, on the server's side of the checkout: the
 * browser only names a plan, so nobody can pay less by editing a request. Safe to import in
 * client components (no secrets).
 */

export type PaidPlanId = 'developer' | 'team';

/** Each paid order buys this many days of the plan; paying again extends it. */
export const PLAN_PERIOD_DAYS = 30;

export type PaidPlan = {
  name: string;
  /** licenses.tier this plan grants the workspace. */
  tier: 'pro' | 'team';
  /** In paise (₹1 = 100 paise). USD list price converted at ~₹95/$ (Oct 2026), rounded to ₹…99. */
  amount: number;
  currency: 'INR';
};

export const PAID_PLANS: Record<PaidPlanId, PaidPlan> = {
  developer: { name: 'Developer Pro', tier: 'pro', amount: 469_900, currency: 'INR' }, // $49
  team: { name: 'Team', tier: 'team', amount: 4_739_900, currency: 'INR' }, // $499
};

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return value === 'developer' || value === 'team';
}

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Whole rupees in Indian grouping: 189899 → "₹1,89,899". */
export function formatInr(rupees: number): string {
  return INR.format(rupees);
}

/** "₹4,699" */
export function formatPlanPrice(plan: PaidPlanId): string {
  return formatInr(PAID_PLANS[plan].amount / 100);
}
