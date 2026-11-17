// Runs before every request (Next.js 16 "proxy", formerly middleware). Was server.ts on Oxygen.
import {NextResponse, type NextRequest} from 'next/server';
import {localeRedirect} from '~/core/config/i18n';

const HOOKS_HOST = 'hooks.ecombio.com';
const HOOKS_ALLOWED_PREFIXES = ['/api/webhooks', '/api/revalidate-menus', '/api/revalidate-product', '/api/cron', '/api/yotpo/webhook'];

export const BRAND_BY_HOST: Record<string, string> = {
  'ecombio.com': 'ecombio',
  'www.ecombio.com': 'ecombio',
  'bicyclebio.com': 'bicyclebio',
  'www.bicyclebio.com': 'bicyclebio',
  'scooterbio.com': 'scooterbio',
  'www.scooterbio.com': 'scooterbio',
  'skaterbio.com': 'skaterbio',
  'www.skaterbio.com': 'skaterbio',
};

function brandFromHostname(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  const normalized = hostname.toLowerCase().replace(/:\d+$/, '');
  return BRAND_BY_HOST[normalized] ?? null;
}

function rewriteToBrandPath(request: NextRequest, brand: string): NextResponse {
  const nextUrl = request.nextUrl.clone();
  const {pathname} = nextUrl;

  const payload = pathname === `/${brand}` ? '/' : pathname.startsWith(`/${brand}/`) ? pathname.slice(brand.length + 1) || '/' : pathname;
  nextUrl.pathname = `/${brand}${payload === '/' ? '' : payload}`;

  const headers = new Headers(request.headers);
  headers.set('x-url', request.url);
  return NextResponse.rewrite(nextUrl, {request: {headers}});
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const {pathname} = url;
  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase() ?? url.hostname.toLowerCase();
  const onHooksHost = hostname === HOOKS_HOST;
  const brand = brandFromHostname(hostname);

  // The hooks host serves only webhook paths, never the store.
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

  if (!onHooksHost && !pathname.startsWith('/api/') && brand) {
    const nextPath = pathname === `/${brand}` ? '/' : pathname.startsWith(`/${brand}/`) ? pathname.slice(brand.length + 1) || '/' : pathname;
    const normalized = `/${brand}${nextPath === '/' ? '' : nextPath}`;
    const target = url.clone();
    target.pathname = normalized;
    return NextResponse.rewrite(target, {request: {headers}});
  }

  return NextResponse.next({request: {headers}});
}

export const config = {
  matcher: ['/((?!_next/|favicon.svg|.*\\.[a-z0-9]+$).*)'],
};
