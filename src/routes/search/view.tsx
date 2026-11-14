'use client';
// Ported from ($locale).search.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {Analytics} from '~/compat/hydrogen';
import {cn} from '~/lib/cn';
import {useLoaderData, useLocation, useNavigation} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {TrackSearchClicks} from '~/@algolia';
import {FilterSheet, FilterSidebar} from '~/components/collections/filter-sidebar';
import {InfiniteProductGrid} from '~/components/collections/infinite-product-grid';
import {SortSelect} from '~/components/collections/sort-select';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {SEARCH_SORT_EXCLUDE, parseBrowseParams} from '~/lib/collection-browse';


export default function SearchPage() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigation = useNavigation();
  if (data.type === 'predictive') return null;

  const {filters, pageInfo, priceRange, products, term, total, tracking} = data;
  const pending =
    navigation.state === 'loading' &&
    navigation.location?.pathname === location.pathname;
  const activeCount = parseBrowseParams(location.search).filters.length;
  const countLabel = `${total.toLocaleString('en-US')} ${total === 1 ? 'Item' : 'Items'}`;

  return (
    <Page className="pt-2.5 pb-10 md:pt-10">
      <Container>
        <Sections className="gap-5">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-[56px] md:leading-[1.14]">
            Search{term ? ` for "${term}"` : ''}
          </h1>

          <div className="flex flex-col gap-5">
            <div className="sticky top-[calc(var(--header-offset,0px)_+_0.75rem)] z-20 flex items-center gap-3 rounded-2xl border border-border-subtle bg-card px-4 py-3 [transition:var(--header-offset-transition,none)] sm:gap-5">
              <div className="lg:hidden">
                <FilterSheet count={activeCount}>
                  <FilterSidebar filters={filters} priceRange={priceRange} />
                </FilterSheet>
              </div>
              <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-5">
                {total > 0 ? (
                  <span className="hidden text-ds-regular text-muted-foreground sm:block">
                    {countLabel}
                  </span>
                ) : null}
                <SortSelect exclude={SEARCH_SORT_EXCLUDE} />
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
              <aside className="hidden rounded-2xl border border-border-subtle bg-card p-4 lg:sticky lg:top-[calc(var(--header-offset,0px)_+_5.25rem)] lg:block lg:max-h-[calc(100vh_-_var(--header-offset,0px)_-_5.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]">
                <FilterSidebar filters={filters} priceRange={priceRange} />
              </aside>
              <div
                className={cn(
                  'min-w-0 transition-opacity duration-200',
                  pending && 'pointer-events-none opacity-50',
                )}
              >
                {products.length === 0 ? (
                  <div className="py-10 text-center">
                    <h2 className="mb-2 text-2xl">No products found</h2>
                    <p className="text-muted-foreground">
                      {term
                        ? `We couldn't find any products matching "${term}"`
                        : 'No products available'}
                    </p>
                  </div>
                ) : (
                  <InfiniteProductGrid
                    key={location.search}
                    initialProducts={products}
                    initialPageInfo={pageInfo}
                    variant="default"
                    showSale
                  />
                )}
              </div>
            </div>
          </div>
        </Sections>
      </Container>
      {tracking ? (
        <TrackSearchClicks
          config={tracking.config}
          queryID={tracking.queryID}
          firstPageCount={tracking.firstPageCount}
        />
      ) : null}
      {term ? (
        <Analytics.SearchView
          data={{searchTerm: term, searchResults: {total, items: {products}}}}
        />
      ) : null}
    </Page>
  );
}
