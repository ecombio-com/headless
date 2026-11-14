// Shopify CMS pages (/pages/<handle>): data, SEO and view.
import {notFound} from 'next/navigation';
import {isHiddenPageHandle} from '~/lib/hidden-pages';
import {isOtherBrandHandle} from '~/core/config/storefronts';
import {pageBlocksFromBody, parsePageBlocks} from '~/lib/page-blocks';
import {PageBlocks} from '~/components/content/page-blocks';
import {RichTextPage} from '~/components/content/rich-text-page';
import {seoMetadata} from '~/features/seo';
import type {PageArgs} from '~/server/page';

export async function loadShopifyPage({params, context, request}: PageArgs<'handle'>) {
  const {handle} = params;
  if (!handle || isHiddenPageHandle(handle) || isOtherBrandHandle(handle, context.storefrontConfig.slug)) notFound();

  const {page} = await context.storefront.query(PAGE_QUERY, {variables: {handle}, cache: context.storefront.CacheLong()});
  if (!page) notFound();

  // Precedence: shortcode layout in the body, then the layout_blocks metafield, then plain rich text.
  const bodyBlocks = pageBlocksFromBody(page.body);
  const layoutBlocks = parsePageBlocks(page.layoutBlocks?.value);
  const blocks = bodyBlocks.some((b) => b.type !== 'body') ? bodyBlocks : layoutBlocks.length > 0 ? layoutBlocks : null;

  const url = new URL(request.url);
  return {
    blocks,
    body: blocks ? null : page.body,
    title: page.title,
    canonical: `${url.origin}${url.pathname}`,
    seo: {title: page.seo?.title ?? page.title, description: page.seo?.description ?? page.bodySummary},
  };
}
type ShopifyPageData = Awaited<ReturnType<typeof loadShopifyPage>>;

export function shopifyPageMetadata(data: ShopifyPageData, {context}: PageArgs) {
  return seoMetadata({...data.seo, url: data.canonical, siteName: context.storefrontConfig.name});
}

export function ShopifyPage({blocks, body, title}: ShopifyPageData) {
  if (blocks) return <PageBlocks blocks={blocks} />;
  return <RichTextPage body={body ?? ''} title={title} />;
}

const PAGE_QUERY = `#graphql
  query Page($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    page(handle: $handle) {
      id
      handle
      title
      body
      bodySummary
      updatedAt
      seo {
        title
        description
      }
      layoutBlocks: metafield(namespace: "custom", key: "layout_blocks") {
        value
      }
    }
  }
` as const;
