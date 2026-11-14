import {definePage} from '~/server/page';
import {JournalIndex, load, metadata} from '~/features/blog/journal';

const page = definePage({load, metadata, render: (data) => <JournalIndex data={data} />});
export const generateMetadata = page.generateMetadata;
export default page.Page;
