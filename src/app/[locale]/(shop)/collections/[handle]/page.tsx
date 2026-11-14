import {definePage} from '~/server/page';
import {JsonLd} from '~/features/seo';
import {collectionMetadata, loadCollection} from '~/features/collection/collection';
import {CollectionView} from '~/features/collection/collection-view';
import {loadMoreCollectionProducts} from '~/features/collection/actions';

const page = definePage({
  load: loadCollection,
  metadata: collectionMetadata,
  render: (data, {params, searchParams}) => {
    const search = new URLSearchParams(searchParams);
    search.delete('cursor');
    return (
      <>
        <JsonLd data={[data.collectionLd, data.breadcrumbLd]} />
        <CollectionView data={data} loadMore={loadMoreCollectionProducts.bind(null, params.handle, search.toString())} />
      </>
    );
  },
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
