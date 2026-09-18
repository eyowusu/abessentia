import type { Metadata } from 'next';
import WishlistClient from './wishlist-client';
import { getProducts } from '@/lib/server/catalogue';

export const metadata: Metadata = {
  title: 'Wishlist — AB Essentia',
  description: 'Your saved AB Essentia products.',
};

export const revalidate = 300;

export default async function WishlistPage() {
  const products = await getProducts();
  return <WishlistClient products={products} />;
}
