'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Shield, Minus, Plus, Truck, Award, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCartStore, useWishlistStore } from '@/lib/store';
import { useMounted } from '@/lib/use-mounted';
import { MAX_QUANTITY_PER_LINE } from '@/lib/order-limits';
import type { CatalogueProduct } from '@/lib/server/catalogue';

const WHATSAPP_URL = (product: CatalogueProduct) =>
  'https://wa.me/233242351314?text=' +
  encodeURIComponent(`Hello AB Essentia! I'd like to ask about ${product.name} (GH₵${product.price.toFixed(2)}).`);

export default function ProductDetailClient({ product }: { product: CatalogueProduct }) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.has(product.id));
  const mounted = useMounted();

  const outOfStock = product.stockStatus === 'out_of_stock' || product.stock <= 0;

  // The stepper must not let a shopper build a basket the server will reject. The ceiling
  // is whichever binds first: what can be bought at all, or the per-item purchase limit
  // enforced authoritatively in lib/order-limits.ts.
  const maxQuantity = Math.max(1, Math.min(product.stock, MAX_QUANTITY_PER_LINE));
  const atMaxQuantity = quantity >= maxQuantity;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
      {/* Product Image */}
      <div className="relative">
        <Card className="overflow-hidden aspect-square bg-muted relative">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-32 h-32 text-gray-300" />
            </div>
          )}
        </Card>

        <button
          onClick={() =>
            toggle({ id: product.id, name: product.name, price: product.price, image: product.image })
          }
          className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform border border-border/60"
          aria-label={mounted && wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-5 h-5 ${mounted && wished ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
        </button>

        {outOfStock && (
          <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full">
            Out of Stock
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="space-y-8">
        <div>
          {product.category && (
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="inline-block mb-4 text-sm font-semibold text-secondary uppercase tracking-wider hover:text-primary transition-colors"
            >
              {product.category}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-4">
            {product.name}
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-primary mb-2">
            GH₵{product.price.toFixed(2)}
          </p>
        </div>

        {product.description && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          </Card>
        )}

        {outOfStock && (
          <div className="flex items-center gap-3 bg-muted rounded-2xl p-4 w-fit">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="text-gray-600">Availability:</span>
            <span className="text-red-600 font-bold">Out of stock</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <span className="text-foreground font-semibold">Quantity</span>
          <div className="flex items-center bg-muted rounded-full overflow-hidden border border-border">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-5 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-6 py-3 font-bold text-xl min-w-[80px] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              className="px-5 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              disabled={atMaxQuantity}
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Say why the button stopped working, rather than leaving a dead control. */}
          {atMaxQuantity && !outOfStock && (
            <span className="text-sm text-gray-500">
              {maxQuantity === MAX_QUANTITY_PER_LINE
                ? `Maximum ${MAX_QUANTITY_PER_LINE} per order`
                : `Only ${maxQuantity} available`}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            onClick={() =>
              addItem({
                id: product.id,
                name: product.name,
                price: product.price,
                productId: product.id,
                image: product.image,
                quantity,
              })
            }
            disabled={outOfStock}
            className="flex-1"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
          <a href={WHATSAPP_URL(product)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              <MessageCircle className="w-5 h-5 mr-2" />
              Ask on WhatsApp
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: <Truck className="w-5 h-5" />, title: 'Delivery', desc: 'Nationwide' },
            { icon: <Award className="w-5 h-5" />, title: 'Premium', desc: 'Quality' },
            { icon: <Shield className="w-5 h-5" />, title: 'Secure', desc: 'Payment' },
          ].map((badge) => (
            <div key={badge.title} className="text-center p-4 bg-muted rounded-2xl">
              <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                {badge.icon}
              </div>
              <p className="font-bold text-foreground text-sm">{badge.title}</p>
              <p className="text-xs text-gray-500">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
