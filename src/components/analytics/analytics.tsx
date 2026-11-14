'use client';
// Analytics event bus (page_viewed, product_viewed, cart events…). GA4 subscribes in ga4.tsx.
// Same event names and payloads as Hydrogen's <Analytics.Provider>, so subscribers didn't change.
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';


type Handler = (payload: any) => void;
type AnalyticsValue = {
  publish: (event: string, payload: any) => void;
  subscribe: (event: string, handler: Handler) => void;
  register: (name: string) => {ready: () => void};
  canTrack: () => boolean;
  shop: any;
  cart: any;
  prevCart: any;
  customData?: Record<string, unknown>;
};

const AnalyticsContext = createContext<AnalyticsValue | null>(null);

export type CartViewPayload = Record<string, unknown>;

function lineMap(cart: any): Map<string, any> {
  const nodes = cart?.lines?.nodes ?? [];
  return new Map(nodes.map((l: any) => [l.id, l]));
}

function AnalyticsProvider({children, cart, shop, consent: _consent}: {children: ReactNode; cart?: unknown; shop?: unknown; consent?: unknown}) {
  const handlers = useRef(new Map<string, Set<Handler>>());
  const [shopData, setShopData] = useState<any>(null);
  const [cartData, setCartData] = useState<{cart: any; prevCart: any}>({cart: null, prevCart: null});

  useEffect(() => {
    let live = true;
    Promise.resolve(shop).then((s) => live && setShopData(s ?? null));
    return () => {
      live = false;
    };
  }, [shop]);

  const publish = useCallback((event: string, payload: any) => {
    handlers.current.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        console.error('[analytics]', event, e);
      }
    });
  }, []);

  const subscribe = useCallback((event: string, h: Handler) => {
    if (!handlers.current.has(event)) handlers.current.set(event, new Set());
    handlers.current.get(event)!.add(h);
  }, []);

  // Cart events from cart diffs, like Hydrogen's <Analytics.Provider>.
  useEffect(() => {
    let live = true;
    Promise.resolve(cart).then((next: any) => {
      if (!live) return;
      setCartData((prev) => {
        const before = lineMap(prev.cart);
        const after = lineMap(next);
        if (prev.cart) {
          for (const [id, line] of after) {
            const old = before.get(id);
            if (!old || line.quantity > old.quantity)
              publish('product_added_to_cart', {cart: next, prevCart: prev.cart, currentLine: line, prevLine: old, shop: shopData, url: location.href});
            else if (line.quantity < old.quantity)
              publish('product_removed_from_cart', {cart: next, prevCart: prev.cart, currentLine: line, prevLine: old, shop: shopData, url: location.href});
          }
          for (const [id, old] of before)
            if (!after.has(id))
              publish('product_removed_from_cart', {cart: next, prevCart: prev.cart, prevLine: old, shop: shopData, url: location.href});
        }
        return {cart: next ?? null, prevCart: prev.cart};
      });
    });
    return () => {
      live = false;
    };
  }, [cart, publish, shopData]);

  // page_viewed on every route change.
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  useEffect(() => {
    publish('page_viewed', {url: window.location.href, shop: shopData});
  }, [pathname, search, publish, shopData]);

  const value = useMemo<AnalyticsValue>(
    () => ({
      publish,
      subscribe,
      register: () => ({ready: () => {}}),
      canTrack: () => true,
      shop: shopData,
      cart: cartData.cart,
      prevCart: cartData.prevCart,
    }),
    [publish, subscribe, shopData, cartData],
  );
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsValue {
  const value = useContext(AnalyticsContext);
  if (!value) {
    return {publish: () => {}, subscribe: () => {}, register: () => ({ready: () => {}}), canTrack: () => false, shop: null, cart: null, prevCart: null};
  }
  return value;
}

function viewEvent(event: string) {
  return function View({data, customData}: {data?: any; customData?: Record<string, unknown>}) {
    const {publish, shop} = useAnalytics();
    const sent = useRef<string | null>(null);
    const key = JSON.stringify(data ?? {});
    useEffect(() => {
      if (sent.current === key) return;
      sent.current = key;
      publish(event, {...data, customData, shop, url: window.location.href});
    }, [key, publish, shop]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  };
}

export const Analytics = {
  Provider: AnalyticsProvider,
  ProductView: viewEvent('product_viewed'),
  CollectionView: viewEvent('collection_viewed'),
  SearchView: viewEvent('search_viewed'),
  CartView: viewEvent('cart_viewed'),
  CustomView: viewEvent('custom_event'),
};

