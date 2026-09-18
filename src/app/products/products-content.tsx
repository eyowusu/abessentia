'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product-card';
import { productApi } from '@/lib/api-client';
import type { CatalogueProduct } from '@/lib/server/catalogue';

interface ProductsPageContentProps {
  initialProducts: CatalogueProduct[];
  initialCategories: string[];
}

export default function ProductsPageContent({ initialProducts, initialCategories }: ProductsPageContentProps) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<CatalogueProduct[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>(['all', ...initialCategories]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');

  const fetchProducts = useCallback(async () => {
    try {
      const data = await productApi.getAll({ page_size: 100 });
      const productList = (data as Record<string, unknown> | null)?.results || data;
      setProducts(Array.isArray(productList) ? productList : []);
      setError(null);
    } catch {
      setError('Failed to load products. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await productApi.getCategories();
      const names = (data || []).map((cat) => (typeof cat === 'string' ? cat : cat.name)).filter(Boolean);
      setCategories(['all', ...names]);
    } catch {
      // Server-provided categories already populate the list.
    }
  }, []);

  // Only fetch client-side when the server render had no data to work with
  // (e.g. the catalogue API was unreachable at build/revalidate time).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialProducts.length === 0) fetchProducts();
    if (initialCategories.length === 0) fetchCategories();
  }, [fetchProducts, fetchCategories, initialProducts.length, initialCategories.length]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setShowFilters(true);
    }
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const priceRanges = useMemo(() => {
    if (products.length === 0) return [];
    const prices = products.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const step = (max - min) / 5 || 1;
    return [
      { label: 'All', min: 0, max: Infinity },
      { label: `Under ₵${(min + step).toFixed(0)}`, min: 0, max: min + step },
      { label: `₵${(min + step).toFixed(0)} - ₵${(min + step * 3).toFixed(0)}`, min: min + step, max: min + step * 3 },
      { label: `Over ₵${(min + step * 3).toFixed(0)}`, min: min + step * 3, max: Infinity },
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedPriceRange !== 'all') {
      const range = priceRanges.find((r) => r.label === selectedPriceRange);
      if (range) {
        filtered = filtered.filter((p) => p.price >= range.min && p.price <= range.max);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedPriceRange, priceRanges]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedPriceRange('all');
    setSearchQuery('');
  };

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedPriceRange !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-48 bg-muted rounded-lg mb-8 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchProducts}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Products</h1>
              <p className="text-muted-foreground mt-1">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} in our natural skincare collection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="relative">
                <Filter className="w-5 h-5 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Category chips — always visible, faster than a dropdown */}
      {categories.length > 2 && (
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extended filters */}
      {showFilters && (
        <div className="bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-2">Price Range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {priceRanges.map((range) => (
                    <option key={range.label} value={range.label}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" onClick={clearFilters} className="text-sm">
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No products found matching your criteria.</p>
            <Button onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
