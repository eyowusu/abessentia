'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Menu, X, Search, ShoppingBag, Heart } from 'lucide-react';
import { useCartStore, useWishlistStore } from '@/lib/store';
import { useMounted } from '@/lib/use-mounted';

const navLinks = [
  { href: '/products', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/orders/track', label: 'Track Order' },
  { href: '/contact', label: 'Contact' },
  { href: '/account', label: 'My Orders' },
];

export const Navigation = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mounted = useMounted();

  const totalItems = useCartStore((state) => state.getTotalItems());
  const wishlistCount = useWishlistStore((state) => state.items.length);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setIsSearchOpen(false);
    setIsOpen(false);
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <nav className="fixed top-4 inset-x-0 z-50 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Floating dock */}
        <div className="flex items-center h-16 pl-4 pr-2 rounded-full bg-white/80 backdrop-blur-xl border border-black/[0.06] shadow-lg shadow-black/[0.06]">
          {/* Brand */}
          <Link href="/" className="flex items-center shrink-0 mr-4">
            <Image src="/logo.png" alt="AB Essentia" width={140} height={36} className="h-9 w-auto" priority />
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-gray-600 hover:text-primary hover:bg-primary/5 transition-colors font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => { setIsSearchOpen(!isSearchOpen); setIsOpen(false); }}
              className="p-2.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            <Link href="/wishlist" className="relative p-2.5 rounded-full hover:bg-muted transition-colors" aria-label="Wishlist">
              <Heart className="w-5 h-5 text-gray-600" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link href="/cart" className="relative p-2.5 rounded-full hover:bg-muted transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            <Link
              href="/products"
              className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold text-sm transition-colors ml-1"
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Now
            </Link>

            <button
              onClick={() => { setIsOpen(!isOpen); setIsSearchOpen(false); }}
              className="lg:hidden p-2.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Search panel */}
        {isSearchOpen && (
          <form
            onSubmit={submitSearch}
            className="mt-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/[0.06] shadow-lg p-3"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-2.5 rounded-full border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder-gray-400 text-sm"
              />
            </div>
          </form>
        )}

        {/* Mobile menu */}
        {isOpen && (
          <div className="lg:hidden mt-2 rounded-3xl bg-white/95 backdrop-blur-xl border border-black/[0.06] shadow-lg py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-5 py-3 rounded-xl hover:bg-primary/5 text-gray-700 hover:text-primary font-medium transition-colors text-sm"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-3 pt-2">
              <Link
                href="/products"
                className="block px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold text-center text-sm transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Shop Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
