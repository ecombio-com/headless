'use client';
// All products (/collections/all) view. Ported from Hydrogen routes/($locale).collections.all.tsx (5524ec2).
import {useSearchParams} from 'next/navigation';
import {BrowseNavigationProvider, useBrowseNavigation} from '~/components/collections/browse-navigation';
import {InfiniteProductGrid, type LoadMore} from '~/components/collections/infinite-product-grid';
import {SortSelect} from '~/components/collections/sort-select';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {cn} from '~/lib/cn';
import type {CatalogData} from './catalog';

export function CatalogView({data, loadMore}: {data: CatalogData; loadMore: LoadMore}) {
  return (
    <BrowseNavigationProvider>
      <CatalogBody data={data} loadMore={loadMore} />
    </BrowseNavigationProvider>
  );
}

function CatalogBody({data, loadMore}: {data: CatalogData; loadMore: LoadMore}) {
  const {pageInfo, products} = data;
  const search = useSearchParams()?.toString() ?? '';
  const {isPending: pending} = useBrowseNavigation();

  return (
    <Page className="pt-2.5 pb-10 md:pt-10">
      <Container>
        <Sections className="gap-5">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-[56px] md:leading-[1.14]">
            All products
          </h1>

          <div className="sticky top-[calc(var(--header-offset,0px)_+_0.75rem)] z-20 flex items-center rounded-2xl border border-border-subtle bg-card px-4 py-3 [transition:var(--header-offset-transition,none)]">
            <div className="ml-auto">
              <SortSelect exclude={['best-selling']} />
            </div>
          </div>

          <div className={cn('min-w-0 transition-opacity duration-200', pending && 'pointer-events-none opacity-50')}>
            {products.length === 0 ? (
              <div className="py-10 text-center">
                <h2 className="mb-2 text-2xl">No products found</h2>
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
        </Sections>
      </Container>
    </Page>
  );
}
