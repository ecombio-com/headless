import {definePage} from '~/server/page';
import {JsonLd, MetaProperties} from '~/features/seo';
import {loadProduct, productJsonLd, productMetadata, productMetaTags} from '~/features/product/product';
import {ProductView} from '~/features/product/product-view';

const page = definePage({
  load: loadProduct,
  metadata: productMetadata,
  render: (data) => (
    <>
      <MetaProperties tags={productMetaTags(data)} />
      <JsonLd data={productJsonLd(data)} />
      <ProductView data={data} />
    </>
  ),
});
export const generateMetadata = page.generateMetadata;
export default page.Page;
