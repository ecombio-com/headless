// Ported from ($locale).search.tsx by scripts/split-route.mjs.
import type {PredictiveSearchQuery} from 'storefrontapi.generated';
import type {Route} from '~/server/route-types';
import {isAlgoliaReady, toPublicAlgoliaConfig, type PublicAlgoliaConfig} from '~/@algolia/config';
import type {ProductCardData} from '~/components/product-card/types';
import {PRODUCTS_PER_PAGE, parseBrowseParams, parseSortBy} from '~/lib/collection-browse';
import {transformShopifyFilters, type Filter, type PriceRange} from '~/lib/collection-filters';
import {PRODUCT_CARD_FRAGMENT, toProductCardData} from '~/lib/product-card';
import {getEmptyPredictiveSearchResult, type PredictiveSearchReturn} from '~/lib/search';
import {parseAlgoliaCursor, searchViaAlgolia} from '~/lib/search-algolia.server';
import {isHiddenPageHandle} from '~/lib/hidden-pages';
import {getStorefrontConfig, isOtherBrandHandle} from '~/lib/storefront-config';


export const meta: Route.MetaFunction = ({data}) => {
  const term = data?.type === 'browse' ? data.term : '';
  return [
    {title: term ? `Search results for "${term}"` : 'Search'},
    {
      name: 'description',
      content: term
        ? `Find products matching "${term}"`
        : 'Search for products in our store',
    },
    {name: 'robots', content: 'noindex, nofollow'},
  ];
};

type BrowseSearchData = {
  type: 'browse';
  term: string;
  total: number;
  products: ProductCardData[];
  pageInfo: {hasNextPage: boolean; endCursor: string | null};
  filters: Filter[];
  priceRange?: PriceRange;
  tracking: {
    config: PublicAlgoliaConfig;
    queryID?: string;
    firstPageCount: number;
  } | null;
};

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  // The header search modal loads this route with ?predictive=true.
  if (url.searchParams.has('predictive')) {
    return predictiveSearch({request, context});
  }
  return browseSearch({request, context});
}

