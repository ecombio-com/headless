// Host rules for customer sign-in (P1.4, specs/001-customer-sign-in).
// Live: shop on <brand>.com / www.<brand>.com, sign-in on auth.<brand>.com.
// Local dev: everything on one origin (http://localhost:3000).
import {DEFAULT_LOCALE} from '~/core/config/i18n';

export const AUTH_SUBDOMAIN = 'auth';

export type AuthHosts = {
  /** Where the shop lives, e.g. https://bicyclebio.com or http://localhost:3000 */
  shopOrigin: string;
  /** Where sign-in lives, e.g. https://auth.bicyclebio.com or http://localhost:3000 */
  authOrigin: string;
  /** Cookie domain shared by shop and auth host, e.g. bicyclebio.com. Undefined on localhost. */
  cookieDomain?: string;
  /** Every origin allowed to call the auth API or be a redirect target. */
  trustedOrigins: string[];
};

function isLocal(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.workers.dev');
}

/** Apex domain for a request host: auth.bicyclebio.com / www.bicyclebio.com / bicyclebio.com -> bicyclebio.com */
export function apexOf(hostname: string): string {
  return hostname.replace(/^(www|auth)\./, '');
}

export function isAuthHost(hostname: string): boolean {
  return hostname.startsWith(`${AUTH_SUBDOMAIN}.`);
}

export function getAuthHosts(requestUrl: string): AuthHosts {
  const url = new URL(requestUrl);
  if (isLocal(url.hostname)) {
    return {shopOrigin: url.origin, authOrigin: url.origin, trustedOrigins: [url.origin]};
  }
  const apex = apexOf(url.hostname);
  return {
    shopOrigin: `https://${apex}`,
    authOrigin: `https://${AUTH_SUBDOMAIN}.${apex}`,
    cookieDomain: apex,
    trustedOrigins: [`https://${apex}`, `https://www.${apex}`, `https://${AUTH_SUBDOMAIN}.${apex}`],
  };
}

/** Only same-shop paths are allowed as return targets (no open redirects). */
export function safeReturnPath(value: string | null | undefined): string {
  const fallback = `/${DEFAULT_LOCALE}/account`;
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

/** Link the shop sends shoppers to: https://auth.<brand>.com/?return_to=/en-us/account */
export function signInUrl(requestUrl: string, returnTo?: string): string {
  const {authOrigin, shopOrigin} = getAuthHosts(requestUrl);
  const path = authOrigin === shopOrigin ? `/${DEFAULT_LOCALE}/sign-in` : '/';
  return `${authOrigin}${path}?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
