// Ported from ($locale).payment_.complete.tsx by scripts/split-route.mjs.
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {data, redirect} from '~/compat/router';
import type {Route} from '~/server/route-types';
import type {CheckoutAddress} from '~/components/checkout/address';
import {createPaidOrder, linesFromIntent, stripeCall, type Env} from '~/lib/shopify-order.server';


type Result = {ok: boolean; message?: string; orderName?: string; email?: string; firstName?: string};

// Pass the loader's Set-Cookie (new cart) through on normal page loads.
export const headers: Route.HeadersFunction = ({loaderHeaders}) => loaderHeaders;

export async function loader({request, context}: Route.LoaderArgs) {
  const env = context.env as unknown as Env;

  if (!stripeCheckoutEnabled(env)) {
    // Shopify hosted checkout: Checkout Kit sends the buyer here after Shopify creates the order.
    const kit = new URL(request.url).searchParams.get('kit') === '1';
    if (!kit || !context.session.get('kitCheckoutStarted')) return redirect('/cart');
    // Only confirm once Shopify has turned the cart into an order (the cart is gone).
    // One short retry covers the moment between payment and Shopify closing the cart.
    let open = await context.cart.get();
    if (open?.totalQuantity) {
      await new Promise((r) => setTimeout(r, 1500));
      open = await context.cart.get();
    }
    if (open?.totalQuantity) return redirect('/payment');
    context.session.unset('kitCheckoutStarted');
    const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
    context.session.unset('checkoutAddress');
    context.session.unset('checkoutBilling');
    context.session.unset('deliveryMethod');
    const fresh = await context.cart.create({});
    const headers = fresh.cart?.id ? context.cart.setCartId(fresh.cart.id) : undefined;
    return data({ok: true, email: address?.email, firstName: address?.firstName} satisfies Result, {headers});
  }

  const piId = new URL(request.url).searchParams.get('payment_intent');
  if (!piId) return redirect('/cart');

  // 1. Confirm with Stripe (never trust the URL alone)
  const pi = await stripeCall(env, `payment_intents/${piId}`);
  if (pi.status !== 'succeeded') {
    return {ok: false, message: `Payment not completed (status: ${pi.status ?? pi.error?.message ?? 'unknown'}).`} satisfies Result;
  }

  // 2. Already made the order? (page refresh or webhook) Show it, don't duplicate.
  if (pi.metadata?.shopify_order_name) {
    return {ok: true, orderName: pi.metadata.shopify_order_name, email: pi.receipt_email ?? undefined} satisfies Result;
  }

  // 3. Match payment to this cart
  const cart = await context.cart.get();
  const address = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
  const billing = context.session.get('checkoutBilling') as Omit<CheckoutAddress, 'email' | 'phone'> | undefined;
  if (!cart || cart.id !== pi.metadata?.cart_id || !address) {
    return {ok: false, message: 'Payment received, but the cart or address is missing. We will contact you.'} satisfies Result;
  }

  // 4. Create the paid order in Shopify (shared with the webhook)
  const made = await createPaidOrder(env, pi, {
    email: address.email,
    mailing: {
      firstName: address.firstName, lastName: address.lastName,
      address1: address.address1, address2: address.address2 || undefined,
      city: address.city, province: address.state, zip: address.zip,
      countryCode: 'US', phone: address.phone,
    },
    billing: billing
      ? {firstName: billing.firstName, lastName: billing.lastName, address1: billing.address1, address2: billing.address2 || undefined, city: billing.city, province: billing.state, zip: billing.zip, countryCode: 'US'}
      : undefined,
    lines: linesFromIntent(pi),
  });
  if (!made.ok) {
    return {ok: false, message: `Payment received, but the order was not created: ${made.message}`} satisfies Result;
  }

  // 5. Clear checkout
  context.session.unset('checkoutAddress');
    context.session.unset('checkoutBilling');
    context.session.unset('deliveryMethod');
  context.session.unset('paymentIntentId');
  const fresh = await context.cart.create({});
  const headers = fresh.cart?.id ? context.cart.setCartId(fresh.cart.id) : undefined;

  return data({ok: true, orderName: made.orderName, email: address.email, firstName: address.firstName} satisfies Result, {headers});
}
