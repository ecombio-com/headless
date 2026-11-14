'use client';
// Collection page view: hub layout or the standard browse grid with filters.
import {useSearchParams} from 'next/navigation';
import {Analytics} from '~/components/analytics/analytics';
import {cn} from '~/lib/cn';
import type {CollectionData} from './collection';
import {BrowseNavigationProvider, useBrowseNavigation} from '~/components/collections/browse-navigation';
import type {LoadMore} from '~/components/collections/infinite-product-grid';
import {DealsSection, DeferredAfterItemList, ReviewsSection} from '~/components/collections/collection-sections';
import {CollectionHubPage} from '~/components/collections/hub-page';
import {CollectionTabs} from '~/components/collections/collection-tabs';
import {FilterSheet, FilterSidebar} from '~/components/collections/filter-sidebar';
import {InfiniteProductGrid} from '~/components/collections/infinite-product-grid';
import {SortSelect} from '~/components/collections/sort-select';
import {Container} from '~/components/ui/container';
import LocalizedLink from '~/components/ui/localized-link';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {parseBrowseParams} from '~/lib/collection-browse';


const TRUST = ['1-year warranty', 'Free standard shipping', 'Free 30-day returns', 'Friendly support'];

export function CollectionView({data, loadMore}: {data: CollectionData; loadMore: LoadMore}) {
  if (data.kind === 'hub') {
    return (
      <CollectionHubPage
        afterItemPage={data.afterItemPage}
        articles={data.articles}
        collection={data.collection}
        deals={data.deals}
        featured={data.featured}
        guides={data.guides}
        hero={data.hero}
        reviews={data.reviews}
        subCollections={data.subCollections}
      />
    );
  }

  const {
    afterItemPage,
    articles,
    collection,
    deals,
    filters,
    pageInfo,
    parent,
    priceRange,
    productCount,
    products,
    reviews,
    subCollections,
  } = data;
  return (
    <BrowseNavigationProvider>
      <StandardCollection
        {...{afterItemPage, articles, collection, deals, filters, loadMore, pageInfo, parent, priceRange, productCount, products, reviews, subCollections}}
      />
    </BrowseNavigationProvider>
  );
}

type Standard = Extract<CollectionData, {kind: 'standard'}>;

function StandardCollection({
  afterItemPage,
  articles,
  collection,
  deals,
  filters,
  loadMore,
  pageInfo,
  parent,
  priceRange,
  productCount,
  products,
  reviews,
  subCollections,
}: Omit<Standard, 'kind' | 'canonicalUrl' | 'collectionLd' | 'breadcrumbLd'> & {loadMore: LoadMore}) {
  const search = useSearchParams()?.toString() ?? '';
  const {isPending: pending} = useBrowseNavigation();
  const activeCount = parseBrowseParams(search).filters.length;

  return (
    <Page className="pt-2.5 pb-10 md:pt-10">
      <Container>
        <Sections className="gap-5">
          <div>
            {parent ? (
              <nav aria-label="Breadcrumb" className="mb-4 text-ds-regular text-muted-foreground">
                <LocalizedLink href="/" className="hover:text-foreground">Home</LocalizedLink>
                <span aria-hidden="true" className="mx-2">/</span>
                <LocalizedLink href={`/collections/${parent.handle}`} className="hover:text-foreground">
                  {parent.title}
                </LocalizedLink>
                <span aria-hidden="true" className="mx-2">/</span>
                <span aria-current="page">{collection.title}</span>
              </nav>
            ) : null}
            <div className="grid gap-4 rounded-ds-lg bg-muted px-6 py-5 text-ds-regular font-medium sm:grid-cols-2 lg:grid-cols-4">
              {TRUST.map((text) => (
                <span key={text} className="flex items-center gap-3">
                  <span className="size-2 rounded-full bg-highlight" />
                  {text}
                </span>
              ))}
            </div>
            <h1 className="mt-10 font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-[56px] md:leading-[1.14]">
              {collection.title}
            </h1>
            {collection.description ? (
              <p className="mt-3 max-w-2xl leading-6 text-foreground">{collection.description}</p>
            ) : null}
          </div>

          {subCollections.length > 0 ? (
            <nav aria-label="Shop by type" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {subCollections.map((sub) => (
                <LocalizedLink
                  key={sub.handle}
                  href={`/collections/${sub.handle}`}
                  className="shrink-0 whitespace-nowrap rounded-full bg-secondary px-4 py-3 text-ds-regular font-medium transition-colors hover:bg-input"
                >
                  {sub.title}
                </LocalizedLink>
              ))}
            </nav>
          ) : null}

          <CollectionTabs articles={articles} productCount={productCount}>
          <div className="flex flex-col gap-5">
            <div className="sticky top-[calc(var(--header-offset,0px)_+_0.75rem)] z-20 flex items-center gap-3 rounded-2xl border border-border-subtle bg-card px-4 py-3 [transition:var(--header-offset-transition,none)] sm:gap-5">
              <div className="lg:hidden">
                <FilterSheet count={activeCount}>
                  <FilterSidebar filters={filters} priceRange={priceRange} />
                </FilterSheet>
              </div>
              <div className="ml-auto">
                <SortSelect />
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
              <aside className="hidden rounded-2xl border border-border-subtle bg-card p-4 lg:sticky lg:top-[calc(var(--header-offset,0px)_+_5.25rem)] lg:block lg:max-h-[calc(100vh_-_var(--header-offset,0px)_-_5.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]">
                <FilterSidebar filters={filters} priceRange={priceRange} />
              </aside>
              <div className={cn('min-w-0 transition-opacity duration-200', pending && 'pointer-events-none opacity-50')}>
                <DealsSection deals={deals} title={collection.title} />
                {products.length === 0 ? (
                  <div className="py-10 text-center">
                    <h2 className="mb-2 text-2xl">No products found</h2>
                    <p className="text-muted-foreground">Try removing a filter.</p>
                  </div>
                ) : (
                  <InfiniteProductGrid
                    key={search}
                    initialProducts={products}
                    initialPageInfo={pageInfo}
                    loadMore={loadMore}
                  />
                )}
              </div>
            </div>
          </div>
          </CollectionTabs>

          <ReviewsSection reviews={reviews} title={collection.title} />
          <DeferredAfterItemList page={afterItemPage} />
        </Sections>
      </Container>
      <Analytics.CollectionView
        data={{collection: {id: collection.id, handle: collection.handle}}}
      />
    </Page>
  );
}
