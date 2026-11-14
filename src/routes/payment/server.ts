// Ported from ($locale).payment.tsx by scripts/split-route.mjs.
import {forceCheckoutHost} from '~/lib/checkout-host';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {localePath} from '~/lib/locale-path';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {VERSIONS} from '~/lib/versions';
import {redirect} from '~/compat/router';
import {diffPrices, type PriceSnapshot} from '~/lib/price-watch';
import type {Route} from '~/server/route-types';
import type {CheckoutAddress} from '~/components/checkout/address';
import {calculateTotals} from '~/lib/checkout-totals.server';
import {getShippingOption} from '~/lib/shipping-options';
import {getDeliveryGroups, shippingTotal} from '~/lib/delivery-options.server';


type BillingAddress = Omit<CheckoutAddress, 'email' | 'phone'>;

async function stripe(env: Record<string, string>, path: string, body: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': VERSIONS.stripe},
    body,
  });
  return {ok: res.ok, data: (await res.json()) as {id?: string; client_secret?: string; status?: string; error?: {message: string}}};
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(cents / 100);
}

export async function loader({context, params}: Route.LoaderArgs) {
  const cart = await context.cart.get();
  if (!cart?.totalQuantity) return {empty: true as const};
  const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
  if (!address) return redirect(localePath('/address', params));

  const currency = cart.cost.totalAmount.currencyCode;
  const lineSum = cart.lines.nodes.reduce((s, l) => s + Math.round(Number(l.cost.totalAmount.amount) * 100), 0);
  const totalCents = Math.round(Number(cart.cost.totalAmount.amount) * 100);
  const discountCents = Math.max(0, lineSum - totalCents);
  const discount = discountCents ? '-' + money(discountCents, currency) : '';
  const lines = cart.lines.nodes.map((l) => ({id: l.id, title: l.merchandise.product.title, qty: l.quantity, price: money(Math.round(Number(l.cost.totalAmount.amount) * 100), currency), image: l.merchandise.image ?? null}));
  const billing = (context.session.get('checkoutBilling') as BillingAddress | undefined) ?? null;
  const discountCodes = cart.discountCodes ?? [];

  // Compare against the prices saved when the shopper was on the address step.
  const snapshot = context.session.get('priceSnapshot') as PriceSnapshot | undefined;
  const priceChanges = snapshot
    ? diffPrices(snapshot, cart).map((c) => ({...c, from: money(c.from, currency), to: money(c.to, currency)}))
    : [];

  if (!stripeCheckoutEnabled(context.env)) {
    // Shopify hosted checkout: the Pay button opens Shopify checkout (Checkout Kit), already prefilled.
    const shipDollars = shippingTotal(await getDeliveryGroups(context.storefront, cart.id));
    return {
      mode: 'shopify' as const,
      kitShipping: shipDollars == null ? null : shipDollars === 0 ? 'Free' : money(Math.round(shipDollars * 100), currency),
      kitEstimate: shipDollars == null ? null : money(totalCents + Math.round(shipDollars * 100), currency),
      checkoutUrl: forceCheckoutHost(cart.checkoutUrl),
      priceChanges,
      subtotal: money(lineSum, currency),
      discount,
      total: money(totalCents, currency),
      address,
      billing,
      discountCodes,
      lines,
    };
  }

  const env = context.env as unknown as Record<string, string>;
  const linesMeta = cart.lines.nodes
    .map((l) => `${l.merchandise.id.split('/').pop()}x${l.quantity}@${Math.round((Number(l.cost.totalAmount.amount) * 100) / Math.max(1, l.quantity))}`)
    .join(',');
  const delivery = getShippingOption(context.session.get('deliveryMethod'));
  const totals = await calculateTotals(env, {
    discountCents,
    shippingCents: delivery.cents,
    currency: currency.toLowerCase(),
    address,
    lines: cart.lines.nodes.map((l) => ({
      reference: l.merchandise.id,
      cents: Math.round(Number(l.cost.totalAmount.amount) * 100),
    })),
  });

  const body = new URLSearchParams({
    amount: String(totals.total),
    currency: currency.toLowerCase(),
    receipt_email: address.email,
    'metadata[cart_id]': cart.id,
    'metadata[storefront_id]': getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).slug,
    ...(linesMeta.length <= 5000 ? Object.fromEntries((linesMeta.match(/.{1,500}/g) ?? []).map((c, i) => [i === 0 ? 'metadata[lines]' : `metadata[lines_${i + 1}]`, c])) : {}),
    'metadata[shipping_cents]': String(totals.shipping),
    'metadata[shipping_method]': delivery.id,
    'metadata[tax_cents]': String(totals.tax),
    'metadata[discount_cents]': String(discountCents),
    'hooks[inputs][tax][calculation]': totals.calculationId,
    'shipping[name]': `${address.firstName} ${address.lastName}`,
    'shipping[phone]': address.phone,
    'shipping[address][line1]': address.address1,
    'shipping[address][line2]': address.address2,
    'shipping[address][city]': address.city,
    'shipping[address][state]': address.state,
    'shipping[address][postal_code]': address.zip,
    'shipping[address][country]': 'US',
  });

  const savedId = context.session.get('paymentIntentId') as string | undefined;
  let intent = savedId ? await stripe(env, `payment_intents/${savedId}`, body) : null;
  if (!intent?.ok || intent.data.status === 'succeeded') {
    body.set('automatic_payment_methods[enabled]', 'true');
    intent = await stripe(env, 'payment_intents', body);
  }
  if (!intent.ok || !intent.data.client_secret) {
    throw new Response(intent.data.error?.message ?? 'Stripe error', {status: 502});
  }
  context.session.set('paymentIntentId', intent.data.id);

  return {
    mode: 'stripe' as const,
    publishableKey: env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
    priceChanges,
    clientSecret: intent.data.client_secret,
    total: money(totals.total, currency),
    subtotal: money(totals.subtotal, currency),
    discount,
    shipping: totals.shipping === 0 ? 'Free' : money(totals.shipping, currency),
    shippingTitle: delivery.title,
    tax: money(totals.tax, currency),
    address,
    billing,
    discountCodes,
    lines,
  };
}
