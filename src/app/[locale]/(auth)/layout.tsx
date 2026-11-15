// Sign-in on auth.<brand>.com: logo-only chrome, links back to the shop (P1.4).
import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {loadSite} from '~/server/site';
import {getAuthHosts} from '~/server/auth/hosts';

export default async function AuthLayout({children}: {children: ReactNode}) {
  const site = await loadSite();
  const url = (await headers()).get('x-url') ?? 'http://localhost:3000/';
  const {shopOrigin} = getAuthHosts(url);
  const logoSrc = site.brand === 'ecombio' ? '/logo.svg' : undefined;
  const links = [
    ['Terms of Service', '/policies/terms-of-service'],
    ['Privacy Policy', '/policies/privacy-policy'],
    ['Help', '/pages/help-center'],
  ] as const;
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center px-4 lg:px-8">
          <a href={shopOrigin} aria-label={`${site.brandName} home`} className="text-ds-medium font-semibold tracking-tight text-foreground">
            {logoSrc ? <img src={logoSrc} alt={site.brandName} width={140} height={36} className="h-8 w-auto" /> : site.brandName}
          </a>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 justify-center px-4 py-12 sm:py-20">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-ds-small text-muted-foreground lg:px-8">
          {links.map(([label, path]) => (
            <a key={path} href={`${shopOrigin}/en-us${path}`} className="hover:text-foreground">
              {label}
            </a>
          ))}
          <span className="ml-auto">© {new Date().getFullYear()} {site.brandName}</span>
        </div>
      </footer>
    </div>
  );
}
