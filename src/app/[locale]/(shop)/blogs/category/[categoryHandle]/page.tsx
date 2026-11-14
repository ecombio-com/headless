import {definePage} from '~/server/page';
import {JsonLd} from '~/features/seo';
import {CategoryRoute, load, metadata} from '~/features/blog/category';

const page = definePage({
  load,
  metadata,
  render: (data) => (
    <>
      <JsonLd data={data.breadcrumbLd} />
      <CategoryRoute data={data} />
    </>
  ),
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
