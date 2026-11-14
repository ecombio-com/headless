'use client';
// Ported from ($locale).payment.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {localePath} from '~/lib/locale-path';
import {useLoaderData, useParams, useRevalidator} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {ChevronDown, Tag} from 'lucide-react';
import {EmptyCart} from '~/components/checkout/empty-cart';
import {DiscountForm} from '~/components/cart/discount-form';
import {AddressBlock, CheckoutCard, CheckoutProgress, CheckoutShell, ConsentNote, Perks, SecureNote, SummaryDivider, SummaryItems, SummaryRow, TrustBox} from '~/components/checkout/checkout-shell';
import {useEffect, useState, type ComponentType} from 'react';


type PaymentFormProps = {publishableKey: string; clientSecret: string; total: string};

function ClientPaymentForm(props: PaymentFormProps) {
  const [Form, setForm] = useState<ComponentType<PaymentFormProps> | null>(null);
  useEffect(() => {
    import('~/components/checkout/payment-form').then((m) => setForm(() => m.PaymentForm));
  }, []);
  if (!Form) return <div className="h-48 animate-pulse rounded-md bg-neutral-100" />;
  return <Form {...props} />;
}

export default function Payment() {
  const data = useLoaderData<typeof loader>();
  if ('empty' in data) return <EmptyCart />;
  return <PaymentView d={data} />;
}

function PaymentView({d}: {d: Exclude<ReturnType<typeof useLoaderData<typeof loader>>, {empty: true}>}) {
  const params = useParams();
  const {address, billing, lines, subtotal, discount, total} = d;
  const {revalidate} = useRevalidator();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [revalidate]);
  const addressHref = localePath('/address', params);

  return (
    <CheckoutShell
      aside={
        <>
          <h2 className="text-ds-medium font-semibold text-foreground">Your order</h2>
          <div className="grid gap-4 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs">
            <SummaryItems lines={lines} />
            <SummaryDivider />
            <SummaryRow label="Subtotal" value={subtotal} />
            {discount ? <SummaryRow label="Discount" value={discount} positive /> : null}
            {d.mode === 'stripe' ? (
              <>
                <SummaryRow label={d.shippingTitle} value={d.shipping} positive={d.shipping === 'Free'} />
                <SummaryRow label="Tax" value={d.tax} />
              </>
            ) : (
              <>
                <SummaryRow label="Shipping" value={d.kitShipping ?? 'Next step'} positive={d.kitShipping === 'Free'} />
                <SummaryRow label="Tax" value="Calculated in secure payment" />
              </>
            )}
            <SummaryDivider />
            <SummaryRow
              label={d.mode === 'stripe' ? 'Total' : d.kitEstimate ? 'Total before tax' : 'Total before shipping and tax'}
              value={d.mode === 'stripe' ? total : d.kitEstimate ?? total}
              strong
            />
            <ConsentNote />
            <TrustBox />
          </div>
          <AddressBlock heading="Ship to" address={address} editHref={addressHref} />
          <AddressBlock heading="Bill to" address={billing ?? address} editHref={addressHref} />
        </>
      }
    >
      <CheckoutProgress step="Payment" backHref="/address" />

      {d.priceChanges.length ? (
        <div role="status" className="rounded-ds-lg border border-amber-300 bg-amber-50 p-4 text-ds-small">
          <p className="font-semibold">Price update</p>
          {d.priceChanges.map((c) => (
            <p key={c.id}>
              {c.title}: {c.from} → {c.to}
            </p>
          ))}
          <p className="mt-1">The total reflects the new price.</p>
        </div>
      ) : null}

      <div className="grid gap-3">
        <h1 className="text-ds-regular font-semibold text-foreground">Choose payment method</h1>
        <CheckoutCard>
          {d.mode === 'stripe' ? (
            <ClientPaymentForm publishableKey={d.publishableKey} clientSecret={d.clientSecret} total={total} />
          ) : (
            <div className="grid gap-3">
              <a
                href={d.checkoutUrl}
                data-checkout-kit
                className="flex h-12 w-full items-center justify-center rounded-ds-md bg-foreground text-ds-regular font-semibold text-background hover:bg-foreground/90"
              >
                Continue to secure payment
              </a>
              <SecureNote />
            </div>
          )}
        </CheckoutCard>
      </div>

      <details className="group rounded-ds-lg bg-background shadow-ds-drop-xs">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-ds-small font-medium text-foreground">
          <span className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-ds-md bg-positive/15 text-positive">
              <Tag className="size-4" aria-hidden="true" />
            </span>
            Have a promo code?
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-5 pb-5">
          <DiscountForm discountCodes={d.discountCodes} />
        </div>
      </details>

      <Perks />
    </CheckoutShell>
  );
}
