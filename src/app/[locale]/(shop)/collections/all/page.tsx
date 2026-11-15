import {definePage} from '~/server/page';
import {catalogMetadata, loadCatalog} from '~/features/collection/catalog';
import {CatalogView} from '~/features/collection/catalog-view';
import {loadMoreCatalogProducts} from '~/features/collection/actions';

const page = definePage({
  load: loadCatalog,
  metadata: catalogMetadata,
  render: (data, {searchParams}) => {
    const search = new URLSearchParams(searchParams);
    search.delete('cursor');
    return <CatalogView data={data} loadMore={loadMoreCatalogProducts.bind(null, search.toString())} />;
  },
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
