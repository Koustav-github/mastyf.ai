import { NextResponse } from 'next/server';
import { getAccount } from '@/lib/account';
import { safeAuth } from '@/lib/safe-auth';

export const dynamic = 'force-dynamic';

// Per-user data: never cache it in the browser or a CDN.
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** The signed-in user's account (session cookie). API-key clients use /api/v1/* instead. */
export async function GET() {
  const session = await safeAuth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: NO_STORE });
  }

  try {
    const account = await getAccount(userId);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ account }, { headers: NO_STORE });
  } catch (error) {
    console.error('[api/me] could not read the account', error);
    return NextResponse.json(
      { error: 'Account data is unavailable right now. Try again shortly.' },
      { status: 503, headers: NO_STORE },
    );
  }
}
