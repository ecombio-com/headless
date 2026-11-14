import type {Metadata, Viewport} from 'next';
import type {ReactNode} from 'react';
import {getStorefrontConfig} from '~/core/config/storefronts';
import '~/styles/reset.css';
import '~/styles/tailwind.css';
import '~/styles/app.css';

export const metadata: Metadata = {
  icons: {icon: '/favicon.svg'},
  other: {'impact-site-verification': 'a5ccd416-8951-44c3-8ad0-5eeedf00f9f0'},
};
export const viewport: Viewport = {width: 'device-width', initialScale: 1};

export default function RootLayout({children}: {children: ReactNode}) {
  const {brand} = getStorefrontConfig(process.env.PUBLIC_STOREFRONT_ID);
  return (
    <html lang="en" data-brand={brand}>
      <head>
        <link rel="preconnect" href="https://cdn.shopify.com" />
        <link rel="preconnect" href="https://shop.app" />
      </head>
      <body>{children}</body>
    </html>
  );
}
