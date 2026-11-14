'use client';
import {Deferred} from '~/components/ui/deferred';
// Product page view (client: variant picker, buy buttons, media).
import type {ProductData} from './product';
import {Suspense} from 'react';
import {ProductReviews, StarRating} from '~/@yotpo';
import {Money} from '@shopify/hydrogen-react';
import {DeliveryEstimate} from '~/components/product-detail/delivery-estimate';
import {getProductOptions, useSelectedOptionInUrlParam} from '@shopify/hydrogen-react';
import {Analytics} from '~/components/analytics/analytics';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {Breadcrumbs} from '~/components/product-detail/breadcrumbs';
import {BuyButtons} from '~/components/product-detail/buy-buttons';
import {FloatingBuyBlock} from '~/components/product-detail/floating-buy-block';
import {FrequentlyAskedQuestionsSection} from '~/components/product-detail/frequently-asked-questions-section';
import {PopularSearches} from '~/components/product-detail/popular-searches';
import {ProductHighlights} from '~/components/product-detail/product-highlights';
import {ProductFormOptions, toOptionGroups} from '~/components/product-detail/product-form';
import {ProductMedia} from '~/components/product-detail/product-media';
import {ProductPrice} from '~/components/product-detail/product-price';
import {ProductResources} from '~/components/product-detail/product-resources';
import {SpecCarousel} from '~/components/product-detail/spec-carousel';
import {StickyBuyBar} from '~/components/product-detail/sticky-buy-bar';
import {TechnicalSpecsSection} from '~/components/product-detail/technical-specs-section';
import {getSelectedColorImage, getSharedImages, getTaggedGallery, hasAltTagging, hasColorImagePartitioning, toMedia} from '~/lib/product-media';
import '~/styles/technical-specs.css';
import {FrequentlyBoughtTogether} from '~/components/product-detail/frequently-bought-together';
import {PairsWellWithSection} from '~/components/product-detail/pairs-well-with-section';
import {RelatedProductsSection} from '~/components/product/related-products-section';
import {TrackProductView} from '~/@algolia/components/track-product-view';

const COPY = {
  specsSubtitle: 'Full details in Technical Specifications below',
};

