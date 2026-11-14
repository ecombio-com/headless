// Product pages (/products/<handle>): data, SEO and structured data. The view is product-view.tsx.
import 'server-only';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getSelectedProductOptions} from '~/core/shopify/product-options';
import {getLocaleFromRequest} from '~/core/config/i18n';
import {getCollectionTrail} from '~/lib/breadcrumb-trail';
import {loadProductExtras} from '~/lib/product-extras.server';
import {PRODUCT_QUERY} from '~/lib/product-fragments';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {parseDelivery, parsePopularSearches, parseSpecs, parseTrustBadges} from '~/lib/product';
import {loadCrossSell} from '~/lib/product-cross-sell';
import {toPublicAlgoliaConfig} from '~/@algolia/config';
import {seoMetadata} from '~/features/seo';
import type {PageArgs} from '~/server/page';

export async function loadProduct({context, params, request}: PageArgs<'handle'>) {
  const {storefront} = context;
  const {handle} = params;

  if (!handle) {
    notFound();
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    notFound();
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  const productId = product.id.split('/').pop() ?? '';
  const origin = new URL(request.url).origin;
  const prefix = getLocaleFromRequest(request).pathPrefix;
  const trail = getCollectionTrail(product.collections.nodes);
  const crumbs = [
    {name: 'Home', path: '/'},
    ...trail.map((c) => ({name: c.title, path: `/collections/${c.handle}`})),
    {name: product.title, path: `/products/${product.handle}`},
  ];
  const abs = (p: string) => `${origin}${prefix}${p === '/' ? '' : p}`;

  return {
    canonicalUrl: origin + new URL(request.url).pathname,
    product,
    breadcrumbs: crumbs,
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{name: context.storefrontConfig.name, path: '/'}, ...crumbs.slice(1)].map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.path),
      })),
    },
    delivery: parseDelivery(product),
    popularSearches: parsePopularSearches(product.popularSearches),
    trustBadges: parseTrustBadges(product.trustBadges),
    specs: parseSpecs(product.specs),
    // Below the fold: streamed to the client as promises.
    reviews: context.yotpo.getProductReviews(productId),
    crossSell: loadCrossSell(context.storefront, product.handle),
    extras: loadProductExtras(context.storefront, product.handle),
    algolia: toPublicAlgoliaConfig(context.algolia.config),
  };
}
export type ProductData = Awaited<ReturnType<typeof loadProduct>>;

export function productMetadata({product, canonicalUrl}: ProductData, {context}: PageArgs): Metadata {
  return seoMetadata({
    title: product.seo?.title || product.title,
    description: product.seo?.description || product.description || '',
    image: product.featuredImage?.url,
    url: canonicalUrl,
    siteName: context.storefrontConfig.name,
  });
}

/** Open Graph product price/stock tags (rendered as <meta property>). */
export function productMetaTags({product}: ProductData): Record<string, string> {
  const price = product.priceRange.minVariantPrice;
  const inStock = product.availableForSale;
  return {
    'og:price:amount': price.amount,
    'og:price:currency': price.currencyCode,
    'og:availability': inStock ? 'instock' : 'oos',
    'product:price:amount': price.amount,
    'product:price:currency': price.currencyCode,
    'product:availability': inStock ? 'in stock' : 'out of stock',
  };
}

export function productJsonLd({product, canonicalUrl, breadcrumbLd}: ProductData) {
  const price = product.priceRange.minVariantPrice;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description,
      image: product.media.nodes.flatMap((m: any) => ('image' in m && m.image ? [m.image.url] : [])),
      ...(product.vendor ? {brand: {'@type': 'Brand', name: product.vendor}} : {}),
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: price.currencyCode,
        lowPrice: price.amount,
        highPrice: product.priceRange.maxVariantPrice.amount,
        offerCount: product.variantsCount?.count ?? 1,
        availability: product.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: canonicalUrl,
      },
      sku: product.id,
    },
    breadcrumbLd,
  ];
}
