// Store pages: brand header, cart drawer, footer.
import {Suspense, type ReactNode} from 'react';
import {getBrandLayout} from '~/brands/layouts';
import {CartDrawer} from '~/components/cart/cart-drawer';
import {loadFooter, loadHeader, loadSite} from '~/server/site';

export default async function ShopLayout({children}: {children: ReactNode}) {
  const [site, {header, announcementBar}] = await Promise.all([loadSite(), loadHeader()]);
  const {Header} = getBrandLayout(site.brand);
  return (
    <>
      <CartDrawer cart={site.cart} />
      <Header
        announcementBar={announcementBar}
        header={header}
        cart={site.cart}
        isLoggedIn={site.isLoggedIn}
        publicStoreDomain={site.publicStoreDomain}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Suspense>
        <SiteFooter />
      </Suspense>
    </>
  );
}

// Below the fold: streams in after the page.
async function SiteFooter() {
  const [site, {header}, footer] = await Promise.all([loadSite(), loadHeader(), loadFooter()]);
  const {Footer} = getBrandLayout(site.brand);
  return <Footer footer={footer} header={header} publicStoreDomain={site.publicStoreDomain} brandName={site.brandName} />;
}
