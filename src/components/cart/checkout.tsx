'use client';
import {cn} from '~/lib/cn';
import posthog from 'posthog-js';
import {Loader2} from 'lucide-react';
import {useEffect, useState, type MouseEvent} from 'react';
import {useSiteOptional} from '~/components/layout/site-context';
import {forceCheckoutHost} from '~/lib/checkout-host';
import {Button, buttonVariants} from '~/components/ui/button';
import {COPY} from './copy';
import {useCartPending} from './use-cart-pending';

export function CartCheckout({checkoutUrl, hasLines}: {checkoutUrl?: string; hasLines: boolean}) {
  const isUpdating = useCartPending();
  const root = useSiteOptional();
  const shopifyMode = root?.checkoutMode === 'shopify';
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Back button restores the page from bfcache; clear the "Redirecting" state.
  useEffect(() => {
    const reset = () => setIsRedirecting(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  if (!checkoutUrl || !hasLines || isUpdating || isRedirecting) {
    const busy = isUpdating || isRedirecting;
    return (
      <Button
        type="button"
        disabled
        aria-busy={busy || undefined}
        aria-label={COPY.checkoutLabel}
        className="h-12 w-full justify-center"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {isRedirecting ? COPY.redirecting : isUpdating ? COPY.updatingCart : shopifyMode ? COPY.checkoutShopify : COPY.checkout}
      </Button>
    );
  }

  const startRedirect = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    posthog.capture('checkout_started', {checkout_method: 'shopify'});
    setIsRedirecting(true);
  };

  // Shopify mode: skip /address and /payment; go straight to Shopify hosted checkout (checkout.ecombio.com).
  if (shopifyMode) {
    return (
      <a
        href={forceCheckoutHost(checkoutUrl)}
        aria-label={COPY.checkoutLabel}
        onClick={startRedirect}
        className={cn(buttonVariants(), 'h-12 w-full justify-center')}
      >
        {COPY.checkoutShopify}
      </a>
    );
  }

  // Stripe mode: unchanged.
  return (
    <a
      href="/address"
      aria-label={COPY.checkoutLabel}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        posthog.capture('checkout_started', {checkout_method: 'stripe'});
        setIsRedirecting(true);
      }}
      className={cn(buttonVariants(), 'h-12 w-full justify-center')}
    >
      {COPY.checkout}
    </a>
  );
}


