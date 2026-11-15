'use server';
// Server Actions for collection pages.
import {getRequestContext} from '~/server/site';
import {fetchCollectionProducts} from './collection';
import {fetchCatalogProducts} from './catalog';

/** Next page of products for the infinite grid. handle and search are bound by the page. */
export async function loadMoreCollectionProducts(handle: string, search: string, cursor: string) {
  return fetchCollectionProducts(await getRequestContext(), handle, search, cursor);
}

/** Next page of /collections/all. search (sort) is bound by the page. */
export async function loadMoreCatalogProducts(search: string, cursor: string) {
  return fetchCatalogProducts(await getRequestContext(), search, cursor);
}