export function ProductView({data}: {data: ProductData}) {
  const {
    product,
    breadcrumbs,
    delivery,
    popularSearches,

    trustBadges,
    specs,
    crossSell,
    extras,
    reviews,
    algolia,
  } = data;

  // The server picks the variant from the URL options (?Color=…), so this is always current.
  const selectedVariant = product.selectedOrFirstAvailableVariant!;
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;
  const {minVariantPrice: pMin, maxVariantPrice: pMax} = product.priceRange;
  const {minVariantPrice: cMin, maxVariantPrice: cMax} = product.compareAtPriceRange;
  const uniform =
    pMin.amount === pMax.amount &&
    pMin.currencyCode === pMax.currencyCode &&
    cMin.amount === cMax.amount;
  const hasOptions = productOptions.some((o) => o.optionValues.length > 1);

  // Color products show the selected color's image first and hide the other colors' images.
  const optionGroups = toOptionGroups(productOptions);
  const {images, videos} = toMedia(product.media.nodes);
  // Photos tagged in their alt text ("Title | Color: Blue") follow every option; otherwise only Color does.
  const tagged = hasAltTagging(images);
  const partitioned = !tagged && hasColorImagePartitioning(optionGroups);
  const mediaImages = tagged
    ? getTaggedGallery(images, selectedVariant.selectedOptions ?? [], selectedVariant.image)
    : partitioned
      ? getSharedImages(images, optionGroups)
      : images;
  const colorImage = partitioned
    ? getSelectedColorImage(optionGroups, [
        ...images,
        ...(selectedVariant?.image ? [selectedVariant.image] : []),
      ])
    : undefined;
  const variantName = selectedVariant?.selectedOptions
    ?.map((o) => o.value)
    .filter((v) => v !== 'Default Title')
    .join(' / ');

  return (
    <Page className="pt-0">
      <Container className="bg-background pt-6 md:pt-8">
        <Sections>
          <Breadcrumbs items={breadcrumbs} className="pb-4 md:pb-6" />
          <div className="grid gap-ds-large lg:grid-cols-10 lg:items-start lg:gap-5">
            <ProductMedia
              images={mediaImages}
              videos={videos}
              colorImage={colorImage}
              title={title}
              className="lg:sticky lg:top-20 lg:col-span-6 lg:self-start"
            />
            <div className="grid gap-10 lg:col-span-4">
              <div
                className="grid data-[uniform-price=true]:gap-10"
                data-uniform-price={uniform}
              >
                <div data-slot="product-info-header">
                  <h1 className="text-foreground text-ds-h3 font-semibold leading-tight">
                    {title}
                  </h1>
                  {product.vendor ? (
                    <p className="mt-ds-xxsmall text-ds-regular text-muted-foreground">
                      {product.vendor}
                    </p>
                  ) : null}
                  <div className="mt-ds-xsmall min-h-5">
                    <Deferred value={reviews} fallback={<div className="h-5" aria-hidden />}>
                        {(data) => (
                          <StarRating
                            summary={
                              data
                                ? {
                                    averageScore: data.bottomline.average_score,
                                    totalReviews: data.bottomline.total_review,
                                  }
                                : null
                            }
                          />
                        )}
                      </Deferred>
                  </div>
                  {uniform ? (
                    <ProductPrice
                      amount={pMin.amount}
                      currencyCode={pMin.currencyCode}
                      compareAtAmount={cMin.amount}
                    />
                  ) : null}
                  <DeliveryEstimate delivery={delivery} />
                </div>
                <div className="grid gap-10">
                  {!uniform && selectedVariant ? (
                    <div data-slot="product-info-price">
                      <ProductPrice
                        amount={selectedVariant.price.amount}
                        currencyCode={selectedVariant.price.currencyCode}
                        compareAtAmount={selectedVariant.compareAtPrice?.amount}
                      />
                    </div>
                  ) : null}
                  {hasOptions ? <ProductFormOptions options={productOptions} /> : null}
                  <FloatingBuyBlock>
                    <BuyButtons
                      selectedVariant={selectedVariant}
                      availableForSale={product.availableForSale}
                    />
                  </FloatingBuyBlock>
                </div>
              </div>
              <ProductHighlights part="badges" badges={trustBadges} />
              {/* At a glance: custom.specs JSON when present, else the older product_specs entries. */}
              <Deferred
                value={extras}
                fallback={specs.length ? <SpecCarousel specs={specs} subtitle={COPY.specsSubtitle} /> : null}
              >
                {(x) => (
                  <SpecCarousel
                    specs={x.atAGlance.length ? x.atAGlance : specs}
                    subtitle={COPY.specsSubtitle}
                  />
                )}
              </Deferred>
            </div>
          </div>

          {descriptionHtml ? (
            <div className="mt-ds-large grid gap-10 [&_*]:max-w-none">
              <div data-slot="product-info-description">
                <div
                  className="prose prose-sm text-foreground/80"
                  dangerouslySetInnerHTML={{__html: descriptionHtml}}
                />
              </div>
            </div>
          ) : null}

          {product.isGiftCard ? null : (
            <Deferred value={crossSell} fallback={null}>
                {(data) => (
                  <>
                    {data.frequentlyBought.length > 0 && selectedVariant?.availableForSale ? (
                      <FrequentlyBoughtTogether
                        items={data.frequentlyBought}
                        main={{
                          imageUrl: selectedVariant.image?.url,
                          price: selectedVariant.price,
                          subtitle: variantName || undefined,
                          title: product.title,
                          variantId: selectedVariant.id,
                        }}
                      />
                    ) : null}
                    <RelatedProductsSection products={data.related} limit={4} />
                    <PairsWellWithSection products={data.complementary} />
                  </>
                )}
              </Deferred>
          )}
          <div id="reviews" className="scroll-mt-24">
            <Deferred value={reviews} fallback={<div className="min-h-64" aria-hidden />}>
                {(data) => (
                  <ProductReviews
                    data={data}
                    handle={product.handle}
                    productTitle={product.title}
                  />
                )}
              </Deferred>
          </div>
          <Deferred value={extras} fallback={null}>{(x) => <FrequentlyAskedQuestionsSection html={x.faqBody} />}</Deferred>
          <PopularSearches terms={popularSearches} />
          <Deferred value={extras} fallback={null}>{(x) => <TechnicalSpecsSection html={x.techSpecsBody} />}</Deferred>
          <Deferred value={extras} fallback={null}>{(x) => <ProductResources manualUrl={x.manualUrl} videoUrl={x.assemblyVideoUrl} />}</Deferred>
        </Sections>
      </Container>

      {product.isGiftCard ? null : (
        <StickyBuyBar
          targetId="primary-buy-buttons"
          title={product.title}
          variantName={variantName}
          imageUrl={selectedVariant?.image?.url ?? product.featuredImage?.url}
          price={selectedVariant?.price ? <Money data={selectedVariant.price} /> : null}
        />
      )}
      <TrackProductView config={algolia} productId={product.id} />
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </Page>
  );
}
