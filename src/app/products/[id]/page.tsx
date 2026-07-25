'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Loader2, Star, Sparkles, Heart, Shield, Check, Minus, Plus, Truck, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/store';
import { productApi } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  stock?: number;
  rating?: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((state) => state.addItem);

  const fetchProduct = useCallback(async (id: string) => {
    try {
      const data = await productApi.getById(id);
      setProduct(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details. Please check your connection and try again.');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (params.id) fetchProduct(params.id as string);
  }, [params.id, fetchProduct]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      productId: product.id,
      image: product.image,
      quantity,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600 text-lg">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
        <Card className="p-12 max-w-md text-center">
          <CardContent>
            <p className="text-red-600 mb-6 text-lg">{error || 'Product not found'}</p>
            <Button onClick={() => router.back()} size="lg">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-full px-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

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
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-32 h-32 text-gray-300" />
                </div>
              )}
            </Card>

            <button
              className="absolute top-4 right-4 w-12 h-12 bg-surface rounded-full shadow-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 border border-border/60"
              aria-label="Add to wishlist"
            >
              <Heart className="w-5 h-5" />
            </button>

            {product.stock === 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                Out of Stock
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            <div>
              {product.category && (
                <div className="inline-flex items-center gap-2 mb-4 text-sm font-semibold text-secondary uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  {product.category}
                </div>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground font-serif leading-tight mb-4">
                {product.name}
              </h1>

              {product.rating && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating!)
                            ? 'text-primary fill-primary'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 font-medium">({product.rating.toFixed(1)})</span>
                </div>
              )}

              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                ₵{product.price.toFixed(2)}
              </p>
            </div>

            {product.description && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground font-serif mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </Card>
            )}

            {product.stock !== undefined && (
              <div className="flex items-center gap-3 bg-muted rounded-2xl p-4 w-fit">
                <Shield className="w-5 h-5 text-secondary" />
                <span className="text-gray-600">Availability:</span>
                <span className={product.stock > 0 ? 'text-secondary font-bold' : 'text-red-600 font-bold'}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4">
              <span className="text-foreground font-semibold">Quantity</span>
              <div className="flex items-center bg-muted rounded-full overflow-hidden border border-border">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-5 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 py-3 font-bold text-xl min-w-[80px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-5 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                  disabled={product.stock !== undefined && quantity >= product.stock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/cart')}
                className="flex-1"
              >
                View Cart
              </Button>
            </div>

            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Check className="w-5 h-5 text-secondary" />
                  <h3 className="font-bold text-foreground font-serif">Why Choose Us?</h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
                  {[
                    'Premium quality products',
                    'Fast and reliable shipping',
                    'Secure payment via PayGlobe',
                    'Excellent customer support',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: <Truck className="w-5 h-5" />, title: 'Fast Delivery', desc: 'Nationwide' },
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
      </div>
    </div>
  );
}
