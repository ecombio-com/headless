// All collections (/collections): data, SEO and view.
import type {PageArgs} from '~/server/page';
import {getPaginationVariables} from '~/core/shopify/pagination';
import {isOtherBrandHandle} from '~/core/config/storefronts';
import {Image} from '@shopify/hydrogen-react';
import LocalizedLink from '~/components/ui/localized-link';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

export async function loadCollections({context, request}: PageArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY, {
      variables: paginationVariables,
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  const {slug} = context.storefrontConfig;
  return {
    collections: {
      ...collections,
      nodes: collections.nodes.filter((c) => !isOtherBrandHandle(c.handle, slug)),
    },
  };
}
type Data = Awaited<ReturnType<typeof loadCollections>>;

export function CollectionsIndex({data}: {data: Data}) {
  const {collections} = data;

  return (
    <div className="collections">
      <h1>Collections</h1>
      <PaginatedResourceSection<CollectionFragment>
        connection={collections}
        resourcesClassName="collections-grid"
      >
        {({node: collection, index}) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            index={index}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  return (
    <LocalizedLink className="collection-item" key={collection.id} href={`/collections/${collection.handle}`}>
      {collection?.image && (
        <Image
          alt={collection.image.altText || collection.title}
          aspectRatio="1/1"
          data={collection.image}
          loading={index < 3 ? 'eager' : undefined}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      )}
      <h5>{collection.title}</h5>
    </LocalizedLink>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;
