'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, MapPin, Sparkles, ArrowRight } from 'lucide-react';

export const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  const quickLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/about/founder', label: 'Our Founder' },
    { href: '/about/story', label: 'Founders Blog' },
    { href: '/products', label: 'Products' },
    { href: '/about/ingredients', label: 'Our Ingredients' },
    { href: '/contact', label: 'Contact Us' },
  ];

  return (
    <footer className="bg-black text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company */}
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center justify-center group bg-surface rounded-2xl p-4 shadow-xl shadow-black/10 border border-border/40 transition-transform duration-300 group-hover:scale-105">
              <Image src="/logo.png" alt="AB Essentia" width={160} height={40} className="h-10 w-auto" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              AKWAABA! Welcome to AB Essentia — Ghana. Premium natural beauty crafted with intention.
            </p>
            <div className="space-y-3 text-sm">
              <a href="tel:+2330242351314" className="flex items-center space-x-3 text-gray-300 hover:text-primary transition-colors group">
                <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center group-hover:bg-secondary/25 transition-colors">
                  <Phone className="w-4 h-4 text-secondary-light" />
                </div>
                <span className="font-medium">+233 (0) 24 235 1314</span>
              </a>
              <a href="mailto:info@abessentiagh.com" className="flex items-center space-x-3 text-gray-300 hover:text-primary transition-colors group">
                <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center group-hover:bg-secondary/25 transition-colors">
                  <Mail className="w-4 h-4 text-secondary-light" />
                </div>
                <span className="font-medium">info@abessentiagh.com</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-4 h-4 text-primary-light" />
              <h3 className="text-xs font-bold text-primary-light uppercase tracking-widest">Quick links</h3>
            </div>
            <ul className="space-y-3 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-primary transition-colors flex items-center gap-3 group">
                    <span className="w-1.5 h-1.5 bg-gray-700 rounded-full group-hover:bg-primary transition-colors"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Retail Shops */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-4 h-4 text-primary-light" />
              <h3 className="text-xs font-bold text-primary-light uppercase tracking-widest">Retail Shops</h3>
            </div>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-secondary-light" />
                </div>
                <div className="text-gray-300">
                  <p className="font-medium text-white">A&C Mall, East Legon</p>
                  <p className="text-xs text-gray-500">+233 204525893 (Call/Whatsapp)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-secondary-light" />
                </div>
                <div className="text-gray-300">
                  <p className="font-medium text-white">Marina Mall, Airport City</p>
                  <p className="text-xs text-gray-500">+233 205154298 (Call/Whatsapp)</p>
                </div>
              </li>
              <li className="pt-4 border-t border-gray-800">
                <p className="font-medium text-white mb-2">Shop Hours</p>
                <p className="text-xs text-gray-500">Mon-Sat: 9am - 8pm</p>
                <p className="text-xs text-gray-500">Sun: 1pm - 8pm</p>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-4 h-4 text-primary-light" />
              <h3 className="text-xs font-bold text-primary-light uppercase tracking-widest">Subscribe</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Be the first to know about new collections and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <button
                type="submit"
                className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 flex items-center justify-center gap-2"
              >
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-900 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p className="text-gray-500">&copy; {new Date().getFullYear()} AB Essentia. All rights reserved.</p>
          <div className="flex space-x-3">
            <a href="https://www.instagram.com/stories/ab_essentia/3945314255444490884?utm_source=ig_story_item_share" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 transition-all duration-300 group border border-gray-800 hover:border-transparent">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069 3.204 0 3.584.012 4.849.069 3.252.148 4.771 1.699 4.919 4.92.058 1.265.07 1.645.07 4.849 0 3.204-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://www.facebook.com/share/r/1GEX1dNMWh/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all duration-300 group border border-gray-800 hover:border-transparent">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-white transition-all duration-300 group border border-gray-800 hover:border-transparent">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-red-600 transition-all duration-300 group border border-gray-800 hover:border-transparent">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
