import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  images: {remotePatterns: [{protocol: 'https', hostname: 'cdn.shopify.com'}]},
  // Shopify URL redirects and old Hydrogen paths can be added here.
  async redirects() {
    return [];
  },
};

export default nextConfig;
