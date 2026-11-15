// Customer sign-in with Better Auth on Cloudflare D1 (P1.4, specs/001-customer-sign-in).
// One D1 database per brand (binding AUTH_DB); sign-in UI on auth.<brand>.com.
import 'server-only';
import {betterAuth} from 'better-auth';
import {emailOTP} from 'better-auth/plugins/email-otp';
import {nextCookies} from 'better-auth/next-js';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {getStorefrontConfig} from '~/core/config/storefronts';
import {getAuthHosts} from './hosts';
import {sendSignInCode} from './email';

type AuthEnv = {
  AUTH_DB?: unknown;
  BREVO_API_KEY?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

function build(requestUrl: string) {
  const {env} = getCloudflareContext() as unknown as {env: AuthEnv};
  if (!env.AUTH_DB) throw new Error('AUTH_DB (D1) binding is not configured');
  const secret = env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
  const googleId = env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const googleSecret = env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

  const hosts = getAuthHosts(requestUrl);
  const {name: brandName} = getStorefrontConfig(process.env.PUBLIC_STOREFRONT_ID);
  const secure = hosts.authOrigin.startsWith('https://');

  return betterAuth({
    appName: brandName,
    baseURL: hosts.authOrigin,
    basePath: '/api/auth',
    secret,
    database: env.AUTH_DB as never,
    trustedOrigins: hosts.trustedOrigins,
    emailAndPassword: {enabled: false},
    socialProviders:
      googleId && googleSecret
        ? {google: {clientId: googleId, clientSecret: googleSecret, prompt: 'select_account'}}
        : {},
    account: {accountLinking: {enabled: true, trustedProviders: ['google', 'email-otp']}},
    user: {additionalFields: {shopifyCustomerId: {type: 'string', required: false, input: false}}},
    session: {expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24},
    rateLimit: {
      enabled: true,
      storage: 'database',
      customRules: {'/email-otp/send-verification-otp': {window: 600, max: 5}},
    },
    advanced: {
      useSecureCookies: secure,
      ...(hosts.cookieDomain ? {crossSubDomainCookies: {enabled: true, domain: hosts.cookieDomain}} : {}),
      defaultCookieAttributes: {sameSite: 'lax', httpOnly: true, secure},
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        async sendVerificationOTP({email, otp}) {
          await sendSignInCode({
            apiKey: env.BREVO_API_KEY ?? process.env.BREVO_API_KEY,
            to: email,
            code: otp,
            brandName,
            fromDomain: hosts.cookieDomain,
          });
        },
      }),
      nextCookies(),
    ],
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
