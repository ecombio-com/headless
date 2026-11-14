// Runs before every request (Next.js 16 "proxy", formerly middleware). Was server.ts on Oxygen.
import {NextResponse, type NextRequest} from 'next/server';
import {localeRedirect} from '~/core/config/i18n';

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
