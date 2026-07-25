'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, Loader2, Star, Heart, Filter, X, ChevronDown } from 'lucide-react';
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
  rating?: number;
  stock?: number;
  [key: string]: unknown;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const addItem = useCartStore((state) => state.addItem);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await productApi.getAll();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please check your connection and try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await productApi.getCategories();
      const names = (data || []).map((cat) => (typeof cat === 'string' ? cat : cat.name)).filter(Boolean);
      setCategories(['all', ...names]);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories(['all']);
    }
  }, []);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(product => {
      const sizeFields = ['size', 'sizes', 'variant', 'variants', 'Size', 'Sizes'];
      sizeFields.forEach(field => {
        const value: unknown = product[field];
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((item: unknown) => sizes.add(String(item)));
          } else {
            sizes.add(String(value));
          }
        }
      });
    });
    return Array.from(sizes).sort();
  }, [products]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(product => {
      const tagFields = ['tags', 'tag', 'Tags', 'Tag'];
      tagFields.forEach(field => {
        const value: unknown = product[field];
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((item: unknown) => tags.add(String(item)));
          } else {
            tags.add(String(value));
          }
        }
      });
    });
    return Array.from(tags).sort();
  }, [products]);

  const priceRanges = useMemo(() => {
    if (products.length === 0) return [];
    const prices = products.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const step = range / 5 || 1;
    return [
      { label: 'All', min: 0, max: Infinity },
      { label: `₵${min.toFixed(0)} - ₵${(min + step).toFixed(0)}`, min, max: min + step },
      { label: `₵${(min + step).toFixed(0)} - ₵${(min + step * 2).toFixed(0)}`, min: min + step, max: min + step * 2 },
      { label: `₵${(min + step * 2).toFixed(0)} - ₵${(min + step * 3).toFixed(0)}`, min: min + step * 2, max: min + step * 3 },
      { label: `₵${(min + step * 3).toFixed(0)} - ₵${(min + step * 4).toFixed(0)}`, min: min + step * 3, max: min + step * 4 },
      { label: `₵${(min + step * 4).toFixed(0)} - ₵${max.toFixed(0)}`, min: min + step * 4, max },
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (selectedPriceRange !== 'all') {
      const range = priceRanges.find(r => r.label === selectedPriceRange);
      if (range) {
        filtered = filtered.filter(p => p.price >= range.min && p.price <= range.max);
      }
    }

    if (selectedSize !== 'all') {
      filtered = filtered.filter(p => {
        const sizeFields = ['size', 'sizes', 'variant', 'variants', 'Size', 'Sizes'];
        return sizeFields.some(field => {
          const value: unknown = p[field];
          if (!value) return false;
          if (Array.isArray(value)) {
            return value.some((item: unknown) => String(item) === selectedSize);
          }
          return String(value) === selectedSize;
        });
      });
    }

    if (selectedTag !== 'all') {
      filtered = filtered.filter(p => {
        const tagFields = ['tags', 'tag', 'Tags', 'Tag'];
        return tagFields.some(field => {
          const value: unknown = p[field];
          if (!value) return false;
          if (Array.isArray(value)) {
            return value.some((item: unknown) => String(item) === selectedTag);
          }
          return String(value) === selectedTag;
        });
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        Object.values(p).some((value: unknown) =>
          typeof value === 'string' && value.toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedPriceRange, selectedSize, selectedTag, priceRanges]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      productId: product.id,
      image: product.image,
    });
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedPriceRange('all');
    setSelectedSize('all');
    setSelectedTag('all');
    setSearchQuery('');
  };

  const activeFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedPriceRange !== 'all') count++;
    if (selectedSize !== 'all') count++;
    if (selectedTag !== 'all') count++;
    if (searchQuery) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <ShoppingCart className="w-4 h-4" />
            Premium Collection
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground font-serif mb-4">Our Products</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our premium collection of quality products crafted with care.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-10 p-6">
          <div className="flex flex-col gap-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder-gray-400 text-sm"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`capitalize rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 border ${
                    selectedCategory === category
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'bg-surface text-gray-700 border-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
                {activeFilterCount() > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFilterCount()}
                  </span>
                )}
                <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>

              {activeFilterCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 border-t border-border animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Price Range</label>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
                  >
                    {priceRanges.map(range => (
                      <option key={range.label} value={range.label}>{range.label}</option>
                    ))}
                  </select>
                </div>

                {availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Size</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
                    >
                      <option value="all">All Sizes</option>
                      {availableSizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                )}

                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Tags</label>
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
                    >
                      <option value="all">All Tags</option>
                      {availableTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {error && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-700">
            {error}
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-600 text-lg mb-6">No products found matching your criteria.</p>
            {activeFilterCount() > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <Card className="overflow-hidden h-full hover:-translate-y-2 transition-transform duration-300">
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-20 h-20 text-gray-300" />
                      </div>
                    )}

                    <div className={`absolute top-4 right-4 transition-all duration-300 ${
                      hoveredProduct === product.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                    }`}>
                      <button className="w-10 h-10 bg-surface rounded-full shadow-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-gray-600 border border-border/60">
                        <Heart className="w-5 h-5" />
                      </button>
                    </div>

                    {product.stock === 0 && (
                      <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Out of Stock
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5 flex flex-col">
                    {product.category && (
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">
                        {product.category}
                      </span>
                    )}

                    <h3 className="font-bold text-lg text-foreground font-serif mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{product.description}</p>
                    )}

                    {product.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating!)
                                ? 'text-primary fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-500 ml-1">({product.rating})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-border">
                      <span className="text-2xl font-bold text-primary">
                        ₵{product.price.toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
