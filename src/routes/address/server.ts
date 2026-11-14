// Ported from ($locale).address.tsx by scripts/split-route.mjs.
import {localePath} from '~/lib/locale-path';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {stripeCheckoutEnabled} from '~/lib/stripe-checkout';
import {redirect} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {ADDRESS_FIELDS, normalizePhone, normalizeState, type CheckoutAddress} from '~/components/checkout/address';
import {type SummaryLine} from '~/components/checkout/checkout-shell';
import {snapshotPrices} from '~/lib/price-watch';
import {getDeliveryGroups, type DeliveryGroup} from '~/lib/delivery-options.server';
import {getShippingOption} from '~/lib/shipping-options';


type BillingAddress = Omit<CheckoutAddress, 'email' | 'phone'>;

const BILLING_FIELDS = ['firstName', 'lastName', 'address1', 'address2', 'city', 'state', 'zip'] as const;

type ActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const fail = (r: ActionResult): ActionResult => r;

// US numbers to E.164 (+1XXXXXXXXXX). Anything else is left off, so Shopify asks for it at payment.
function toE164(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(amount);
}

export async function loader({context, params}: Route.LoaderArgs) {
  const cart = await context.cart.get();
  if (!cart?.totalQuantity) return {empty: true as const};
  context.session.set('priceSnapshot', snapshotPrices(cart));
  if (!stripeCheckoutEnabled(context.env)) {
    await context.cart.updateAttributes([{key: 'storefront_id', value: getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).slug}]);
  }
  const ownPayment = stripeCheckoutEnabled(context.env);
  const savedAddress = (context.session.get('checkoutAddress') as CheckoutAddress | undefined) ?? null;
  // Shopify takes payment: load Shopify's real rates once the address is on the cart.
  const groups: DeliveryGroup[] = !ownPayment && savedAddress ? await getDeliveryGroups(context.storefront, cart.id) : [];
  const currency = cart.cost.totalAmount.currencyCode;
  const lines: SummaryLine[] = cart.lines.nodes.map((l) => ({
    id: l.id,
    title: l.merchandise.product.title,
    qty: l.quantity,
    price: money(Number(l.cost.totalAmount.amount), currency),
    image: l.merchandise.image ?? null,
  }));
  return {
    address: savedAddress,
    groups,
    billing: (context.session.get('checkoutBilling') as BillingAddress | undefined) ?? null,
    delivery: getShippingOption(context.session.get('deliveryMethod')).id,
    ownPayment,
    baseAmount: Number(cart.cost.totalAmount.amount),
    currency,
    lines,
    subtotal: money(Number(cart.cost.subtotalAmount.amount), currency),
    total: money(Number(cart.cost.totalAmount.amount), currency),
  };
}

export async function action({request, context, params}: Route.ActionArgs) {
  const form = await request.formData();
  const address = Object.fromEntries(
    ADDRESS_FIELDS.map((f) => [f.name, String(form.get(f.name) ?? '').trim()]),
  ) as CheckoutAddress;

  const fieldErrors: NonNullable<ActionResult['fieldErrors']> = {};
  for (const f of ADDRESS_FIELDS) {
    if (f.required && !address[f.name]) fieldErrors[f.name] = 'Required';
  }

  if (address.state) {
    const state = normalizeState(address.state);
    if (state) address.state = state;
    else fieldErrors.state = 'Please choose a state.';
  }

  if (address.phone) {
    const phone = normalizePhone(address.phone);
    if (phone.length === 10) address.phone = phone;
    else fieldErrors.phone = 'Enter a 10-digit US phone number.';
  }

  // Billing: same as shipping unless the box is unticked.
  const sameBilling = form.get('sameBilling') === 'on';
  let billing: BillingAddress | null = null;
  if (!sameBilling) {
    billing = Object.fromEntries(
      BILLING_FIELDS.map((k) => [k, String(form.get(`billing_${k}`) ?? '').trim()]),
    ) as BillingAddress;
    for (const k of BILLING_FIELDS) {
      if (k !== 'address2' && !billing[k]) fieldErrors[`billing_${k}`] = 'Required';
    }
    if (billing.state) {
      const s = normalizeState(billing.state);
      if (s) billing.state = s;
      else fieldErrors.billing_state = 'Please choose a state.';
    }
  }

  if (Object.keys(fieldErrors).length) {
    return fail({error: 'Please fix the highlighted fields.', fieldErrors});
  }

  const previous = context.session.get('checkoutAddress') as CheckoutAddress | undefined;
  const changed = JSON.stringify(previous ?? null) !== JSON.stringify(address);
  if (!stripeCheckoutEnabled(context.env) && changed) {
    // Shopify hosted checkout: save the address onto the Shopify cart so checkout opens prefilled.
    const state = address.state;
    const phone = toE164(address.phone);
    const buyer = await context.cart.updateBuyerIdentity({email: address.email});
    const delivery = await context.cart.replaceDeliveryAddresses([
      {
        selected: true,
        address: {
          deliveryAddress: {
            firstName: address.firstName,
            lastName: address.lastName,
            address1: address.address1,
            ...(address.address2 ? {address2: address.address2} : {}),
            city: address.city,
            provinceCode: state,
            zip: address.zip,
            countryCode: 'US',
            ...(phone ? {phone} : {}),
          },
        },
      },
    ]);
    const problem = buyer.userErrors?.[0]?.message ?? delivery.userErrors?.[0]?.message;
    if (problem) return fail({error: problem});
  }

  context.session.set('checkoutAddress', address);
  context.session.set('deliveryMethod', getShippingOption(form.get('delivery')).id);
  if (billing) context.session.set('checkoutBilling', billing);
  else context.session.unset('checkoutBilling');

  if (!stripeCheckoutEnabled(context.env)) {
    // New or edited address: come back here so Shopify's rates for it can load.
    if (changed) return redirect(`${localePath('/address', params)}#delivery`);
    // Same address: save the chosen rate per delivery group onto the Shopify cart.
    const picks = [...form.entries()]
      .filter(([k, v]) => k.startsWith('ship:') && typeof v === 'string' && v)
      .map(([k, v]) => ({deliveryGroupId: k.slice(5), deliveryOptionHandle: String(v)}));
    const groups = await getDeliveryGroups(context.storefront, await context.cart.getCartId());
    // No choice posted yet (for example after Edit address): show the options again.
    if (!picks.length && groups.length) return redirect(`${localePath('/address', params)}#delivery`);
    if (groups.some((g) => !picks.find((p) => p.deliveryGroupId === g.id))) {
      return fail({error: 'Please choose a delivery option for every item.'});
    }
    if (picks.length) {
      const chosen = await context.cart.updateSelectedDeliveryOption(picks);
      const problem = chosen.userErrors?.[0]?.message;
      if (problem) return fail({error: problem});
    }
  }
  return redirect(localePath('/payment', params));
}
