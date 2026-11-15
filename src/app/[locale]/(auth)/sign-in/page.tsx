// auth.<brand>.com sign-in page (P1.4, specs/001-customer-sign-in).
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {loadSite} from '~/server/site';
import {getAuthHosts, safeReturnPath} from '~/server/auth/hosts';
import {SignInForm} from '~/components/account/sign-in-form';

export const metadata: Metadata = {title: 'Sign in', robots: {index: false, follow: false}};

export default async function SignInPage({searchParams}: {searchParams: Promise<{return_to?: string}>}) {
  const site = await loadSite();
  const url = (await headers()).get('x-url') ?? 'http://localhost:3000/';
  const {shopOrigin} = getAuthHosts(url);
  const returnTo = safeReturnPath((await searchParams).return_to);
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);
  return <SignInForm brandName={site.brandName} redirectTo={`${shopOrigin}${returnTo}`} googleEnabled={googleEnabled} />;
}
