// Server-side stand-ins for the @shopify/hydrogen APIs the ported code still imports.
// Temporary seam: new code should import from ~/core directly.
import 'server-only';
import {unstable_cache} from 'next/cache';
import type {CachingStrategy} from '~/core/shopify/storefront';

export type {Storefront, I18n as I18nBase} from '~/core/shopify/storefront';
export {CacheCustom, CacheLong, CacheShort, CacheNone} from '~/core/shopify/storefront';

type RunOptions<T> = {
  cacheKey: unknown[];
  cacheStrategy: CachingStrategy;
  shouldCacheResult?: (value: T) => boolean;
};
type FetchOptions<T> = {
  cacheKey: unknown[];
  cacheStrategy: CachingStrategy;
  shouldCacheResponse?: (body: T, res: Response) => boolean;
};

const keyOf = (parts: unknown[]) => parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p)));

// Hydrogen's createWithCache, backed by the Next.js data cache.
// Errors are never cached: a throwing fn rejects and unstable_cache stores nothing.
export function createWithCache(_args?: unknown) {
  return {
    async run<T>(opts: RunOptions<T>, fn: () => Promise<T>): Promise<T> {
      if (!opts.cacheStrategy.maxAge) return fn();
      const cached = unstable_cache(fn, keyOf(opts.cacheKey), {
        revalidate: opts.cacheStrategy.maxAge + (opts.cacheStrategy.staleWhileRevalidate ?? 0),
        tags: opts.cacheStrategy.tags,
      });
      return cached();
    },
    async fetch<T>(url: string, init: RequestInit, opts: FetchOptions<T>): Promise<{data: T; response: Response}> {
      const load = async () => {
        const res = await fetch(url, {...init, cache: 'no-store'});
        const text = await res.text();
        let data: T;
        try {
          data = JSON.parse(text) as T;
        } catch {
          data = text as unknown as T;
        }
        const keep = opts.shouldCacheResponse ? opts.shouldCacheResponse(data, res) : res.ok;
        if (!keep) throw Object.assign(new Error('uncacheable'), {payload: {data, status: res.status}});
        return {data, status: res.status};
      };
      try {
        const result = opts.cacheStrategy.maxAge
          ? await unstable_cache(load, ['withCache.fetch', url, ...keyOf(opts.cacheKey)], {
              revalidate: opts.cacheStrategy.maxAge + (opts.cacheStrategy.staleWhileRevalidate ?? 0),
            })()
          : await load();
        return {data: result.data, response: new Response(null, {status: result.status})};
      } catch (error) {
        const payload = (error as {payload?: {data: T; status: number}}).payload;
        if (payload) return {data: payload.data, response: new Response(null, {status: payload.status})};
        throw error;
      }
    },
  };
}

export {getPaginationVariables} from '~/core/shopify/pagination';

export function flattenConnection<T>(connection?: {nodes?: T[]; edges?: {node: T}[]} | null): T[] {
  if (!connection) return [];
  if (connection.nodes) return connection.nodes;
  return (connection.edges ?? []).map((e) => e.node);
}

type Seo = {title?: string | null; description?: string | null; url?: string | null; titleTemplate?: string | null};
export function getSeoMeta(...seos: (Seo | null | undefined)[]) {
  const seo = Object.assign({}, ...seos.filter(Boolean)) as Seo;
  const title = seo.titleTemplate && seo.title ? seo.titleTemplate.replace('%s', seo.title) : seo.title;
  return [
    ...(title ? [{title}] : []),
    ...(seo.description ? [{name: 'description', content: seo.description}] : []),
    ...(seo.url ? [{tagName: 'link', rel: 'canonical', href: seo.url}] : []),
  ];
}

export {getSelectedProductOptions} from '~/core/shopify/product-options';

export {CART_ACTIONS} from '~/core/shopify/cart-form';
import {CART_ACTIONS, getCartFormInput} from '~/core/shopify/cart-form';
/** Server half of CartForm: the action names and the form parser. */
export const CartForm = {ACTIONS: CART_ACTIONS, getFormInput: getCartFormInput};
export type CartQueryDataReturn = {cart: any; errors?: any; userErrors?: any; warnings?: any};

/* ------------------------------------------------------------------ sitemaps */
import type {Storefront} from '~/core/shopify/storefront';

const SITEMAP_TYPES = {
  products: 'PRODUCT',
  pages: 'PAGE',
  collections: 'COLLECTION',
  blogs: 'BLOG',
  articles: 'ARTICLE',
  metaObjects: 'METAOBJECT',
} as const;
type SitemapType = keyof typeof SITEMAP_TYPES;

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xmlHeaders = {'Content-Type': 'application/xml', 'Cache-Control': `max-age=${60 * 60 * 24}`};

export async function getSitemapIndex({storefront, request, types = Object.keys(SITEMAP_TYPES) as SitemapType[]}: {storefront: Storefront; request: Request; types?: SitemapType[]}) {
  const base = new URL(request.url).origin;
  const counts = await Promise.all(
    types.map(async (t) => {
      const data = (await storefront.query(
        `#graphql
        query SitemapIndex($type: SitemapType!) { sitemap(type: $type) { pagesCount { count } } }`,
        {variables: {type: SITEMAP_TYPES[t]}, cache: storefront.CacheLong()},
      )) as {sitemap?: {pagesCount?: {count: number}}};
      return {t, count: data?.sitemap?.pagesCount?.count ?? 0};
    }),
  );
  const entries = counts.flatMap(({t, count}) =>
    Array.from({length: count}, (_, i) => `<sitemap><loc>${xmlEscape(`${base}/sitemap/${t}/${i + 1}.xml`)}</loc></sitemap>`),
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</sitemapindex>`,
    {headers: xmlHeaders},
  );
}

export async function getSitemap({
  storefront,
  request,
  params,
  getLink,
}: {
  storefront: Storefront;
  request: Request;
  params: Record<string, string | undefined>;
  locales?: string[];
  getLink: (a: {type: string; baseUrl: string; handle: string; locale?: string}) => string;
}) {
  const type = params.type as SitemapType;
  const page = Number(String(params.page ?? '1').replace(/\.xml$/, ''));
  if (!(type in SITEMAP_TYPES) || !Number.isFinite(page)) return new Response('Not found', {status: 404});
  const data = (await storefront.query(
    `#graphql
    query SitemapPage($type: SitemapType!, $page: Int!) {
      sitemap(type: $type) { resources(page: $page) { items { handle updatedAt } } }
    }`,
    {variables: {type: SITEMAP_TYPES[type], page}, cache: storefront.CacheLong()},
  )) as {sitemap?: {resources?: {items: {handle: string; updatedAt?: string}[]}}};
  const baseUrl = new URL(request.url).origin;
  const items = data?.sitemap?.resources?.items ?? [];
  if (!items.length) return new Response('Not found', {status: 404});
  const urls = items.map(
    (i) =>
      `<url><loc>${xmlEscape(getLink({type, baseUrl, handle: i.handle}))}</loc>${i.updatedAt ? `<lastmod>${i.updatedAt}</lastmod>` : ''}</url>`,
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    {headers: xmlHeaders},
  );
}
