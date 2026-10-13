import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { isAuthConfigured } from '@/lib/auth-secret';
import { checkPublicApiRateLimit } from '@/lib/rate-limit';

const RATE_LIMITED_PREFIXES = [
  '/api/v1/badge/',
  '/api/v1/deep-scan/',
  '/api/v1/reports/',
  '/api/v1/certifications',
] as const;

function isRateLimitedPath(path: string): boolean {
  return RATE_LIMITED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function rateLimited(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  if (!isRateLimitedPath(path)) return null;

  const result = await checkPublicApiRateLimit(request, path);
  if (result.success) return null;
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfter) },
    },
  );
}

function isDashboard(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/');
}

// With a signing secret: signed-out visitors to the dashboard go to /login and come back
// to where they were afterwards. This check has to live here: when middleware passes its
// own handler, Auth.js does not act on the `authorized` callback's result.
const withAuth = auth(async (request) => {
  const limited = await rateLimited(request);
  if (limited) return limited;

  if (isDashboard(request.nextUrl.pathname) && !request.auth?.user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

// Without one, Auth.js can neither issue nor read tokens. Keep the public APIs working
// and the dashboard closed, rather than failing every matched request.
async function withoutAuth(request: NextRequest) {
  const limited = await rateLimited(request);
  if (limited) return limited;

  if (isDashboard(request.nextUrl.pathname)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('error', 'Configuration');
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export default isAuthConfigured() ? withAuth : withoutAuth;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/v1/badge/:path*',
    '/api/v1/deep-scan/:path*',
    '/api/v1/deep-scan/jobs/:path*',
    '/api/v1/reports/:path*',
    '/api/v1/certifications',
    '/api/v1/certifications/:path*',
  ],
};
