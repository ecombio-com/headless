'use client';
// Client providers for every page: site data, Shopify (Money/Image), analytics, locale, drawers.
import {useEffect, useRef, type ReactNode} from 'react';
import {ShopifyProvider} from '@shopify/hydrogen-react';
import posthog from 'posthog-js';
import {Analytics} from '~/components/analytics/analytics';
import {Aside} from '~/components/Aside';
import {LocaleProvider} from '~/components/ui/locale-context';
import {Ga4Subscriber, Ga4Tag} from '~/components/analytics/ga4';
import {ConsentBanner} from '~/components/analytics/consent-banner';
import {SiteSchema} from '~/components/schema/site-schema';
import {STOREFRONT_API_VERSION} from '~/core/shopify/storefront';
import type {SiteData} from '~/server/site';
import {SiteProvider} from './site-context';

function PostHogIdentity({user}: {user: SiteData['posthogUser']}) {
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      if (identifiedUserId.current) posthog.reset();
      identifiedUserId.current = null;
      return;
    }
    if (identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) posthog.reset();
    posthog.identify(user.id, {
      ...(user.firstName ? {first_name: user.firstName} : {}),
      ...(user.lastName ? {last_name: user.lastName} : {}),
    });
    identifiedUserId.current = user.id;
  }, [user]);

  return null;
}

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
          <PostHogIdentity user={site.posthogUser} />
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