function escapeQuery(value: string) {
  return value.replace(/'/g, "\\'");
}

// Same rule as Next: text AND collection scope, "*" when there is neither.
function buildSearchQuery(term: string, collection?: string): string {
  const parts: string[] = [];
  if (term) parts.push(term);
  if (collection) parts.push(`collection:'${escapeQuery(collection)}'`);
  return parts.length > 0 ? parts.join(' AND ') : '*';
}

// Storefront search sorts by RELEVANCE or PRICE only.
function toSearchSort(sortBy?: string | null) {
  const {sortKey, reverse} = parseSortBy(sortBy);
  return sortKey === 'PRICE'
    ? {sortKey: 'PRICE' as const, reverse}
    : {sortKey: 'RELEVANCE' as const, reverse: false};
}

async function browseSearch({
  request,
  context,
}: Pick<Route.LoaderArgs, 'request' | 'context'>): Promise<BrowseSearchData> {
  const {storefront, algolia} = context;
  const url = new URL(request.url);
  const term = (url.searchParams.get('q') ?? '').trim();
  const {slug} = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID);
  const requestedCollection = url.searchParams.get('collection') || undefined;
  // Another brand's collection scope is ignored on this storefront.
  const collection =
    requestedCollection && !isOtherBrandHandle(requestedCollection, slug)
      ? requestedCollection
      : undefined;
  const cursor = url.searchParams.get('cursor') || undefined;
  const {filters, sortBy} = parseBrowseParams(url.searchParams);
  const query = buildSearchQuery(term, collection);
  const productFilters = filters.length > 0 ? filters : undefined;
  // null = a Shopify cursor, 0 = first page, N = an "algolia:N" cursor.
  const algoliaPage = cursor ? parseAlgoliaCursor(cursor) : 0;
  const empty: BrowseSearchData = {
    type: 'browse',
    term,
    total: 0,
    products: [],
    pageInfo: {hasNextPage: false, endCursor: null},
    filters: [],
    priceRange: undefined,
    tracking: null,
  };

  // Algolia ranks plain text searches (no filters applied). Anything else, or any failure,
  // runs the Shopify search below. The filter sidebar always comes from Shopify facets.
  const useAlgolia =
    isAlgoliaReady(algolia.config) &&
    term !== '' &&
    filters.length === 0 &&
    algoliaPage !== null;
  if (useAlgolia) {
    const [ranked, facets] = await Promise.all([
      searchViaAlgolia(algolia, storefront, {
        collection,
        hitsPerPage: PRODUCTS_PER_PAGE,
        page: algoliaPage ?? 0,
        query: term,
        sortBy,
      }),
      cursor
        ? null
        : storefront.query(SEARCH_FACETS_QUERY, {
            variables: {query, productFilters},
          }),
    ]);
    if (ranked) {
      const transformed = facets
        ? transformShopifyFilters(facets.search.productFilters, {
            activeFilters: filters,
            currencyCode: ranked.products[0]?.price.currencyCode,
          })
        : {filters: [] as Filter[], priceRange: undefined};
      const config = toPublicAlgoliaConfig(algolia.config);
      return {
        ...empty,
        total: ranked.total,
        products: ranked.products,
        pageInfo: {
          hasNextPage: ranked.pageInfo.hasNextPage,
          endCursor: ranked.pageInfo.endCursor,
        },
        filters: transformed.filters,
        priceRange: transformed.priceRange,
        tracking: config
          ? {
              config,
              queryID: ranked.queryID,
              firstPageCount: ranked.products.length,
            }
          : null,
      };
    }
  }

  // An "algolia:N" cursor can't be continued on Shopify.
  if (cursor && algoliaPage !== null) return empty;

  const {reverse, sortKey} = toSearchSort(sortBy);
  const {search} = await storefront.query(SEARCH_BROWSE_QUERY, {
    variables: {
      query,
      first: PRODUCTS_PER_PAGE,
      after: cursor,
      productFilters,
      sortKey,
      reverse,
    },
  });
  const products = search.nodes.flatMap((node) =>
    node.__typename === 'Product' ? [{...toProductCardData(node), trackingParameters: node.trackingParameters}] : [],
  );
  const transformed = transformShopifyFilters(search.productFilters, {
    activeFilters: filters,
    currencyCode: products[0]?.price.currencyCode,
  });
  return {
    ...empty,
    total: search.totalCount,
    products,
    pageInfo: {
      hasNextPage: search.pageInfo.hasNextPage,
      endCursor: search.pageInfo.endCursor ?? null,
    },
    filters: transformed.filters,
    priceRange: transformed.priceRange,
  };
}

const SEARCH_FILTER_FRAGMENT = `#graphql
  fragment SearchFilterFields on Filter {
    id
    label
    type
    presentation
    values {
      id
      label
      count
      input
      swatch {
        color
        image {
          previewImage {
            url
          }
        }
      }
    }
  }
` as const;

const SEARCH_BROWSE_QUERY = `#graphql
  query SearchBrowse(
    $query: String!
    $first: Int!
    $after: String
    $productFilters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(
      query: $query
      first: $first
      after: $after
      productFilters: $productFilters
      sortKey: $sortKey
      reverse: $reverse
      types: PRODUCT
    ) {
      totalCount
      nodes {
        __typename
        ... on Product {
          ...ProductCardItem
          trackingParameters
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      productFilters {
        ...SearchFilterFields
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${SEARCH_FILTER_FRAGMENT}
` as const;

const SEARCH_FACETS_QUERY = `#graphql
  query SearchFacets(
    $query: String!
    $productFilters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(
      query: $query
      first: 1
      productFilters: $productFilters
      types: PRODUCT
    ) {
      totalCount
      productFilters {
        ...SearchFilterFields
      }
    }
  }
  ${SEARCH_FILTER_FRAGMENT}
` as const;

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
export async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & {errors?: Array<{message: string}>} =
    await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    });

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  const {slug} = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID);
  const collections = items.collections.filter((c) => !isOtherBrandHandle(c.handle, slug));
  const pages = items.pages.filter(
    (p) => !isHiddenPageHandle(p.handle) && !isOtherBrandHandle(p.handle, slug),
  );
  const removed =
    items.collections.length - collections.length + (items.pages.length - pages.length);
  return {
    type,
    term,
    result: {items: {...items, collections, pages}, total: total - removed},
  };
}
