'use client';
// Ported from ($locale).cart.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {Analytics, Money, useOptimisticCart} from '~/compat/hydrogen';
import {Repeat, Truck} from 'lucide-react';
import {CartCheckout} from '~/components/cart/checkout';
import {CheckoutCard, CheckoutShell, Perks, SectionTitle} from '~/components/checkout/checkout-shell';
import {EmptyCart} from '~/components/checkout/empty-cart';
import {data, useLoaderData} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {CartPageLine} from '~/components/cart/cart-page-line';
import {CartPageSummary} from '~/components/cart/cart-page-summary';
import {COPY} from '~/components/cart/copy';
import LocalizedLink from '~/components/ui/localized-link';


export default function Cart() {
  const original = useLoaderData<typeof loader>();
  // Applies pending cart actions so the page updates before the server responds.
  const cart = useOptimisticCart(original);
  const lines = cart?.lines?.nodes ?? [];
  const count = cart?.totalQuantity ?? 0;

  if (!lines.length) return <EmptyCart />;

  return (
    <CheckoutShell
      aside={<CartPageSummary cart={cart} />}
      footerBar={
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-ds-small text-muted-foreground">Cart total</p>
            {cart?.cost?.totalAmount ? (
              <Money as="p" data={cart.cost.totalAmount} className="text-ds-regular font-semibold" />
            ) : null}
          </div>
          <div className="w-1/2">
            <CartCheckout checkoutUrl={cart?.checkoutUrl} hasLines />
          </div>
        </div>
      }
    >
      <Analytics.CartView />
      <div className="flex items-center gap-2.5">
        <SectionTitle>Your cart</SectionTitle>
        <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-ds-small font-semibold text-background">
          {count}
        </span>
      </div>

      <ul className="grid gap-4" aria-label={COPY.items}>
        {lines.map((line) => (
          <CartPageLine key={line.id} line={line} />
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 rounded-ds-lg bg-positive/10 px-4 py-3 text-ds-small">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Truck className="size-4 text-positive" aria-hidden="true" />
          Free standard shipping
        </span>
        <LocalizedLink href="/policies/shipping-policy" className="text-foreground underline underline-offset-2">
          Delivery info
        </LocalizedLink>
      </div>

      <CheckoutCard className="border border-[var(--color-secondary-200)] bg-[var(--color-secondary-50)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-ds-small font-semibold text-[var(--color-secondary-700)]">
              <Repeat className="size-4" aria-hidden="true" />
              Save on today&apos;s purchase
            </p>
            <p className="text-ds-regular font-semibold text-foreground">Got an old ride to trade in?</p>
            <p className="text-ds-small text-muted-foreground">Trade it in and put the value toward your new ride.</p>
          </div>
          <LocalizedLink
            href="/pages/trade-in"
            className="rounded-ds-md border border-foreground bg-background px-4 py-2 text-ds-small font-medium text-foreground hover:bg-muted"
          >
            See trade-in value
          </LocalizedLink>
        </div>
      </CheckoutCard>

      <Perks />
    </CheckoutShell>
  );
}
