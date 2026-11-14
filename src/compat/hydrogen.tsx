'use client';
// Client-side stand-ins for the @shopify/hydrogen APIs the ported components use.
// Image and Money come straight from @shopify/hydrogen-react (works outside Hydrogen).
// Temporary seam: new code should import hydrogen-react and ~/core directly.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {Link, useFetcher, type FetcherWithComponents} from './router.client';
import {CART_ACTIONS, CART_FORM_INPUT_NAME, getCartFormInput, type CartActionName} from '~/core/shopify/cart-form';

export {
  Image,
  Money,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  flattenConnection,
} from '@shopify/hydrogen-react';
export type {MappedProductOptions} from '@shopify/hydrogen-react';

/* ------------------------------------------------------------------ CartForm */

type CartFormProps = {
  route?: string;
  action: CartActionName;
  inputs?: Record<string, unknown>;
  fetcherKey?: string;
  children: ReactNode | ((fetcher: FetcherWithComponents) => ReactNode);
};

export function CartForm({route = '/cart', action, inputs, fetcherKey, children}: CartFormProps) {
  const fetcher = useFetcher({key: fetcherKey});
  return (
    <fetcher.Form action={route} method="post">
      {(action || inputs) && (
        <input type="hidden" name={CART_FORM_INPUT_NAME} value={JSON.stringify({action, inputs})} />
      )}
      {typeof children === 'function' ? children(fetcher) : children}
    </fetcher.Form>
  );
}
CartForm.ACTIONS = CART_ACTIONS;
CartForm.INPUT_NAME = CART_FORM_INPUT_NAME;
CartForm.getFormInput = getCartFormInput;

/* ------------------------------------------------------------------ optimistic cart */

export type OptimisticCart<T = any> = [T] extends [null | undefined] ? any : NonNullable<T> & {isOptimistic?: boolean};
export type OptimisticCartLine<T = any> = ([T] extends [{lines: {nodes: (infer L)[]}}] ? L : any) & {isOptimistic?: boolean};
export type OptimisticCartLineInput = {merchandiseId: string; quantity?: number; selectedVariant?: unknown; sellingPlanId?: string | null};
export type CartQueryDataReturn = {cart: any; errors?: any; warnings?: any};

// No optimistic overlay yet: the cart refreshes after each action (router.refresh).
export function useOptimisticCart<T>(cart: T): OptimisticCart<T> {
  return cart as OptimisticCart<T>;
}

export function useOptimisticVariant<V>(selected: V, _variants?: unknown): NonNullable<V> {
  return selected as NonNullable<V>;
}

export {Analytics, useAnalytics, type CartViewPayload} from '~/components/analytics/analytics';

/* ------------------------------------------------------------------ Pagination */

type Connection<N> = {
  nodes: N[];
  pageInfo: {hasNextPage: boolean; hasPreviousPage: boolean; startCursor?: string | null; endCursor?: string | null};
};

// Cursor links in the URL (?cursor=…&direction=next|previous). Shows the current page only.
export function Pagination<N>({
  connection,
  children,
}: {
  connection: Connection<N>;
  children: (args: {
    nodes: N[];
    isLoading: boolean;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPageUrl: string;
    previousPageUrl: string;
    NextLink: (p: {children?: ReactNode; className?: string}) => ReactNode;
    PreviousLink: (p: {children?: ReactNode; className?: string}) => ReactNode;
    state: {nodes: N[]};
  }) => ReactNode;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const url = (cursor: string | null | undefined, direction: string) => {
    const p = new URLSearchParams(sp?.toString() ?? '');
    if (cursor) p.set('cursor', cursor);
    p.set('direction', direction);
    return `${pathname}?${p.toString()}`;
  };
  const {pageInfo, nodes} = connection;
  const nextPageUrl = url(pageInfo.endCursor, 'next');
  const previousPageUrl = url(pageInfo.startCursor, 'previous');
  return (
    <>
      {children({
        nodes,
        isLoading: false,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: pageInfo.hasPreviousPage,
        nextPageUrl,
        previousPageUrl,
        state: {nodes},
        NextLink: ({children: c, className}) =>
          pageInfo.hasNextPage ? (
            <Link to={nextPageUrl} preventScrollReset className={className}>
              {c}
            </Link>
          ) : null,
        PreviousLink: ({children: c, className}) =>
          pageInfo.hasPreviousPage ? (
            <Link to={previousPageUrl} preventScrollReset className={className}>
              {c}
            </Link>
          ) : null,
      })}
    </>
  );
}

/* ------------------------------------------------------------------ misc */

export function useNonce(): string | undefined {
  return undefined;
}
export function NonceProvider({children}: {children: ReactNode; value?: string}) {
  return <>{children}</>;
}
