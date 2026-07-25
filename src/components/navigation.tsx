'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Menu, X, Search, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store';

const navLinks = [
  { href: '/products?category=soaps-cleansers', label: 'Soaps & Cleansers' },
  { href: '/products?category=creams-moisturizers', label: 'Creams & Moisturizers' },
  { href: '/products?category=personal-care', label: 'Personal Care' },
  { href: '/products?category=gift-sets', label: 'Gift Sets' },
  { href: '/products?scent=fruit', label: 'Fruit Scents' },
  { href: '/products?scent=floral', label: 'Floral Scents' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex-1 flex items-center">
            <Link href="/" className="inline-flex items-center justify-center bg-surface rounded-2xl p-2 shadow-lg border border-border/40 transition-transform duration-300 hover:scale-105">
              <Image src="/logo.png" alt="AB Essentia" width={160} height={40} className="h-10 w-auto" />
            </Link>
          </div>

          {/* Desktop Navigation - Categories */}
          <div className="hidden lg:flex flex-none items-center justify-center space-x-1">
            {navLinks.slice(0, 4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-gray-600 hover:text-primary hover:bg-primary/5 transition-all duration-200 font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
            <div className="w-px h-4 bg-border mx-2" />
            {navLinks.slice(4, 6).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-gray-600 hover:text-primary hover:bg-primary/5 transition-all duration-200 font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
            <div className="w-px h-4 bg-border mx-2" />
            {navLinks.slice(6).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-gray-600 hover:text-primary hover:bg-primary/5 transition-all duration-200 font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2.5 rounded-full hover:bg-muted transition-all duration-200 group"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
            </button>

            <Link href="/cart" className="relative p-2.5 rounded-full hover:bg-muted transition-all duration-200 group">
              <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                  {totalItems}
                </span>
              )}
            </Link>

            <Link
              href="/products"
              className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full font-semibold text-sm transition-all duration-300 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Now
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2.5 rounded-full hover:bg-muted transition-all duration-200 group"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="w-5 h-5 text-gray-700 group-hover:text-primary transition-colors" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700 group-hover:text-primary transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="pb-4 animate-in slide-in-from-top-2 duration-300">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-2.5 rounded-full border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder-gray-400 text-sm"
              />
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 space-y-1 bg-surface/95 backdrop-blur-xl border-b border-border/60 -mx-4 px-4 rounded-b-3xl shadow-2xl">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 rounded-xl hover:bg-primary/5 text-gray-700 hover:text-primary font-medium transition-all duration-200 text-sm"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/products"
              className="mt-3 block px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-center text-sm transition-all duration-300"
              onClick={() => setIsOpen(false)}
            >
              Shop Now
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
