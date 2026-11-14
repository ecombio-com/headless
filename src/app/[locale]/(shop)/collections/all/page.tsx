import {definePage} from '~/server/page';
import {Catalog, loadCatalog} from '~/features/collection/catalog';

const page = definePage({
  load: loadCatalog,
  metadata: (_d, {context}) => ({title: `All products | ${context.storefrontConfig.name}`}),
  render: (data) => <Catalog data={data} />,
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
