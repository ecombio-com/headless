// Customer Account API client (OAuth 2.0 public client with PKCE).
// Replaces Hydrogen's createCustomerAccountClient. Tokens live in the signed session cookie.
import 'server-only';
import {createHash, randomBytes} from 'node:crypto';
import {getLocaleFromRequest} from '~/core/config/i18n';
import type {AppSession} from './session';

const API_VERSION = '2026-04';
const SESSION_KEY = 'customerAccount';

type Tokens = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  state?: string;
  nonce?: string;
  codeVerifier?: string;
  redirectPath?: string;
};

type Args = {env: Record<string, string | undefined>; session: AppSession; request: Request};

const b64url = (buf: Buffer) => buf.toString('base64url');

function redirectTo(location: string, status = 302) {
  return new Response(null, {status, headers: {Location: location}});
}

export function createCustomerAccount({env, session, request}: Args) {
  const shopId = env.SHOP_ID ?? '';
  const clientId = env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID ?? '';
  const origin = new URL(request.url).origin;
  const authBase = `https://shopify.com/authentication/${shopId}`;
  const apiUrl = `https://shopify.com/${shopId}/account/customer/api/${API_VERSION}/graphql`;
  const locale = getLocaleFromRequest(request);
  const redirectUri = `${origin}/account/authorize`;

  const read = () => (session.get(SESSION_KEY) as Tokens | undefined) ?? {};
  const write = (t: Tokens) => session.set(SESSION_KEY, t);

  async function tokenRequest(body: Record<string, string>) {
    const res = await fetch(`${authBase}/oauth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, 'User-Agent': 'ecombio-headless'},
      body: new URLSearchParams({client_id: clientId, ...body}),
    });
    if (!res.ok) throw new Error(`Customer Account token request failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as {access_token: string; refresh_token?: string; id_token?: string; expires_in: number};
  }

  function store(t: Awaited<ReturnType<typeof tokenRequest>>, prev: Tokens) {
    write({
      accessToken: t.access_token,
      refreshToken: t.refresh_token ?? prev.refreshToken,
      idToken: t.id_token ?? prev.idToken,
      expiresAt: Math.floor(Date.now() / 1000) + t.expires_in - 60,
    });
  }

  async function getAccessToken(): Promise<string | undefined> {
    const t = read();
    if (!t.accessToken) return undefined;
    if (t.expiresAt && t.expiresAt > Date.now() / 1000) return t.accessToken;
    if (!t.refreshToken) return undefined;
    try {
      store(await tokenRequest({grant_type: 'refresh_token', refresh_token: t.refreshToken}), t);
      return read().accessToken;
    } catch (error) {
      console.error(error);
      session.unset(SESSION_KEY);
      return undefined;
    }
  }

  async function graphql(query: string, opts: {variables?: Record<string, unknown>; language?: string} = {}) {
    const token = await getAccessToken();
    if (!token) throw redirectTo(`${locale.pathPrefix}/account/login`);
    const variables = {...(opts.variables ?? {})};
    if (/\$language\b/.test(query) && variables.language === undefined) variables.language = opts.language ?? locale.language;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json', Authorization: token, Origin: origin},
      body: JSON.stringify({query: query.replace(/^#graphql\s*/, ''), variables}),
    });
    if (res.status === 401) {
      session.unset(SESSION_KEY);
      throw redirectTo(`${locale.pathPrefix}/account/login`);
    }
    const json = (await res.json()) as {data?: any; errors?: {message: string}[]};
    return {data: json.data, errors: json.errors};
  }

  return {
    i18n: {language: locale.language},

    async isLoggedIn(): Promise<boolean> {
      return Boolean(await getAccessToken());
    },

    async handleAuthStatus() {
      if (!(await getAccessToken())) {
        const url = new URL(request.url);
        throw redirectTo(`${locale.pathPrefix}/account/login?return_to=${encodeURIComponent(url.pathname)}`);
      }
    },

    async login(opts: {countryCode?: string; acrValues?: string; loginHint?: string; loginHintMode?: string; locale?: string} = {}) {
      const state = b64url(randomBytes(16));
      const nonce = b64url(randomBytes(16));
      const codeVerifier = b64url(randomBytes(32));
      const challenge = b64url(createHash('sha256').update(codeVerifier).digest());
      const returnTo = new URL(request.url).searchParams.get('return_to') ?? undefined;
      write({...read(), state, nonce, codeVerifier, redirectPath: returnTo});
      const url = new URL(`${authBase}/oauth/authorize`);
      url.search = new URLSearchParams({
        client_id: clientId,
        scope: 'openid email customer-account-api:full',
        response_type: 'code',
        redirect_uri: redirectUri,
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        ...(opts.acrValues ? {acr_values: opts.acrValues} : {}),
        ...(opts.loginHint ? {login_hint: opts.loginHint} : {}),
        ...(opts.loginHintMode ? {login_hint_mode: opts.loginHintMode} : {}),
        ...(opts.locale ? {locale: opts.locale} : {}),
        ...(opts.countryCode ? {region_country: opts.countryCode} : {}),
      }).toString();
      return redirectTo(url.toString());
    },

    async authorize() {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const saved = read();
      if (!code || !state || state !== saved.state || !saved.codeVerifier) {
        return new Response('Login failed: state mismatch. Please try again.', {status: 400});
      }
      const tokens = await tokenRequest({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
        code_verifier: saved.codeVerifier,
      });
      store(tokens, {});
      return redirectTo(saved.redirectPath || `${locale.pathPrefix}/account`);
    },

    async logout(opts: {postLogoutRedirectUri?: string} = {}) {
      const {idToken} = read();
      session.unset(SESSION_KEY);
      if (!idToken) return redirectTo(opts.postLogoutRedirectUri ?? '/');
      const url = new URL(`${authBase}/logout`);
      url.search = new URLSearchParams({id_token_hint: idToken, post_logout_redirect_uri: opts.postLogoutRedirectUri ?? origin}).toString();
      return redirectTo(url.toString());
    },

    query: graphql as (query: string, opts?: {variables?: Record<string, unknown>; language?: string}) => Promise<{data: any; errors?: {message: string}[]}>,
    mutate: graphql as (query: string, opts?: {variables?: Record<string, unknown>; language?: string}) => Promise<{data: any; errors?: {message: string}[]}>,
  };
}
