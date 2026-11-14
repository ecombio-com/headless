// Every Shopify checkout link is moved to the live store's checkout domain, checkout.ecombio.com
// (khkkyb-b8). Never use store.ecombio.com.
const DEV_STORE_CHECKOUT_HOSTS = new Set([
  'khkkyb-b8.myshopify.com',
  'ecombio.myshopify.com',
  'checkout.bicyclebio.com',
]);

export function forceCheckoutHost<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!DEV_STORE_CHECKOUT_HOSTS.has(u.host)) return url;
    u.host = 'checkout.ecombio.com';
    u.searchParams.delete('preview_theme_id');
    return u.toString() as T;
  } catch {
    return url;
  }
}
