// All products (/collections/all): data and SEO. The view is catalog-view.tsx.
// Ported from Hydrogen routes/($locale).collections.all.tsx (5524ec2): shared product grid, sort, canonical, ratings.
import 'server-only';
import type {Metadata} from 'next';
import {seoMetadata} from '~/features/seo';
import {PRODUCTS_PER_PAGE, parseBrowseParams, parseSortBy} from '~/lib/collection-browse';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/product-card';
import {withRatings} from '~/lib/ratings.server';
import type {AppContext} from '~/server/context';
import type {PageArgs} from '~/server/page';

// The top-level `products` query uses ProductSortKeys, not the collection sort keys parseSortBy returns.
function toProductSortKey(key: string) {
  switch (key) {
    case 'CREATED':
      return 'CREATED_AT' as const;
    case 'PRICE':
      return 'PRICE' as const;
    case 'TITLE':
      return 'TITLE' as const;
    case 'ID':
      return 'ID' as const;
    default:
      return 'BEST_SELLING' as const; // MANUAL / COLLECTION_DEFAULT / BEST_SELLING
  }
}

/** One page of products for /collections/all, sorted by the URL's sort_by. */
export async function fetchCatalogProducts(context: AppContext, search: string, cursor: string | null) {
  const {sortBy} = parseBrowseParams(new URLSearchParams(search));
  const {reverse, sortKey} = parseSortBy(sortBy);
  const {products} = await context.storefront.query(CATALOG_QUERY, {
    variables: {
      first: PRODUCTS_PER_PAGE,
      after: cursor,
      sortKey: toProductSortKey(String(sortKey)),
      reverse,
    },
  });
  return {pageInfo: products.pageInfo, products: await withRatings(context.yotpo, products.nodes)};
}

export async function loadCatalog({context, request}: PageArgs) {
  const url = new URL(request.url);
  const {pageInfo, products} = await fetchCatalogProducts(context, url.search, url.searchParams.get('cursor'));
  return {canonicalUrl: `${url.origin}${url.pathname}`, pageInfo, products};
}
export type CatalogData = Awaited<ReturnType<typeof loadCatalog>>;

export function catalogMetadata({canonicalUrl}: CatalogData, {context}: PageArgs): Metadata {
  const brand = context.storefrontConfig.name;
  return seoMetadata({
    title: `All products | ${brand}`,
    description: `Browse every product from ${brand}: electric bikes, scooters, skateboards and accessories.`,
    url: canonicalUrl,
    siteName: brand,
  });
}

const CATALOG_QUERY = `#graphql
  query Catalog(
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...ProductCardItem
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;