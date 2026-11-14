// Header search suggestions: GET /<locale>/api/predictive-search?q=…&limit=…
import {predictiveSearch} from '~/routes/search/server';
import {createAppContext} from '~/server/context';

export async function GET(request: Request) {
  const context = createAppContext(request);
  try {
    return Response.json(await predictiveSearch({request, context}));
  } catch (error) {
    console.error('[predictive-search]', error);
    return Response.json({type: 'predictive', term: '', result: null, error: 'Search failed'}, {status: 500});
  }
}
