import {definePage} from '~/server/page';
import {load, metadata, TagRoute} from '~/features/blog/tag';

const page = definePage({load, metadata, render: (data) => <TagRoute data={data} />});
export const generateMetadata = page.generateMetadata;
export default page.Page;
