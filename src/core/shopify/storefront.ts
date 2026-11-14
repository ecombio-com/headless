// Storefront API client. Framework-free: no Next.js or React imports.
// Same call shape as Hydrogen's `storefront.query(QUERY, {variables, cache})`, so the
// ported loaders work unchanged. Caching is a plain description; the host decides how to apply it.

export const STOREFRONT_API_VERSION = '2026-04';

export type CachingStrategy = {
  /** Seconds the response stays fresh. 0 = never cache. */
  maxAge: number;
  /** Extra seconds a stale response may be served while it refreshes. */
  staleWhileRevalidate?: number;
  /** Cache tags, so a webhook can purge them. */
  tags?: string[];
};

export const CacheNone = (): CachingStrategy => ({maxAge: 0});
export const CacheShort = (o: Partial<CachingStrategy> = {}): CachingStrategy => ({maxAge: 1, staleWhileRevalidate: 9, ...o});
export const CacheLong = (o: Partial<CachingStrategy> = {}): CachingStrategy => ({maxAge: 3600, staleWhileRevalidate: 82800, ...o});
export const CacheCustom = (o: CachingStrategy & {mode?: string}): CachingStrategy => ({
  maxAge: o.maxAge,
  staleWhileRevalidate: o.staleWhileRevalidate,
  tags: o.tags,
});

export type I18n = {country: string; language: string};

/** How the host performs a fetch with a caching strategy (Next.js: fetch's `next.revalidate`). */
export type CachedFetch = (url: string, init: RequestInit, cache: CachingStrategy) => Promise<Response>;

export type StorefrontOptions = {
  storeDomain: string;
  publicToken?: string;
  privateToken?: string;
  i18n: I18n;
  buyerIp?: string | null;
  cachedFetch?: CachedFetch;
  apiVersion?: string;
};

type Ops = {return: unknown; variables: unknown};
declare global {
  // Filled by storefrontapi.generated.d.ts (codegen).
  interface StorefrontQueries {}
  interface StorefrontMutations {}
}
type IsAny<T> = 0 extends 1 & T ? true : false;
type Result<Map, Q extends string, R> = IsAny<R> extends true
  ? Q extends keyof Map
    ? Map[Q] extends Ops
      ? Map[Q]['return']
      : any
    : any
  : R;

export type QueryOptions = {
  variables?: Record<string, unknown>;
  cache?: CachingStrategy;
  displayName?: string;
};

export class StorefrontError extends Error {
  constructor(
    message: string,
    public errors: unknown[] = [],
    public status = 500,
  ) {
    super(message);
    this.name = 'StorefrontError';
  }
}

export type Storefront = ReturnType<typeof createStorefront>;

const defaultFetch: CachedFetch = (url, init) => fetch(url, init);

export function createStorefront(options: StorefrontOptions) {
  const {storeDomain, publicToken, privateToken, i18n, buyerIp, cachedFetch = defaultFetch} = options;
  const version = options.apiVersion ?? STOREFRONT_API_VERSION;
  const domain = storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const endpoint = `https://${domain}/api/${version}/graphql.json`;

  function headers(): Record<string, string> {
    const h: Record<string, string> = {'Content-Type': 'application/json', Accept: 'application/json'};
    if (privateToken) {
      h['Shopify-Storefront-Private-Token'] = privateToken;
      if (buyerIp) h['Shopify-Storefront-Buyer-IP'] = buyerIp;
    } else if (publicToken) {
      h['X-Shopify-Storefront-Access-Token'] = publicToken;
    }
    return h;
  }

  // Hydrogen fills $country/$language automatically when a query declares them.
  function withI18n(query: string, variables: Record<string, unknown> = {}) {
    const v = {...variables};
    if (/\$country\b/.test(query) && v.country === undefined) v.country = i18n.country;
    if (/\$language\b/.test(query) && v.language === undefined) v.language = i18n.language;
    return v;
  }

  async function request<T>(query: string, opts: QueryOptions, isMutation: boolean): Promise<T> {
    const cache = isMutation ? CacheNone() : (opts.cache ?? CacheShort());
    const body = JSON.stringify({query: query.replace(/^#graphql\s*/, ''), variables: withI18n(query, opts.variables)});
    const res = await cachedFetch(endpoint, {method: 'POST', headers: headers(), body}, cache);
    const text = await res.text();
    let json: {data?: T; errors?: {message: string}[]};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new StorefrontError(`Storefront API ${res.status}: ${text.slice(0, 200)}`, [], res.status);
    }
    if (json.errors?.length) {
      throw new StorefrontError(json.errors.map((e) => e.message).join('; '), json.errors, res.status);
    }
    return json.data as T;
  }

  return {
    i18n,
    endpoint,
    CacheNone,
    CacheShort,
    CacheLong,
    CacheCustom,
    query<R = any, Q extends string = string>(query: Q, opts: QueryOptions = {}) {
      return request<Result<StorefrontQueries, Q, R>>(query, opts, false);
    },
    mutate<R = any, Q extends string = string>(query: Q, opts: QueryOptions = {}) {
      return request<Result<StorefrontMutations, Q, R>>(query, opts, true);
    },
  };
}
