'use client';
// Path: app/components/collections/infinite-product-grid.tsx
// Remount with key={search} so a filter or sort change starts a fresh list.
// loadMore is a Server Action (see features/collection/actions.ts).
import {LoaderCircleIcon} from 'lucide-react';
import {useEffect, useRef, useState, useTransition} from 'react';
import {toDataUrl} from '~/compat/router.client';
import {ProductCard} from '~/components/product-card/product-card';
import type {ProductCardData} from '~/components/product-card/types';

type PageInfo = {hasNextPage: boolean; endCursor?: string | null};
export type LoadMore = (cursor: string) => Promise<{pageInfo: PageInfo; products: ProductCardData[]}>;

// Pages not yet given a Server Action (search) re-run their loader through the compat data endpoint.
// TODO: remove once search passes loadMore.
async function loadViaRoute(cursor: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('cursor', cursor);
  const res = await fetch(toDataUrl(url.pathname + url.search));
  const json = (await res.json()) as {data: {pageInfo: PageInfo; products: ProductCardData[]}};
  return json.data;
}

export function InfiniteProductGrid({
  initialPageInfo,
  initialProducts,
  showSale = false,
  variant = 'minimal',
  loadMore = loadViaRoute,
}: {
  /** Loads the page after `cursor` (a Server Action). */
  loadMore?: LoadMore;
  initialPageInfo: PageInfo;
  initialProducts: ProductCardData[];
  showSale?: boolean;
  variant?: 'default' | 'minimal';
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState<ProductCardData[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo);
  const [loading, startLoading] = useTransition();

  const {endCursor, hasNextPage} = pageInfo;
  const canLoad = Boolean(hasNextPage && endCursor);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !canLoad || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || !endCursor) return;
        observer.disconnect();
        startLoading(async () => {
          const next = await loadMore(endCursor);
          setExtra((prev) => {
            const seen = new Set([...initialProducts, ...prev].map((p) => p.id));
            return [...prev, ...next.products.filter((p) => !seen.has(p.id))];
          });
          setPageInfo(next.pageInfo);
        });
      },
      {rootMargin: '400px'},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoad, endCursor, initialProducts, loadMore, loading]);

  return (
    <>
      <div className="grid grid-cols-2 gap-(--grid-gutter) sm:grid-cols-3 lg:grid-cols-3 [&_[data-slot=product-card-image]]:aspect-5/4">
        {[...initialProducts, ...extra].map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            variant={variant}
            showSale={showSale}
            loading={index < 6 ? 'eager' : undefined}
          />
        ))}
      </div>
      {canLoad ? (
        <div ref={sentinel} className="flex justify-center py-10">
          {loading ? (
            <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
