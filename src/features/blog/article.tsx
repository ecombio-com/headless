// Blog: article page (data, SEO, view). Ported from routes/blogs.articles.$articleHandle.
import {notFound} from 'next/navigation';
import type {PageArgs} from '~/server/page';
import {seoMetadata} from '~/features/seo';
import {ArticlePage} from '~/components/blog/article-page';
import {addHeadingIds, parseBody, type BodyHeading, type BodySegment} from '~/lib/shortcodes';
import {buildBreadcrumbLd, getBlogAncestors, getRelatedArticles, readMinutes} from '~/lib/blog';
import {getAllArticles, getArticleByHandle, getBlogList, getProductsByHandles, getUrls} from '~/lib/blog.server';
export async function load({context, params, request}: PageArgs<'articleHandle'>) {
  const {storefront} = context;
  const {articleHandle} = params;
  if (!articleHandle) notFound();

  const article = await getArticleByHandle(storefront, articleHandle);
  if (!article) notFound();

  const [blogs, all] = await Promise.all([getBlogList(storefront), getAllArticles(storefront)]);
  const ancestors = getBlogAncestors(article.blogHandle, blogs);

  const headings: BodyHeading[] = [];
  const segments: BodySegment[] = parseBody(article.body ?? '').map((segment) =>
    segment.type === 'html' ? {...segment, html: addHeadingIds(segment.html, headings)} : segment,
  );
  const productHandles = [
    ...new Set(segments.flatMap((s) => (s.type === 'products' ? s.handles.slice(0, 4) : []))),
  ];
  const products = await getProductsByHandles(storefront, productHandles);

  const {abs, canonical} = getUrls(request);
  const crumbs = [
    {name: 'Ecombio', path: '/'},
    {name: 'Journal', path: '/blogs'},
    ...ancestors.map((a) => ({name: a.title, path: `/blogs/category/${a.handle}`})),
    {name: article.blogTitle, path: `/blogs/category/${article.blogHandle}`},
    {name: article.title, path: `/blogs/articles/${article.handle}`},
  ];

  return {
    ancestors,
    article: {...article, body: undefined},
    articleLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.seo.description,
      datePublished: article.publishedAt,
      mainEntityOfPage: canonical,
      ...(article.image ? {image: [article.image.url]} : {}),
      ...(article.authorProfile?.name || article.author
        ? {author: {'@type': 'Person', name: article.authorProfile?.name ?? article.author}}
        : {}),
      publisher: {'@type': 'Organization', name: 'Ecombio'},
    },
    breadcrumbLd: buildBreadcrumbLd(crumbs, abs),
    canonicalUrl: canonical,
    contents: headings.filter((heading) => heading.level === 2),
    minutes: readMinutes(article.body ?? ''),
    products,
    related: getRelatedArticles(article, all, 8).map((a) => ({...a, body: undefined})),
    segments,
  };
}

type Data = Awaited<ReturnType<typeof load>>;

export function metadata({article, canonicalUrl}: Data, {context}: PageArgs) {
  return seoMetadata({
    title: article.seo.title,
    description: article.seo.description,
    image: article.image?.url ?? new URL('/og-default.png', canonicalUrl).href,
    type: 'article',
    url: canonicalUrl,
    siteName: context.storefrontConfig.name,
  });
}

export function ArticleRoute({data}: {data: Data}) {
  const {ancestors, article, contents, minutes, products, related, segments} = data;
  return (
    <ArticlePage
      ancestors={ancestors}
      article={article}
      contents={contents}
      minutes={minutes}
      products={products}
      related={related}
      segments={segments}
    />
  );
}
