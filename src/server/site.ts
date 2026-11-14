// Per-request site data (was the Hydrogen root loader), split by who needs it:
//   loadSite   -> every page (providers, analytics, cart, login state)
//   loadHeader -> shop pages only (menu, announcement bar)
//   loadFooter -> shop pages only, streamed below the fold
import 'server-only';
import {cache} from 'react';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import {fillMenuCollectionImages} from '~/lib/menu-images.server';
import {getAnnouncementBar, isAnnouncementDismissed} from '~/lib/announcements.server';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {getLocaleFromRequest} from '~/core/config/i18n';
import {createAppContext, getServerRequest} from './context';

/** One AppContext per request, shared by layouts, pages and generateMetadata. */
export const getRequestContext = cache(async () => createAppContext(await getServerRequest()));

export const loadSite = cache(async () => {
  const {storefront, env, request, cart, customerAccount, storefrontConfig} = await getRequestContext();
  const cartPromise = cart.get().catch((error: Error) => {
    console.error(error);
    return null;
  });
  return {
    cart: cartPromise,
    isLoggedIn: customerAccount.isLoggedIn().catch(() => false),
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    checkoutMode: stripeCheckoutEnabled(env) ? ('stripe' as const) : ('shopify' as const),
    brand: storefrontConfig.brand,
    brandName: storefrontConfig.name,
    origin: new URL(request.url).origin,
    gaId: env.GA_MEASUREMENT_ID,
    locale: getLocaleFromRequest(request).pathPrefix.slice(1),
    shop: {
      shopId: env.SHOP_ID ? `gid://shopify/Shop/${env.SHOP_ID}` : '',
      acceptedLanguage: storefront.i18n.language,
      currency: 'USD',
      hydrogenSubchannelId: env.PUBLIC_STOREFRONT_ID ?? '0',
    },
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  };
});
export type SiteData = Awaited<ReturnType<typeof loadSite>>;

export const loadHeader = cache(async () => {
  const {storefront, request, storefrontConfig} = await getRequestContext();
  const [header, announcementBar] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {headerMenuHandle: storefrontConfig.headerMenuHandle},
    }),
    getAnnouncementBar(storefront),
  ]);
  header.menu = await fillMenuCollectionImages(storefront, header.menu);
  return {header, announcementBar: isAnnouncementDismissed(request) ? null : announcementBar};
});

export async function loadFooter() {
  const {storefront, storefrontConfig} = await getRequestContext();
  return storefront
    .query(FOOTER_QUERY, {cache: storefront.CacheLong(), variables: {footerMenuHandle: storefrontConfig.footerMenuHandle}})
    .catch((error: Error) => {
      console.error(error);
      return null;
    });
}
