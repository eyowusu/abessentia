'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/store';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart } = useCartStore();

  const handleCheckout = () => router.push('/checkout');

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
        <Card className="max-w-md w-full text-center p-12">
          <CardContent className="p-0">
            <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-foreground font-serif">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some products to get started on your shopping journey.</p>
            <Button onClick={() => router.push('/products')} size="lg">
              Browse Products
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Shopping Cart
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-4">
            Your Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})
          </h1>
          <p className="text-gray-600">Review your items before checkout.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="relative w-28 h-28 bg-muted rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill unoptimized sizes="112px" className="object-cover" />
                      ) : (
                        <ShoppingBag className="w-12 h-12 text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl mb-2 text-foreground font-serif line-clamp-1">{item.name}</h3>
                      <p className="text-primary font-bold text-2xl mb-4">₵{item.price.toFixed(2)}</p>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-muted rounded-full overflow-hidden border border-border">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-4 py-2.5 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 font-bold text-lg min-w-[50px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-4 py-2.5 hover:bg-white transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full p-2.5"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-center hidden sm:flex">
                      <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                      <p className="text-2xl font-bold text-foreground">₵{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={clearCart}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-full py-3"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-primary/10">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Shield className="w-5 h-5 text-secondary" />
                  <h2 className="text-xl font-bold text-foreground font-serif">Order Summary</h2>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-foreground">₵{getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-secondary font-medium">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="text-secondary font-medium">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-2xl font-bold text-foreground">
                      <span>Total</span>
                      <span className="text-primary">₵{getTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button size="lg" onClick={handleCheckout} className="w-full">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <Shield className="w-4 h-4 text-secondary" />
                    <span>Secure checkout powered by PayGlobe</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
