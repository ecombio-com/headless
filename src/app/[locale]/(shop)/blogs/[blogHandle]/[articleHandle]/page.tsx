// Old Shopify article URL (/blogs/<blog>/<article>) -> the article page.
import {permanentRedirect} from 'next/navigation';

export default async function ArticleRedirect({params}: {params: Promise<{locale: string; articleHandle: string}>}) {
  const {locale, articleHandle} = await params;
  permanentRedirect(`/${locale}/blogs/articles/${articleHandle}`);
}
