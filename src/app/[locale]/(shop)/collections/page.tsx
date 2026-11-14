import {definePage} from '~/server/page';
import {CollectionsIndex, loadCollections} from '~/features/collection/collections-index';

const page = definePage({
  load: loadCollections,
  metadata: (_d, {context}) => ({title: `Collections | ${context.storefrontConfig.name}`}),
  render: (data) => <CollectionsIndex data={data} />,
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
