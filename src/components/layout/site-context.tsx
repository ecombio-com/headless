'use client';
// Site-wide data for client components: brand, checkout mode, cart, login state.
// Filled once per request by app/[locale]/layout.tsx.
import {createContext, useContext, type ReactNode} from 'react';
import type {SiteData} from '~/server/site';

const SiteContext = createContext<SiteData | null>(null);

export function SiteProvider({value, children}: {value: SiteData; children: ReactNode}) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteData {
  const value = useContext(SiteContext);
  if (!value) throw new Error('useSite() must be used inside <SiteProvider>');
  return value;
}

/** Like useSite(), but null outside the provider (error pages). */
export function useSiteOptional(): SiteData | null {
  return useContext(SiteContext);
}
