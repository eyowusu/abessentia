import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import ProductsPageContent from './products-content';
import { getProducts, getCategories } from '@/lib/server/catalogue';

export const metadata: Metadata = {
  title: 'Shop Natural Skincare — AB Essentia',
  description:
    'Browse AB Essentia\'s full collection of handcrafted natural skincare: black soaps, body butters, hair oils and more. Made in Ghana.',
};

export const revalidate = 300;

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const categoryNames = categories.map((c) => c.name).filter(Boolean);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <ProductsPageContent initialProducts={products} initialCategories={categoryNames} />
    </Suspense>
  );
}
