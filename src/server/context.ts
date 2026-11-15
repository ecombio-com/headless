// Next.js glue: builds the per-request context the loaders and actions receive.
// Everything Shopify-specific lives in ~/core; this file only wires env, cookies and caching.
import 'server-only';
import {headers} from 'next/headers';
import {unstable_cache} from 'next/cache';
import {createStorefront, type CachedFetch} from '~/core/shopify/storefront';
import {createCart} from '~/core/shopify/cart';
import {getLocaleFromRequest} from '~/core/config/i18n';
import {getStorefrontConfig} from '~/core/config/storefronts';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {createYotpoClient} from '~/@yotpo/client.server';
import {createAlgoliaDeps} from '~/@algolia/client.server';
import {AppSession, readCookie} from './session';
import {createBetterAuthCustomerAccount} from './auth/customer-account';

export type Env = Record<string, string | undefined> & {
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  SESSION_SECRET: string;
};

export function getEnv(): Env {
  return process.env as unknown as Env;
}

// Storefront reads go through the Next.js data cache, keyed by the request body.
const nextCachedFetch: CachedFetch = async (url, init, cache) => {
  if (!cache.maxAge) return fetch(url, {...init, cache: 'no-store'});
  const load = unstable_cache(
    async () => {
      const res = await fetch(url, {...init, cache: 'no-store'});
      const body = await res.text();
      if (!res.ok) throw new Error(`Storefront API ${res.status}: ${body.slice(0, 200)}`);
      return body;
    },
    ['storefront', url, String(init.body)],
    {revalidate: cache.maxAge + (cache.staleWhileRevalidate ?? 0), tags: cache.tags},
  );
  return new Response(await load(), {status: 200, headers: {'Content-Type': 'application/json'}});
};

const CART_COOKIE = 'cart';

export function createAppContext(request: Request) {
  const env = getEnv();
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET environment variable is not set');
  const cookieHeader = request.headers.get('cookie');
  const i18n = getLocaleFromRequest(request);
  const session = AppSession.init(cookieHeader, env.SESSION_SECRET);
  const pendingCookies: string[] = [];

  const storefront = createStorefront({
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    publicToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    buyerIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    i18n: {country: i18n.country, language: i18n.language},
    cachedFetch: nextCachedFetch,
  });

  let cartToken = readCookie(cookieHeader, CART_COOKIE);
  const cart = createCart<CartApiQueryFragment>({
    storefront,
    fragment: CART_QUERY_FRAGMENT,
    cartId: {
      get: () => (cartToken ? `gid://shopify/Cart/${cartToken}` : undefined),
      set: (id: string) => {
        cartToken = id.split('/').pop();
        const h = new Headers();
        const cookie = `${CART_COOKIE}=${cartToken}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`;
        h.append('Set-Cookie', cookie);
        return h;
      },
    },
  });

  const noCache = undefined as unknown as Cache;
  const waitUntil = (p: Promise<unknown>) => void p.catch((e) => console.error(e));
  const yotpo = createYotpoClient({env, cache: noCache, waitUntil, request});
  void noCache;
  const algolia = createAlgoliaDeps({env, request} as never);
  // P1.4: Better Auth + Admin API (old Customer Account API client stays in customer-account.ts until P1.4.8).
  const customerAccount = createBetterAuthCustomerAccount({env, request});

  return {
    env,
    request,
    storefront,
    cart,
    session,
    yotpo,
    algolia,
    customerAccount,
    waitUntil,
    storefrontConfig: getStorefrontConfig(env.PUBLIC_STOREFRONT_ID),
    /** Extra Set-Cookie values a route wants sent. */
    pendingCookies,
  };
}

export type AppContext = ReturnType<typeof createAppContext>;

/** Rebuilds the incoming Request inside a Server Component (proxy.ts forwards the URL). */
export async function getServerRequest(): Promise<Request> {
  const h = await headers();
  const url = h.get('x-url') ?? `http://${h.get('host') ?? 'localhost'}/`;
  return new Request(url, {headers: h});
}
