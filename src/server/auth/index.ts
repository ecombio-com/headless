// Customer sign-in with Better Auth on Cloudflare D1: email code + Google, no passwords (specs/001-customer-sign-in).
// One D1 database per brand (binding AUTH_DB); sign-in UI on auth.<brand>.com.
import 'server-only';
import {betterAuth} from 'better-auth';
import {emailOTP} from 'better-auth/plugins';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {getAuthHosts} from './hosts';
import {sendSignInCode} from './email';

type AuthEnv = {
  AUTH_DB?: unknown;
  BETTER_AUTH_SECRET?: string;
  BREVO_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};
type CfCtx = {waitUntil?: (p: Promise<unknown>) => void};

function build(requestUrl: string) {
  const {env, ctx} = getCloudflareContext() as unknown as {env: AuthEnv; ctx?: CfCtx};
  if (!env.AUTH_DB) throw new Error('AUTH_DB (D1) binding is not configured');
  const secret = env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
  const googleId = env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const googleSecret = env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  const brevoKey = env.BREVO_API_KEY ?? process.env.BREVO_API_KEY;

  const hosts = getAuthHosts(requestUrl);
  const background = (p: Promise<unknown>) => {
    if (ctx?.waitUntil) ctx.waitUntil(p);
    else void p.catch(() => undefined);
  };

  return betterAuth({
    baseURL: hosts.authOrigin,
    basePath: '/api/auth',
    secret,
    database: env.AUTH_DB as never,
    trustedOrigins: hosts.trustedOrigins,
    session: {expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24},
    user: {additionalFields: {shopifyCustomerId: {type: 'string', required: false, input: false}}},
    socialProviders: googleId && googleSecret ? {google: {clientId: googleId, clientSecret: googleSecret}} : {},
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        async sendVerificationOTP({email, otp, type}) {
          if (type !== 'sign-in') return;
          // Not awaited: avoids timing differences between known and unknown emails.
          background(sendSignInCode({email, otp, requestUrl, apiKey: brevoKey}));
        },
      }),
    ],
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/email-otp/send-verification-otp': {window: 600, max: 5},
        '/sign-in/email-otp': {window: 600, max: 10},
      },
    },
    advanced: {
      ipAddress: {ipAddressHeaders: ['cf-connecting-ip']},
      backgroundTasks: {handler: background},
      ...(hosts.cookieDomain ? {crossSubDomainCookies: {enabled: true, domain: `.${hosts.cookieDomain}`}} : {}),
    },
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