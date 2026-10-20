import { NextResponse, type NextRequest } from 'next/server';
import { handlers } from '@/lib/auth';
import { providerErrorRedirect } from '@/lib/oauth-callback-error';

export async function GET(request: NextRequest) {
  // A provider refusal must not reach Auth.js, which would show it as a server error.
  const to = providerErrorRedirect(new URL(request.url));
  if (to) return NextResponse.redirect(new URL(to, request.url));
  return handlers.GET(request);
}

export const { POST } = handlers;
