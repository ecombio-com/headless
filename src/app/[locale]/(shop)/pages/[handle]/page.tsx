import {definePage} from '~/server/page';
import {loadShopifyPage, ShopifyPage, shopifyPageMetadata} from '~/features/pages/shopify-page';

const page = definePage({load: loadShopifyPage, metadata: shopifyPageMetadata, render: (data) => <ShopifyPage {...data} />});
export const generateMetadata = page.generateMetadata;
export default page.Page;
