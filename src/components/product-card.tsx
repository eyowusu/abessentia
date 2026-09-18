'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore, useWishlistStore } from '@/lib/store';
import { useMounted } from '@/lib/use-mounted';
import type { CatalogueProduct } from '@/lib/server/catalogue';

export default function ProductCard({ product }: { product: CatalogueProduct }) {
  const { addItem } = useCartStore();
  const toggle = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.has(product.id));
  // Zustand persist hydrates after mount; render the inactive state first to
  // avoid a server/client markup mismatch.
  const mounted = useMounted();

  const outOfStock = !product.stock || product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 3;

  return (
    <div className="group bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/products/${product.id}`} className="block relative aspect-square bg-[#F5F0EA]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#C88A2C]">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}
        {outOfStock ? (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Sold out</span>
        ) : lowStock ? (
          <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">Low stock</span>
        ) : null}
        <button
          aria-label={wished && mounted ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.preventDefault();
            toggle({ id: product.id, name: product.name, price: product.price, image: product.image });
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-[#E7E5E4] flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              mounted && wished ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>
      </Link>
      <div className="p-4">
        {product.category && (
          <p className="text-[11px] uppercase tracking-wider text-[#C88A2C] font-semibold mb-1">
            {product.category}
          </p>
        )}
        <Link href={`/products/${product.id}`} className="block">
          <h3 className="font-semibold text-[#1C1917] line-clamp-1 group-hover:text-[#C88A2C] transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-[#1C1917]">
            GH₵{product.price.toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={() =>
              addItem({
                id: product.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
              })
            }
            disabled={outOfStock}
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            {outOfStock ? 'Sold out' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}
