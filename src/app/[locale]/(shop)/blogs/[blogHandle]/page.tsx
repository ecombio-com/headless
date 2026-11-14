// Old Shopify blog URL (/blogs/<blog>) -> the category page.
import {permanentRedirect} from 'next/navigation';

export default async function BlogRedirect({params}: {params: Promise<{locale: string; blogHandle: string}>}) {
  const {locale, blogHandle} = await params;
  permanentRedirect(`/${locale}/blogs/category/${blogHandle}`);
}
