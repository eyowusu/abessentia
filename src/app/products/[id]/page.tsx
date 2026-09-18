import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product-card';
import ProductDetailClient from './product-detail-client';
import { getProduct, getProducts } from '@/lib/server/catalogue';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.abessentiagh.com';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Product Not Found — AB Essentia' };

  const description =
    product.description?.slice(0, 160) ||
    `${product.name} — handcrafted natural skincare by AB Essentia, made in Ghana.`;

  return {
    title: `${product.name} — AB Essentia`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.image ? [product.image] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const all = await getProducts();
  const related = all
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);
  const fallbackRelated = related.length > 0 ? related : all.filter((p) => p.id !== product.id).slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    category: product.category,
    brand: { '@type': 'Brand', name: 'AB Essentia' },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.id}`,
      priceCurrency: 'GHS',
      price: product.price.toFixed(2),
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </nav>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <ProductDetailClient product={product} />

        {/* Related products */}
        {fallbackRelated.length > 0 && (
          <section className="mt-24">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
              You may also like
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {fallbackRelated.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
