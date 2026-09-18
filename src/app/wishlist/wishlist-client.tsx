'use client';

import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product-card';
import { useWishlistStore } from '@/lib/store';
import { useMounted } from '@/lib/use-mounted';
import type { CatalogueProduct } from '@/lib/server/catalogue';

export default function WishlistClient({ products }: { products: CatalogueProduct[] }) {
  const items = useWishlistStore((s) => s.items);
  const mounted = useMounted();

  // Match stored wishlist IDs to freshly fetched products so prices/stock are
  // current. Items no longer in the catalogue are dropped from the display.
  const wished = mounted
    ? items
        .map((w) => products.find((p) => p.id === w.id))
        .filter((p): p is CatalogueProduct => Boolean(p))
    : [];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-40 bg-muted rounded-lg mb-8 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground font-serif flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            Wishlist
          </h1>
          <p className="text-muted-foreground mt-1">
            {wished.length === 0
              ? 'Products you save will appear here'
              : `${wished.length} saved ${wished.length === 1 ? 'product' : 'products'}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wished.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h2 className="text-xl font-bold text-foreground font-serif mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Tap the heart on any product to save it here for later.
            </p>
            <Link href="/products">
              <Button size="lg">
                Browse Products
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {wished.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
