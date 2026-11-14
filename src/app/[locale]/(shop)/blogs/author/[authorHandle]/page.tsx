import {definePage} from '~/server/page';
import {AuthorRoute, load, metadata} from '~/features/blog/author';

const page = definePage({load, metadata, render: (data) => <AuthorRoute data={data} />});
export const generateMetadata = page.generateMetadata;
export default page.Page;
