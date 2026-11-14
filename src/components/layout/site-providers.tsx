'use client';
// Client providers for every page: site data, Shopify (Money/Image), analytics, locale, drawers.
import type {ReactNode} from 'react';
import {ShopifyProvider} from '@shopify/hydrogen-react';
import {Analytics} from '~/components/analytics/analytics';
import {Aside} from '~/components/Aside';
import {LocaleProvider} from '~/components/ui/locale-context';
import {Ga4Subscriber, Ga4Tag} from '~/components/analytics/ga4';
import {ConsentBanner} from '~/components/analytics/consent-banner';
import {SiteSchema} from '~/components/schema/site-schema';
import {STOREFRONT_API_VERSION} from '~/core/shopify/storefront';
import type {SiteData} from '~/server/site';
import {SiteProvider} from './site-context';

export function SiteProviders({site, children}: {site: SiteData; children: ReactNode}) {
  return (
    <SiteProvider value={site}>
      <ShopifyProvider
        storeDomain={`https://${site.publicStoreDomain}`}
        storefrontToken={site.consent.storefrontAccessToken ?? ''}
        storefrontApiVersion={STOREFRONT_API_VERSION}
        countryIsoCode={site.consent.country as never}
        languageIsoCode={site.consent.language as never}
      >
        <Analytics.Provider cart={site.cart} shop={site.shop} consent={site.consent}>
          <SiteSchema origin={site.origin} />
          {site.gaId ? <Ga4Tag id={site.gaId} /> : null}
          <Ga4Subscriber />
          <ConsentBanner />
          <LocaleProvider locale={site.locale}>
            <Aside.Provider>{children}</Aside.Provider>
          </LocaleProvider>
        </Analytics.Provider>
      </ShopifyProvider>
    </SiteProvider>
  );
}
