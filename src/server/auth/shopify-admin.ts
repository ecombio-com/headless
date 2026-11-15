// Admin API client for account pages (ECOMBIOv2 app, client credentials). P1.4.6.
// Needs app scopes: read_customers, write_customers, read_orders.
import 'server-only';
import {VERSIONS} from '~/lib/versions';

type Env = Record<string, string | undefined>;
type Token = {value: string; expiresAt: number};

const tokens = new Map<string, Token>();

/** Parses JSON; on an HTML/error page, throws a readable error with status and URL (never secrets). */
async function readJson<T>(res: Response, what: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const hint = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(`${what}: HTTP ${res.status} from ${new URL(res.url).host}${new URL(res.url).pathname} (not JSON): ${hint}`);
  }
}

async function token(env: Env): Promise<string> {
  const shop = env.PUBLIC_STORE_DOMAIN ?? '';
  if (!shop || !env.SHOPIFY_ADMIN_CLIENT_ID || !env.SHOPIFY_ADMIN_CLIENT_SECRET) {
    throw new Error('Admin API: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_CLIENT_ID or SHOPIFY_ADMIN_CLIENT_SECRET is not set');
  }
  const cached = tokens.get(shop);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_ADMIN_CLIENT_ID ?? '',
      client_secret: env.SHOPIFY_ADMIN_CLIENT_SECRET ?? '',
    }),
  });
  const json = await readJson<{access_token?: string; expires_in?: number; error?: string; error_description?: string}>(res, 'Admin token');
  if (!json.access_token) throw new Error(`Admin token failed: ${json.error_description ?? json.error ?? res.status}`);
  // Refresh 5 minutes early; default to 1 hour if Shopify omits expires_in.
  tokens.set(shop, {value: json.access_token, expiresAt: Date.now() + ((json.expires_in ?? 3600) - 300) * 1000});
  return json.access_token;
}

export async function adminGraphql<T = any>(env: Env, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/${VERSIONS.shopifyAdmin}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': await token(env)},
    body: JSON.stringify({query, variables}),
  });
  const json = await readJson<{data?: T; errors?: {message: string}[] | string}>(res, 'Admin API');
  if (json.errors) {
    const msg = typeof json.errors === 'string' ? json.errors : json.errors.map((e) => e.message).join('; ');
    throw new Error(`Admin API: ${msg}`);
  }
  return json.data as T;
}
