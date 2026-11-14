'use client';
// Ported from ($locale).account.orders.$id.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {Image, Money} from '@shopify/hydrogen-react';
import {cn} from '~/lib/cn';
import {ArrowLeft} from 'lucide-react';
import {useLoaderData} from '~/compat/router';
import type {OrderLineItemFullFragment} from 'customer-accountapi.generated';
import type {Route} from '~/server/route-types';
import {AccountCard} from '~/components/account/account-card';
import {formatOrderDate, OrderStatusPill} from '~/components/account/order-display';
import {AccountPageHeader} from '~/components/account/page-header';
import {buttonVariants} from '~/components/ui/button';
import LocalizedLink from '~/components/ui/localized-link';


export default function OrderRoute() {
  const {order, lineItems, discountValue, discountPercentage, fulfillmentStatus} =
    useLoaderData<typeof loader>();
  const shippingLines = order.shippingAddress?.formatted ?? [];
  const hasDiscount = Boolean(discountPercentage || discountValue?.amount);

  return (
    <>
      <AccountPageHeader
        title={order.name}
        description={order.processedAt ? formatOrderDate(order.processedAt) : undefined}
      />

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {fulfillmentStatus !== 'N/A' ? <OrderStatusPill status={fulfillmentStatus} /> : null}
            {order.confirmationNumber ? (
              <span className="text-ds-small text-muted-foreground">
                Confirmation: {order.confirmationNumber}
              </span>
            ) : null}
          </div>
          <LocalizedLink
            href="/account/orders"
            className={cn(buttonVariants({size: 'sm', variant: 'outline'}), 'gap-1.5')}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to orders
          </LocalizedLink>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-3">
          <AccountCard className="md:col-span-2" title="Items">
            <ul className="grid divide-y divide-border">
              {lineItems.map((item) => (
                <OrderLineRow key={item.id} item={item} />
              ))}
            </ul>
          </AccountCard>

          <div className="grid gap-4">
            <AccountCard title="Order summary">
              <dl className="grid gap-2 text-ds-regular">
                {order.subtotal ? (
                  <SummaryRow label="Subtotal">
                    <Money as="span" data={order.subtotal} />
                  </SummaryRow>
                ) : null}
                {hasDiscount ? (
                  <SummaryRow label="Discounts">
                    {discountPercentage ? (
                      <span>-{discountPercentage}%</span>
                    ) : discountValue ? (
                      <Money as="span" data={discountValue} />
                    ) : null}
                  </SummaryRow>
                ) : null}
                {order.totalShipping ? (
                  <SummaryRow label="Shipping">
                    <Money as="span" data={order.totalShipping} />
                  </SummaryRow>
                ) : null}
                {order.totalTax ? (
                  <SummaryRow label="Tax">
                    <Money as="span" data={order.totalTax} />
                  </SummaryRow>
                ) : null}
                <div className="flex items-center justify-between border-t border-border pt-2 font-medium">
                  <dt>Total</dt>
                  <dd className="font-mono tabular-nums">
                    <Money as="span" data={order.totalPrice} />
                  </dd>
                </div>
              </dl>
              <a
                href={order.statusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({size: 'sm', variant: 'outline'}), 'w-fit')}
              >
                View order status
              </a>
            </AccountCard>

            {shippingLines.length > 0 ? (
              <AccountCard title="Shipping address">
                <address className="text-ds-regular text-muted-foreground not-italic">
                  {shippingLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </AccountCard>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryRow({children, label}: {children: React.ReactNode; label: string}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{children}</dd>
    </div>
  );
}

function OrderLineRow({item}: {item: OrderLineItemFullFragment}) {
  const currencyCode = item.price?.currencyCode;
  const lineTotal =
    Number(item.price?.amount ?? 0) * item.quantity - Number(item.totalDiscount?.amount ?? 0);
  return (
    <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-ds-md bg-muted">
        {item.image ? (
          <Image data={item.image} sizes="64px" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ds-regular font-medium">{item.title}</p>
        {item.variantTitle ? (
          <p className="truncate text-ds-small text-muted-foreground">{item.variantTitle}</p>
        ) : null}
        <p className="text-ds-small text-muted-foreground">Qty {item.quantity}</p>
      </div>
      {currencyCode ? (
        <Money
          as="span"
          data={{amount: String(lineTotal), currencyCode}}
          className="font-mono text-ds-regular tabular-nums"
        />
      ) : null}
    </li>
  );
}
