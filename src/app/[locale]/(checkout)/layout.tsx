// Cart, address, payment and confirmation: focused, logo-only chrome.
import type {ReactNode} from 'react';
import {CheckoutFooter, CheckoutHeader} from '~/components/checkout/checkout-shell';
import {loadSite} from '~/server/site';

export default async function CheckoutLayout({children}: {children: ReactNode}) {
  const site = await loadSite();
  return (
    <>
      <CheckoutHeader brandName={site.brandName} logoSrc={site.brand === 'ecombio' ? '/logo.svg' : undefined} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <CheckoutFooter />
    </>
  );
}
