'use server';

import { rotateIssuedLicenseKey } from '@/lib/billing/license-keys';
import { safeAuth } from '@/lib/safe-auth';

export type NewLicenseKeyResult = { licenseKey: string } | { error: string };

/** Replaces the signed-in user's license key; the old one stops working. */
export async function newLicenseKeyAction(): Promise<NewLicenseKeyResult> {
  const session = await safeAuth();
  const email = session?.user?.email;
  if (!email) return { error: 'Sign in again to manage your license key.' };
  try {
    const result = await rotateIssuedLicenseKey(email);
    return result ? { licenseKey: result.licenseKey } : { error: 'You have no license key yet. Buy a plan to get one.' };
  } catch (error) {
    console.error('[license] could not replace a license key', error);
    return { error: 'Could not create a new key. Try again shortly.' };
  }
}
