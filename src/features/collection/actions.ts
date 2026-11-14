'use server';
// Server Actions for collection pages.
import {getRequestContext} from '~/server/site';
import {fetchCollectionProducts} from './collection';

/** Next page of products for the infinite grid. handle and search are bound by the page. */
export async function loadMoreCollectionProducts(handle: string, search: string, cursor: string) {
  return fetchCollectionProducts(await getRequestContext(), handle, search, cursor);
}
