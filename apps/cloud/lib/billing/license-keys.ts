import { randomBytes, randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { cloudDbAvailable, getDb } from '../db';
import { commercialCustomers, commercialEntitlements } from '../db/schema';
import type { LemonLicenseActivateResult } from '../lemon-license-client';
import { hashProLicenseKey } from '../pro-license-keys';

/**
 * License keys we issue when a Razorpay payment succeeds. Shield and the gateway send the key
 * to /api/v1/activate and /api/v1/license/renew exactly as they did with Lemon Squeezy keys;
 * those routes ask this module first and only fall back to Lemon Squeezy for keys it doesn't
 * know. Only a hash of each key is stored, so a key is shown once and replaced, not recovered.
 */

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Entitlement = typeof commercialEntitlements.$inferSelect;

export const ISSUED_SOURCE = 'razorpay';

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no 0/O or 1/I

const KEY_GROUPS = 7;

/** MG- and seven groups of four symbols: 28 × 5 = 140 random bits, beyond guessing at /api/v1/activate. */
export function generateLicenseKey(): string {
  const chars = Array.from(randomBytes(KEY_GROUPS * 4), (b) => KEY_ALPHABET[b & 31]);
  const groups = Array.from({ length: KEY_GROUPS }, (_, i) => chars.slice(i * 4, i * 4 + 4).join(''));
  return `MG-${groups.join('-')}`;
}

export function licenseKeyPreview(licenseKey: string): string {
  return `MG-****-${licenseKey.slice(-4).toUpperCase()}`;
}

/** Paid up. Lemon Squeezy keys have no expiry here (Lemon tracks it), so only their status counts. */
export function entitlementActive(e: Pick<Entitlement, 'status' | 'expiresAt'>, now = new Date()): boolean {
  return e.status === 'active' && (!e.expiresAt || e.expiresAt.getTime() > now.getTime());
}

async function issuedEntitlementForEmail(tx: Pick<Tx, 'query'>, email: string): Promise<Entitlement | null> {
  const customer = await tx.query.commercialCustomers.findFirst({
    where: eq(commercialCustomers.email, email.toLowerCase()),
  });
  if (!customer) return null;
  return (
    (await tx.query.commercialEntitlements.findFirst({
      where: and(
        eq(commercialEntitlements.customerId, customer.id),
        eq(commercialEntitlements.source, ISSUED_SOURCE),
      ),
    })) ?? null
  );
}

/**
 * Keeps the buyer's key paid through `paidThrough`: creates the key on their first purchase,
 * otherwise extends the one they have. Returns the plaintext only when it was just created.
 */
export async function extendIssuedEntitlement(
  tx: Tx,
  email: string,
  paidThrough: Date,
): Promise<{ licenseKey: string | null; expiresAt: Date }> {
  const normalized = email.toLowerCase();
  const existing = await issuedEntitlementForEmail(tx, normalized);
  if (existing) {
    const expiresAt =
      existing.expiresAt && existing.expiresAt.getTime() > paidThrough.getTime() ? existing.expiresAt : paidThrough;
    await tx
      .update(commercialEntitlements)
      .set({ expiresAt, status: 'active', updatedAt: new Date() })
      .where(eq(commercialEntitlements.id, existing.id));
    return { licenseKey: null, expiresAt };
  }

  let customer = await tx.query.commercialCustomers.findFirst({
    where: eq(commercialCustomers.email, normalized),
  });
  if (!customer) {
    [customer] = await tx
      .insert(commercialCustomers)
      .values({ id: `cst_${randomUUID().replace(/-/g, '')}`, email: normalized })
      .returning();
  }

  const licenseKey = generateLicenseKey();
  await tx.insert(commercialEntitlements).values({
    id: `ent_${randomUUID().replace(/-/g, '')}`,
    customerId: customer.id,
    licenseKeyHash: hashProLicenseKey(licenseKey),
    licenseKeyPreview: licenseKeyPreview(licenseKey),
    source: ISSUED_SOURCE,
    status: 'active',
    expiresAt: paidThrough,
  });
  return { licenseKey, expiresAt: paidThrough };
}

/**
 * Replaces the user's key, for one that was lost, leaked, or never shown (a webhook fulfilled
 * the order after the buyer closed the tab). The old key stops working immediately.
 */
export async function rotateIssuedLicenseKey(
  email: string,
): Promise<{ licenseKey: string; expiresAt: Date | null } | null> {
  return getDb().transaction(async (tx) => {
    const entitlement = await issuedEntitlementForEmail(tx, email);
    if (!entitlement) return null;
    const licenseKey = generateLicenseKey();
    await tx
      .update(commercialEntitlements)
      .set({
        licenseKeyHash: hashProLicenseKey(licenseKey),
        licenseKeyPreview: licenseKeyPreview(licenseKey),
        updatedAt: new Date(),
      })
      .where(eq(commercialEntitlements.id, entitlement.id));
    return { licenseKey, expiresAt: entitlement.expiresAt };
  });
}

export type IssuedLicenseSummary = { preview: string | null; expiresAt: Date | null; active: boolean };

/** The user's issued key as the dashboard shows it (preview only). */
export async function issuedLicenseSummary(email: string): Promise<IssuedLicenseSummary | null> {
  const entitlement = await issuedEntitlementForEmail(getDb(), email);
  if (!entitlement) return null;
  return {
    preview: entitlement.licenseKeyPreview,
    expiresAt: entitlement.expiresAt,
    active: entitlementActive(entitlement),
  };
}

/**
 * The issued entitlement behind a key, or null when the key isn't one of ours. A database error
 * also gives null (logged), so Lemon Squeezy keys keep working while the database is down.
 */
export async function findIssuedEntitlement(licenseKey: string): Promise<Entitlement | null> {
  if (!cloudDbAvailable()) return null;
  try {
    return (
      (await getDb().query.commercialEntitlements.findFirst({
        where: and(
          eq(commercialEntitlements.licenseKeyHash, hashProLicenseKey(licenseKey)),
          eq(commercialEntitlements.source, ISSUED_SOURCE),
        ),
      })) ?? null
    );
  } catch (error) {
    console.warn('[license] issued-key lookup failed; falling back to Lemon Squeezy', error);
    return null;
  }
}

/**
 * /api/v1/activate for a key we issued, in the Lemon Squeezy result shape the route already
 * handles. Null means the key isn't ours (try Lemon Squeezy).
 */
export async function issuedLicenseActivation(licenseKey: string): Promise<LemonLicenseActivateResult | null> {
  const entitlement = await findIssuedEntitlement(licenseKey);
  if (!entitlement) return null;
  const expiresAt = entitlement.expiresAt?.toISOString() ?? null;
  if (!entitlementActive(entitlement)) {
    return {
      valid: false,
      status: 'expired',
      message: 'This license key is no longer paid up. Renew your plan from the Mastyf dashboard.',
      expiresAt,
    };
  }
  const customer = await getDb().query.commercialCustomers.findFirst({
    where: eq(commercialCustomers.id, entitlement.customerId),
  });
  return {
    valid: true,
    status: 'active',
    message: 'License key is active',
    licenseKeyId: entitlement.id,
    customerEmail: customer?.email,
    expiresAt,
  };
}
