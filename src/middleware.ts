// Runs before every request (Next.js 16 "proxy", formerly middleware). Was server.ts on Oxygen.
import {NextResponse, type NextRequest} from 'next/server';
import {DEFAULT_LOCALE, localeRedirect} from '~/core/config/i18n';
import {isAuthHost} from '~/server/auth/hosts';

const HOOKS_HOST = 'hooks.ecombio.com';
const HOOKS_ALLOWED_PREFIXES = ['/api/webhooks', '/api/revalidate-menus', '/api/revalidate-product', '/api/cron', '/api/yotpo/webhook'];

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const {pathname} = url;

  // The hooks host serves only webhook paths, never the store.
  const onHooksHost = request.headers.get('host')?.split(':')[0].toLowerCase() === HOOKS_HOST;
  if (onHooksHost && !HOOKS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return new NextResponse('Not Found', {status: 404, headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'}});
  }

  // auth.<brand>.com serves only sign-in (P1.4): the API, plus every other path shows the sign-in page.
  const host = request.headers.get('host')?.split(':')[0].toLowerCase() ?? '';
  if (isAuthHost(host) && !pathname.startsWith('/api/auth')) {
    const target = new URL(`/${DEFAULT_LOCALE}/sign-in${url.search}`, request.url);
    const headers = new Headers(request.headers);
    headers.set('x-url', request.url);
    return NextResponse.rewrite(target, {request: {headers}});
  }

  if (!onHooksHost && !pathname.startsWith('/api/')) {
    const redirect = localeRedirect(new Request(request.url, {method: request.method}));
    if (redirect) return NextResponse.redirect(new URL(redirect.headers.get('Location')!, request.url), 308);
  }

  // Author URLs are lowercase.
  const author = pathname.match(/^(\/[a-z]{2}-[a-z]{2})?\/blogs\/author\/([^/]+)\/?$/);
  if (author && author[2] !== author[2].toLowerCase()) {
    return NextResponse.redirect(new URL(`${author[1] ?? ''}/blogs/author/${author[2].toLowerCase()}${url.search}`, request.url), 308);
  }

  // Server Components can't see the URL: forward it.
  const headers = new Headers(request.headers);
  headers.set('x-url', request.url);
  return NextResponse.next({request: {headers}});
}

export const config = {
  matcher: ['/((?!_next/|favicon.svg|.*\\.[a-z0-9]+$).*)'],
};
