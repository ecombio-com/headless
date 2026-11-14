import {definePage} from '~/server/page';
import {JsonLd} from '~/features/seo';
import {ArticleRoute, load, metadata} from '~/features/blog/article';

const page = definePage({
  load,
  metadata,
  render: (data) => (
    <>
      <JsonLd data={[data.articleLd, data.breadcrumbLd]} />
      <ArticleRoute data={data} />
    </>
  ),
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
