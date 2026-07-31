'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Search, ShoppingCart, Loader2, Star, Heart, Filter, X, ChevronDown, Sparkles } from 'lucide-react';
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
  sku?: string;
  [key: string]: unknown;
}

export default function ProductsPageContent() {
  const searchParams = useSearchParams();
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
      const productList = (data as Record<string, unknown> | null)?.results || data;
      setProducts(Array.isArray(productList) ? productList : []);
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

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);
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
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading products...</p>
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
      <div className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-serif">Products</h1>
              <p className="text-muted-foreground mt-1">Browse our collection of premium skincare products</p>
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
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-5 h-5 mr-2" />
                Filters
                {activeFilterCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount()}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-muted/30 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-2">Price Range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {priceRanges.map(range => (
                    <option key={range.label} value={range.label}>{range.label}</option>
                  ))}
                </select>
              </div>
              {availableSizes.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">Size</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Sizes</option>
                    {availableSizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              )}
              {availableTags.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Tags</option>
                    {availableTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="text-sm">
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group overflow-hidden hover:-translate-y-2 transition-transform duration-300">
                <div className="aspect-square bg-muted relative">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-20 h-20 text-gray-300" />
                    </div>
                  )}
                  <button
                    onClick={() => setHoveredProduct(product.id)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-foreground font-serif mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description ?? ''}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-foreground">₵{product.price.toFixed(2)}</span>
                    {product.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm">{product.rating}</span>
                      </div>
                    )}
                  </div>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground mb-2 font-bold">SKU: {product.sku}</p>
                  )}
                  <Button
                    onClick={() => handleAddToCart(product)}
                    className="w-full"
                    disabled={!product.stock || product.stock <= 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {product.stock && product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
