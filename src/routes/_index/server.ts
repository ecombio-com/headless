// Ported from ($locale)._index.tsx by scripts/split-route.mjs.
import type {Route} from '~/server/route-types';
import {buildMeta} from '~/lib/blog';
import {getUrls} from '~/lib/blog.server';
import {getStorefrontConfig} from '~/lib/storefront-config';
import {loadCollection} from '~/features/collection/collection';
import {BRAND_HOME} from '~/lib/brand-home';
import {communityStories, heroSlides, shopCategories} from '~/lib/home';
import {getShowcaseSection} from '~/lib/home-showcase.server';
import {getHomeCategorySections, getHomeCmsContent, getHomeShopCategories, getHomeShowcaseContent, getHomeVideo, type ReviewLike} from '~/lib/home.server';


const TITLE = 'Home | Ecombio';

const BB_TITLE = 'BicycleBio | Electric bikes by rider, class and brand';

const BB_DESCRIPTION = 'Find the e-bike that fits your ride. Shop by rider, class and power, or brand, with guides that explain the rest.';

const DESCRIPTION =
  'Shop electric bikes, scooters and skateboards from top brands, with free shipping and a 1-year warranty.';

export const meta: Route.MetaFunction = ({data}) =>
  (data as any)?.isBrandHome
    ? buildMeta({description: BRAND_HOME[(data as any).brandSlug]?.description ?? '', title: BRAND_HOME[(data as any).brandSlug]?.title ?? '', url: '/'})
    :
  data?.isBicycleBio
    ? buildMeta({description: BB_DESCRIPTION, title: BB_TITLE, url: data.canonicalUrl ?? '/'})
    : buildMeta({description: DESCRIPTION, title: TITLE, url: data?.canonicalUrl ?? '/'});

export async function loader(args: Route.LoaderArgs) {
  const {context, request} = args;
  const {storefront, yotpo} = context;
  const homeCollection = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).homeCollectionHandle;
  if (homeCollection) {
    const payload = await loadCollection({
      context,
      request,
      params: {handle: homeCollection},
      searchParams: new URL(request.url).searchParams,
    });
    return {...payload, isBrandHome: true, brandSlug: getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).slug} as any;
  }
  if (getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).brand === 'bicyclebio') {
    const canonical = getUrls(request).canonical;
    return {
      isBicycleBio: true,
      canonicalUrl: canonical,
      homeVideo: null,
      categorySections: [],
      shopCategories: [],
      showcase: null,
      slides: [],
      stories: [],
      studies: [],
    };
  }
  const [cms, showcase, categorySections, shopCategoryItems, homeVideo] = await Promise.all([
    getHomeCmsContent(storefront, {
      getReviews: (id) =>
        yotpo.getProductReviews(id) as unknown as Promise<{reviews: ReviewLike[]} | null>,
    }),
    getHomeShowcaseContent(storefront).then((content) => getShowcaseSection(storefront, content, yotpo)),
    getHomeCategorySections(storefront),
    getHomeShopCategories(storefront),
    getHomeVideo(storefront),
  ]);
  // The showcase now loads inside the Promise.all above, so it no longer waits for the other CMS queries.
  return {
    isBicycleBio: false,
    canonicalUrl: getUrls(request).canonical,
    homeVideo,
    categorySections,
    shopCategories: shopCategoryItems.length > 0 ? shopCategoryItems : shopCategories,
    showcase,
    slides: cms.slides ?? heroSlides,
    stories: cms.stories ?? communityStories,
    // Drop article bodies: the cards only need title, image, excerpt and date.
    studies: (cms.studies ?? []).map((article) => ({...article, body: undefined})),
  };
}
