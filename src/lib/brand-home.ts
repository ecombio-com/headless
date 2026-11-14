// Brand home copy (ScooterBio, SkaterBio). Plain data so server code (meta) can import it.
export type BrandHomeContent = {
  title: string;
  description: string;
  heading: string;
  intro: string;
  cta: string;
  collection: string;
  productsHeading: string;
  gradient: string;
};

export const BRAND_HOME: Record<string, BrandHomeContent> = {
  scooterbio: {
    title: 'ScooterBio | Electric scooters for every ride',
    description: 'Shop electric scooters for commuting, weekends and long range, with free standard shipping and free 30-day returns.',
    heading: 'Find the scooter that fits your ride',
    intro: 'Electric scooters for commuting, weekends and everything in between.',
    cta: 'Shop scooters',
    collection: 'scooterbio-all',
    productsHeading: 'Electric scooters',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e3a8a 100%)',
  },
  skaterbio: {
    title: 'SkaterBio | Electric skateboards and Onewheels',
    description: 'Shop electric skateboards and Onewheel boards for cruising, carving and commuting, with free standard shipping and free 30-day returns.',
    heading: 'Find the board that fits your ride',
    intro: 'Electric skateboards and Onewheel boards for cruising, carving and commuting.',
    cta: 'Shop boards',
    collection: 'skaterbio-all',
    productsHeading: 'Electric skateboards and Onewheels',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #7c2d12 100%)',
  },
};
