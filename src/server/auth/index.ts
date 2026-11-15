// Customer sign-in with Better Auth on Cloudflare D1: email + password only (specs/001-customer-sign-in).
// One D1 database per brand (binding AUTH_DB); sign-in UI on auth.<brand>.com.
import 'server-only';
import {betterAuth} from 'better-auth';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {getAuthHosts} from './hosts';

type AuthEnv = {AUTH_DB?: unknown; BETTER_AUTH_SECRET?: string};

function build(requestUrl: string) {
  const {env} = getCloudflareContext() as unknown as {env: AuthEnv};
  if (!env.AUTH_DB) throw new Error('AUTH_DB (D1) binding is not configured');
  const secret = env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');

  const hosts = getAuthHosts(requestUrl);

  return betterAuth({
    baseURL: hosts.authOrigin,
    basePath: '/api/auth',
    secret,
    database: env.AUTH_DB as never,
    trustedOrigins: hosts.trustedOrigins,
    emailAndPassword: {enabled: true},
    user: {additionalFields: {shopifyCustomerId: {type: 'string', required: false, input: false}}},
  });
}

// Bindings are fixed per isolate, so one instance per host is enough.
const cache = new Map<string, ReturnType<typeof build>>();

export function getAuth(requestUrl: string) {
  const host = new URL(requestUrl).host;
  let auth = cache.get(host);
  if (!auth) {
    auth = build(requestUrl);
    cache.set(host, auth);
  }
  return auth;
}

export type Auth = ReturnType<typeof getAuth>;
