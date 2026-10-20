import { NextResponse } from 'next/server';
import { blockedByHigherPlan, currentLicense, recordOrder } from '@/lib/billing/fulfillment';
import { isPaidPlanId, PAID_PLANS } from '@/lib/billing/plans';
import { getUserOrg, userCanManageOrg } from '@/lib/org-context';
import { createRazorpayOrder, RazorpayApiError, razorpayCredentials } from '@/lib/razorpay';
import { safeAuth } from '@/lib/safe-auth';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * POST /api/billing/create-order { plan } — starts a Razorpay Standard Checkout for the signed-in
 * user's workspace. The price comes from PAID_PLANS, never from the request.
 */
export async function POST(request: Request) {
  const session = await safeAuth();
  const userId = session?.user?.id;
  if (!userId) return fail('Sign in to buy a plan.', 401);

  const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
  if (!isPaidPlanId(body?.plan)) return fail('Choose a plan: developer or team.', 400);
  const planId = body.plan;
  const plan = PAID_PLANS[planId];

  const credentials = razorpayCredentials();
  if (!credentials) {
    console.error('[billing] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set');
    return fail('Payments are not available on this deployment right now.', 503);
  }

  try {
    const ctx = await getUserOrg(userId);
    if (!ctx) return fail('Your workspace is still being set up. Open the dashboard, then try again.', 409);
    if (!userCanManageOrg(ctx.membership)) return fail('Only a workspace owner or admin can buy a plan.', 403);
    if (blockedByHigherPlan(await currentLicense(ctx.org.id), plan.tier)) {
      return fail('Your workspace is on a higher plan that is still active.', 409);
    }

    const order = await createRazorpayOrder(credentials, {
      amount: plan.amount,
      currency: plan.currency,
      receipt: `${planId}_${ctx.org.id}`,
      notes: { org_id: ctx.org.id, user_id: userId, plan: planId },
    });
    await recordOrder({
      id: order.id,
      userId,
      orgId: ctx.org.id,
      plan: planId,
      amount: order.amount,
      currency: order.currency,
    });

    return NextResponse.json(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        // The key id is public (Checkout needs it in the browser); the secret stays here.
        keyId: credentials.keyId,
        plan: { id: planId, name: plan.name },
        prefill: { name: session.user.name ?? '', email: session.user.email ?? '' },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof RazorpayApiError && error.status === 401) {
      console.error('[billing] Razorpay rejected the API keys', error.message);
    } else {
      console.error('[billing] could not create a Razorpay order', error);
    }
    return fail('Could not start the payment. Try again shortly.', 500);
  }
}
