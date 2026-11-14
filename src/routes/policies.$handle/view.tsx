'use client';
// Ported from ($locale).policies.$handle.tsx by scripts/split-route.mjs.
import type {loader} from './server';
import {useLoaderData} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {RichTextPage} from '~/components/content/rich-text-page';


export default function PolicyPage() {
  const {policy} = useLoaderData<typeof loader>();
  return <RichTextPage body={policy.body} title={policy.title} />;
}
