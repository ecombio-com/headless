import type {ReactNode} from 'react';
import {notFound} from 'next/navigation';
import {isEnabledLocale} from '~/core/config/i18n';
import {loadSite} from '~/server/site';
import {SiteProviders} from '~/components/layout/site-providers';

// Every page reads cookies (cart, session), so render per request.
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({children, params}: {children: ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!isEnabledLocale(locale)) notFound();
  return <SiteProviders site={await loadSite()}>{children}</SiteProviders>;
}
