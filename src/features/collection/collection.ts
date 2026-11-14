// Collection pages (/collections/<handle>): data and SEO. The view is collection-view.tsx.
import 'server-only';
import {notFound, redirect} from 'next/navigation';
import {getLocaleFromRequest} from '~/core/config/i18n';
import {isOtherBrandHandle} from '~/core/config/storefronts';
import {PRODUCTS_PER_PAGE, parseBrowseParams, parseSortBy} from '~/lib/collection-browse';
import {transformShopifyFilters} from '~/lib/collection-filters';
import {loadAfterItemPage, loadCollectionArticles, loadCollectionDeals, loadCollectionReviews} from '~/lib/collection-extras.server';
import {getCollectionLayout, loadHub} from '~/lib/collection-hub.server';
import {buildCollectionSeo} from '~/lib/collection-seo';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/product-card';
import {withRatings} from '~/lib/ratings.server';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {seoMetadata} from '~/features/seo';
import type {AppContext} from '~/server/context';
import type {PageArgs} from '~/server/page';

export async function loadCollection({context, params, request}: PageArgs<'handle'>) {
  const {handle} = params;
  if (!handle) redirect(`${getLocaleFromRequest(request).pathPrefix}/collections`);

  // Subsidiary collections (e.g. scooterbio-all) only exist on their own storefront.
  if (isOtherBrandHandle(handle, context.storefrontConfig.slug)) {
    notFound();
  }

  // custom.layout = hub selects the parent-category layout. A failed lookup falls back to the standard page.
  const layout = await getCollectionLayout(context.storefront, handle).catch(
    () => 'standard' as const,
  );
  if (layout === 'missing') {
    notFound();
  }

  // Deferred sections. A failure hides that section, not the page.
  const deals = loadCollectionDeals(context, handle).catch(() => []);
  const reviews = loadCollectionReviews(context, handle).catch(() => null);

  if (layout === 'hub') {
    const hub = await loadHub(context, handle);
    if (!hub) notFound();
    redirectIfHandleIsLocalized(request, {handle, data: hub.collection});
    const seo = buildCollectionSeo({request, collection: hub.collection, brandName: context.storefrontConfig.name});
    return {kind: 'hub' as const, ...hub, ...seo, deals, reviews};
  }

  const afterItemPage = loadAfterItemPage(context.storefront, handle).catch(() => null);

  const url = new URL(request.url);
  const {filters, sortBy} = parseBrowseParams(url.searchParams);
  const {reverse, sortKey} = parseSortBy(sortBy);
  const cursor = url.searchParams.get('cursor');

  const articlesPromise = loadCollectionArticles(context.storefront, handle).catch(() => []);
  const {collection} = await context.storefront.query(COLLECTION_BROWSE_QUERY, {
    variables: {
      handle,
      first: PRODUCTS_PER_PAGE,
      after: cursor,
      sortKey,
      reverse,
      filters: filters.length > 0 ? filters : undefined,
    },
  });

  if (!collection) {
    notFound();
  }
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  const products = await withRatings(context.yotpo, collection.products.nodes);
  const {filters: facets, priceRange} = transformShopifyFilters(collection.products.filters, {
    activeFilters: filters,
    currencyCode: products[0]?.price.currencyCode,
  });

  const parentRef = collection.parent?.reference;
  const parent = parentRef && 'handle' in parentRef ? {handle: parentRef.handle, title: parentRef.title} : null;
  const subCollections = (collection.subCollections?.references?.nodes ?? []).flatMap((node) =>
    'handle' in node ? [{handle: node.handle, title: node.title}] : [],
  );

  // No collection total in the Storefront API: sum the availability facet (in stock + out of stock), like Next.js.
  const availability = collection.products.filters.find((filter) => /availab/i.test(filter.id + ' ' + filter.label));
  const productCount = availability?.values.reduce((sum, value) => sum + value.count, 0) ?? 0;
  const articles = await articlesPromise;

  const seo = buildCollectionSeo({request, collection, parent, brandName: context.storefrontConfig.name});
  // Send only what the page and meta use. The raw collection also carries every product node and facet, already sent as products/filters.
  const slimCollection = {
    id: collection.id,
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    seo: collection.seo,
    image: collection.image,
  };

  return {
    kind: 'standard' as const,
    ...seo,
    afterItemPage,
    articles,
    deals,
    productCount,
    reviews,
    collection: slimCollection,
    filters: facets,
    pageInfo: collection.products.pageInfo,
    parent,
    priceRange,
    products,
    subCollections,
  };
}

export type CollectionData = Awaited<ReturnType<typeof loadCollection>>;

export function collectionMetadata(data: CollectionData, {context}: PageArgs) {
  const {collection} = data;
  return seoMetadata({
    title: collection.seo?.title || collection.title,
    description: collection.seo?.description || collection.description || '',
    image: collection.image?.url,
    url: data.canonicalUrl,
    siteName: context.storefrontConfig.name,
  });
}

/** One more page of products for the infinite grid (used by the loadMore Server Action). */
export async function fetchCollectionProducts(context: AppContext, handle: string, search: string, cursor: string) {
  const {filters, sortBy} = parseBrowseParams(new URLSearchParams(search));
  const {reverse, sortKey} = parseSortBy(sortBy);
  const {collection} = await context.storefront.query(COLLECTION_BROWSE_QUERY, {
    variables: {handle, first: PRODUCTS_PER_PAGE, after: cursor, sortKey, reverse, filters: filters.length > 0 ? filters : undefined},
  });
  if (!collection) return {products: [], pageInfo: {hasNextPage: false, endCursor: null}};
  return {products: await withRatings(context.yotpo, collection.products.nodes), pageInfo: collection.products.pageInfo};
}

const COLLECTION_BROWSE_QUERY = `#graphql
  query CollectionBrowse(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      updatedAt
      seo {
        title
        description
      }
      image {
        url
        altText
        width
        height
      }
      parent: metafield(namespace: "custom", key: "parent_collection") {
        reference {
          ... on Collection {
            handle
            title
          }
        }
      }
      subCollections: metafield(namespace: "custom", key: "sub_collections") {
        references(first: 20) {
          nodes {
            ... on Collection {
              handle
              title
            }
          }
        }
      }
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        filters {
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
        nodes {
          ...ProductCardItem
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
