'use client';
// Ported from ($locale).address.tsx by scripts/split-route.mjs.
import type {loader, action} from './server';
import {Form, useActionData, useLoaderData, useNavigation} from '~/compat/router';
import {Truck, Zap} from 'lucide-react';
import {useState} from 'react';
import type {Route} from '~/server/route-types';
import {ADDRESS_FIELDS, US_STATES} from '~/components/checkout/address';
import {CheckoutCard, CheckoutProgress, CheckoutShell, ConsentNote, Perks, SummaryDivider, SummaryItems, SummaryRow, TrustBox, formatPhone} from '~/components/checkout/checkout-shell';
import {SHIPPING_OPTIONS, getShippingOption, shippingLabel} from '~/lib/shipping-options';
import {EmptyCart} from '~/components/checkout/empty-cart';


/* ---------- UI ---------- */

const INPUT =
  'h-12 w-full rounded-ds-md border bg-background px-3 text-ds-regular text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10';

function Field({
  name,
  label,
  error,
  className,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {name: string; label: string; error?: string; hint?: string}) {
  return (
    <label className={`grid gap-1.5 text-ds-small ${className ?? ''}`}>
      <span className="font-medium text-foreground">
        {label}
        {input.required ? <span className="text-destructive"> *</span> : null}
      </span>
      <input name={name} aria-invalid={error ? true : undefined} className={`${INPUT} ${error ? 'border-destructive' : 'border-border'}`} {...input} />
      {hint && !error ? <span className="text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-destructive">{error}</span> : null}
    </label>
  );
}

function StateSelect({name, defaultValue, error}: {name: string; defaultValue?: string; error?: string}) {
  return (
    <label className="grid gap-1.5 text-ds-small">
      <span className="font-medium text-foreground">
        State<span className="text-destructive"> *</span>
      </span>
      <select
        name={name}
        required
        autoComplete={name === 'state' ? 'address-level1' : 'billing address-level1'}
        defaultValue={defaultValue ?? ''}
        aria-invalid={error ? true : undefined}
        className={`${INPUT} ${error ? 'border-destructive' : 'border-border'}`}
      >
        <option value="" disabled>
          Select a state
        </option>
        {US_STATES.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      {error ? <span className="text-destructive">{error}</span> : null}
    </label>
  );
}

function CountryField() {
  return (
    <label className="grid gap-1.5 text-ds-small">
      <span className="font-medium text-foreground">Country</span>
      <input value="United States" readOnly className={`${INPUT} border-border bg-muted text-muted-foreground`} />
    </label>
  );
}

export default function Address() {
  const data = useLoaderData<typeof loader>();
  if ('empty' in data) return <EmptyCart />;
  return <AddressView data={data} />;
}

function AddressView({data}: {data: Exclude<ReturnType<typeof useLoaderData<typeof loader>>, {empty: true}>}) {
  const {address, billing, lines, subtotal, delivery, baseAmount, currency, ownPayment, groups} = data;
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.selected ?? g.options[0]?.handle ?? ''])),
  );
  const shopifyShipping = groups.length
    ? groups.reduce((sum, g) => sum + Number(g.options.find((o) => o.handle === picked[g.id])?.estimatedCost.amount ?? 0), 0)
    : null;
  const fmt = (n: number) => new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(n);
  const [deliveryId, setDeliveryId] = useState<string>(delivery);
  const chosen = getShippingOption(deliveryId);
  const estTotal = new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(baseAmount + chosen.cents / 100);
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const errs = result?.fieldErrors ?? {};
  const hasErrors = Object.keys(errs).length > 0;
  const [editing, setEditing] = useState(!address || hasErrors);
  const [sameBilling, setSameBilling] = useState(!billing);
  const a = address ?? undefined;

  return (
    <CheckoutShell
      aside={
        <>
          <h2 className="text-ds-medium font-semibold text-foreground">Your order</h2>
          <div className="grid gap-4 rounded-ds-lg bg-background p-5 shadow-ds-drop-xs">
            <SummaryItems lines={lines} />
            <SummaryDivider />
            <SummaryRow label="Subtotal" value={subtotal} />
            {ownPayment ? (
              <SummaryRow label={chosen.title} value={shippingLabel(chosen.cents)} positive={chosen.cents === 0} />
            ) : (
              <SummaryRow
                label="Shipping"
                value={shopifyShipping == null ? 'Choose below' : shopifyShipping === 0 ? 'Free' : fmt(shopifyShipping)}
                positive={shopifyShipping === 0}
              />
            )}
            <SummaryRow label="Estimated taxes" value="Calculated at payment" />
            <SummaryDivider />
            {ownPayment ? (
              <SummaryRow label="Estimated total" value={estTotal} strong />
            ) : shopifyShipping != null ? (
              <SummaryRow label="Estimated total" value={fmt(baseAmount + shopifyShipping)} strong />
            ) : null}
            <ConsentNote />
            <TrustBox />
          </div>
        </>
      }
      footerBar={
        <button form="address-form" type="submit" disabled={busy} className="h-12 w-full rounded-ds-md bg-foreground text-ds-regular font-semibold text-background disabled:opacity-60">
          {busy ? 'Saving…' : (!ownPayment && (!address || editing)) ? 'Continue to delivery' : 'Continue to payment'}
        </button>
      }
    >
      <CheckoutProgress step="Address" backHref="/cart" />

      <Form id="address-form" method="post" className="grid gap-6">
        {/* ---- Shipping ---- */}
        <div className="grid gap-3">
          <h1 className="text-ds-regular font-semibold text-foreground">Shipping address</h1>
          {!editing && a ? (
            <CheckoutCard>
              <div className="flex items-start justify-between gap-3">
                <div className="text-ds-small leading-relaxed text-foreground">
                  <p className="font-semibold">
                    {a.firstName} {a.lastName}
                  </p>
                  <p>
                    {a.address1}
                    {a.address2 ? `, ${a.address2}` : ''}
                  </p>
                  <p>
                    {a.city}, {a.state} {a.zip}
                  </p>
                  <p>United States</p>
                  <p className="text-muted-foreground">{formatPhone(a.phone)}</p>
                  <p className="text-muted-foreground">{a.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="shrink-0 rounded-ds-md border border-foreground px-3 py-1.5 text-ds-small font-medium text-foreground hover:bg-muted"
                >
                  Edit address
                </button>
              </div>
              {/* Keep values posting while the card is collapsed */}
              {ADDRESS_FIELDS.map((f) => (
                <input key={f.name} type="hidden" name={f.name} value={a[f.name] ?? ''} />
              ))}
            </CheckoutCard>
          ) : (
            <CheckoutCard>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="email" type="email" label="Email" required autoComplete="email" defaultValue={a?.email} error={errs.email} className="sm:col-span-2" hint="For your order confirmation and receipt." />
                <Field name="firstName" label="First name" required autoComplete="given-name" defaultValue={a?.firstName} error={errs.firstName} />
                <Field name="lastName" label="Last name" required autoComplete="family-name" defaultValue={a?.lastName} error={errs.lastName} />
                <Field name="address1" label="Street address" required autoComplete="address-line1" defaultValue={a?.address1} error={errs.address1} className="sm:col-span-2" />
                <Field name="address2" label="Apt, suite, unit, or building" autoComplete="address-line2" defaultValue={a?.address2} className="sm:col-span-2" />
                <Field name="zip" label="ZIP code" required inputMode="numeric" autoComplete="postal-code" defaultValue={a?.zip} error={errs.zip} />
                <Field name="city" label="City" required autoComplete="address-level2" defaultValue={a?.city} error={errs.city} />
                <StateSelect name="state" defaultValue={a?.state} error={errs.state} />
                <CountryField />
                <Field name="phone" type="tel" label="Phone number" required inputMode="tel" autoComplete="tel" defaultValue={a?.phone} error={errs.phone} className="sm:col-span-2" hint="Just in case we need to reach you about delivery." />
              </div>
            </CheckoutCard>
          )}
        </div>

        {/* ---- Billing ---- */}
        <label className="flex cursor-pointer items-center gap-3 text-ds-small font-medium text-foreground">
          <input
            type="checkbox"
            name="sameBilling"
            checked={sameBilling}
            onChange={(e) => setSameBilling(e.target.checked)}
            className="size-4 accent-foreground"
          />
          Same shipping and billing address
        </label>

        {!sameBilling ? (
          <div className="grid gap-3">
            <h2 className="text-ds-regular font-semibold text-foreground">Billing address</h2>
            <CheckoutCard>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="billing_firstName" label="First name" required autoComplete="billing given-name" defaultValue={billing?.firstName} error={errs.billing_firstName} />
                <Field name="billing_lastName" label="Last name" required autoComplete="billing family-name" defaultValue={billing?.lastName} error={errs.billing_lastName} />
                <Field name="billing_address1" label="Street address" required autoComplete="billing address-line1" defaultValue={billing?.address1} error={errs.billing_address1} className="sm:col-span-2" />
                <Field name="billing_address2" label="Apt, suite, unit, or building" autoComplete="billing address-line2" defaultValue={billing?.address2} className="sm:col-span-2" />
                <Field name="billing_zip" label="ZIP code" required inputMode="numeric" autoComplete="billing postal-code" defaultValue={billing?.zip} error={errs.billing_zip} />
                <Field name="billing_city" label="City" required autoComplete="billing address-level2" defaultValue={billing?.city} error={errs.billing_city} />
                <StateSelect name="billing_state" defaultValue={billing?.state} error={errs.billing_state} />
                <CountryField />
              </div>
            </CheckoutCard>
          </div>
        ) : null}

        {/* ---- Delivery method (our own payment only; Shopify checkout picks shipping itself) ---- */}
        {ownPayment ? (
        <div className="grid gap-3">
          <h2 className="text-ds-regular font-semibold text-foreground">Select delivery method</h2>
          <CheckoutCard>
            <SummaryItems lines={lines.map((l) => ({...l, price: undefined}))} />
            <div role="radiogroup" aria-label="Delivery method" className="grid gap-3">
              {SHIPPING_OPTIONS.map((o) => {
                const on = deliveryId === o.id;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-ds-md p-4 transition-colors ${on ? 'border-2 border-foreground' : 'border border-border hover:border-foreground/40'}`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="delivery"
                        value={o.id}
                        checked={on}
                        onChange={() => setDeliveryId(o.id)}
                        className="size-4 accent-foreground"
                      />
                      <span className="grid">
                        <span className="text-ds-small font-semibold text-foreground">{o.title}</span>
                        <span className="flex items-center gap-1.5 text-ds-small text-muted-foreground">
                          {o.id === 'expedited' ? <Zap className="size-3.5" aria-hidden="true" /> : <Truck className="size-3.5" aria-hidden="true" />}
                          Arrives in {o.eta}
                        </span>
                      </span>
                    </span>
                    <span className={`text-ds-small font-semibold ${o.cents === 0 ? 'text-positive' : 'text-foreground'}`}>
                      {shippingLabel(o.cents)}
                    </span>
                  </label>
                );
              })}
            </div>
          </CheckoutCard>
        </div>
        ) : null}

        {/* ---- Delivery method from Shopify (Shopify takes payment) ---- */}
        {!ownPayment && address && !editing ? (
          <div id="delivery" className="grid scroll-mt-24 gap-3">
            <h2 className="text-ds-regular font-semibold text-foreground">Select delivery method</h2>
            {groups.length ? (
              groups.map((g) => (
                <CheckoutCard key={g.id}>
                  <SummaryItems lines={g.items.map((i) => ({id: i.id, title: i.title, qty: i.quantity, image: i.image}))} />
                  <div role="radiogroup" aria-label="Delivery method" className="grid gap-3">
                    {g.options.map((o) => {
                      const on = picked[g.id] === o.handle;
                      const cost = Number(o.estimatedCost.amount);
                      return (
                        <label
                          key={o.handle}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-ds-md p-4 transition-colors ${on ? 'border-2 border-foreground' : 'border border-border hover:border-foreground/40'}`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`ship:${g.id}`}
                              value={o.handle}
                              checked={on}
                              onChange={() => setPicked((p) => ({...p, [g.id]: o.handle}))}
                              className="size-4 accent-foreground"
                            />
                            <span className="grid">
                              <span className="text-ds-small font-semibold text-foreground">{o.title ?? 'Shipping'}</span>
                              {o.description ? (
                                <span className="flex items-center gap-1.5 text-ds-small text-muted-foreground">
                                  <Truck className="size-3.5" aria-hidden="true" />
                                  {o.description}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className={`text-ds-small font-semibold ${cost === 0 ? 'text-positive' : 'text-foreground'}`}>
                            {cost === 0 ? 'Free' : fmt(cost)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CheckoutCard>
              ))
            ) : (
              <CheckoutCard>
                <p className="text-ds-small text-muted-foreground">
                  We could not load shipping options for this address. Check the address above, or continue and choose shipping in the secure payment step.
                </p>
              </CheckoutCard>
            )}
          </div>
        ) : null}

        {result?.error ? (
          <p role="alert" className="rounded-ds-md bg-destructive/10 px-4 py-3 text-ds-small text-destructive">
            {result.error}
          </p>
        ) : null}

        <div className="hidden justify-end lg:flex">
          <button type="submit" disabled={busy} className="h-12 rounded-ds-md bg-foreground px-8 text-ds-regular font-semibold text-background hover:bg-foreground/90 disabled:opacity-60">
            {busy ? 'Saving…' : (!ownPayment && (!address || editing)) ? 'Continue to delivery' : 'Next'}
          </button>
        </div>
      </Form>

      <Perks />
    </CheckoutShell>
  );
}
