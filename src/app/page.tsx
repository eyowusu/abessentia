'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Truck, Shield, Star, Leaf, Droplets, Gem, Flower, Award, Globe, ChevronRight, ChevronLeft, Quote, MapPin, Phone, Clock, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { productApi } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  rating?: number;
  stock: number;
  createdAt?: string;
  sku?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

const CATEGORY_META: Record<string, { image: string; description: string; icon: ReactNode }> = {
  '1 KG POUCHES': {
    image: '/IMG_3006.jpeg',
    description: 'Bulk packaging for wholesale and large quantity needs',
    icon: <Droplets className="w-6 h-6" />
  },
  'BEARD AND HAIR OIL': {
    image: '/IMG_4793.PNG',
    description: 'Nourishing oils for beard grooming and hair care',
    icon: <Gem className="w-6 h-6" />
  },
  'BODY BUTTERS': {
    image: '/IMG_3007.jpeg',
    description: 'Rich, creamy body butters for deep moisturization',
    icon: <Flower className="w-6 h-6" />
  },
  'FACE AND BODY SCRUBS': {
    image: '/IMG_4795.PNG',
    description: 'Exfoliating scrubs for smooth, glowing skin',
    icon: <Sparkles className="w-6 h-6" />
  },
  'HAIR OILS': {
    image: '/IMG_3008.jpeg',
    description: 'Natural hair oils for nourishment and growth',
    icon: <Droplets className="w-6 h-6" />
  },
  'MOISTURIZING BODY OILS': {
    image: '/IMG_4797.PNG',
    description: 'Lightweight body oils for daily hydration',
    icon: <Gem className="w-6 h-6" />
  },
  'MORINGA BLACK SOAPS': {
    image: '/IMG_4798.PNG',
    description: 'Traditional African black soap with moringa benefits',
    icon: <Flower className="w-6 h-6" />
  },
  'PURE SEED OILS': {
    image: '/IMG_4878.PNG',
    description: 'Pure, unrefined seed oils for natural skincare',
    icon: <Sparkles className="w-6 h-6" />
  }
};

const getBadge = (product: Product): string => {
  if (product.createdAt) {
    const created = new Date(product.createdAt).getTime();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (created > thirtyDaysAgo) return 'New';
  }
  if ((product.rating || 0) >= 4.5) return 'Best Seller';
  return 'Popular';
};

const heroImages = [
  '/hero-aot-51.jpg',
  '/hero-aot-52.jpg',
  '/hero-aot-54.jpg'
];

const testimonials = [
  {
    id: 1,
    name: 'Sarah Mensah',
    rating: 5,
    text: 'I love supporting AB Essentia Shea Butter and other beauty products. The creams make my skin so soft and the shower gels are just perfect.',
    product: 'Mango Sorbet Shea Butter Fusion'
  },
  {
    id: 2,
    name: 'Emma Osei',
    rating: 5,
    text: 'Good product. I love it. It smells amazing.',
    product: 'Vanilla Mint Body Oil'
  },
  {
    id: 3,
    name: 'Ama Kwarteng',
    rating: 5,
    text: 'Love this! More almond chocolate body wash for myself and my family. Will definitely be buying more!!!',
    product: 'Almond & Chocolate African Black Soap Shower Gel'
  },
  {
    id: 4,
    name: 'Kojo Asante',
    rating: 5,
    text: 'Absolutely no words, it is clearing up my face and slowly restoring my skin\'s barrier. I love it!',
    product: 'Clear Skin Bar Soap - Turmeric & Cinnamon'
  },
  {
    id: 5,
    name: 'Efua Mensah',
    rating: 5,
    text: 'Seriously, there are no words. The long-lasting scent, the glow it leaves on the skin woooow.',
    product: 'Almond & Chocolate Body Cream'
  },
  {
    id: 6,
    name: 'Kwame Ofori',
    rating: 5,
    text: 'A pleasant, nourishing soap that\'s soothing for regular skincare routines. This smells fantastic!',
    product: 'Baby Love Body Cream'
  }
];

const ingredients = [
  { id: 1, name: 'Moringa', benefit: 'Rich in antioxidants, promotes skin regeneration', icon: <Leaf className="w-6 h-6" /> },
  { id: 2, name: 'Shea Butter', benefit: 'Deep moisturization, reduces inflammation', icon: <Droplets className="w-6 h-6" /> },
  { id: 3, name: 'Neem', benefit: 'Antibacterial, treats skin conditions', icon: <Flower className="w-6 h-6" /> },
  { id: 4, name: 'Coconut Oil', benefit: 'Nourishing, protects skin barrier', icon: <Gem className="w-6 h-6" /> }
];

const bundles = [
  { id: 1, name: 'Hair Care Bundle', products: ['Hair Growth Oil', 'Coconut Oil'], image: '/IMG_2884.jpg' },
  { id: 2, name: 'Complete Skincare Set', products: ['Moringa Oil', 'Shea Butter', 'Face Scrub'], image: '/IMG_2915.jpg' }
];

const scentCollections = [
  { id: 1, name: 'Fruit', scents: ['Berry Tropical', 'Mango', 'Cocoa', 'Coconut'], icon: <Gem className="w-6 h-6" /> },
  { id: 2, name: 'Floral', scents: ['Baby Love', 'Lavender', 'Moringa Rose'], icon: <Flower className="w-6 h-6" /> },
  { id: 3, name: 'Herbs & Spice', scents: ['Lemon', 'Peppermint', 'Cinnamon & Spice', 'Fresh Herbs'], icon: <Leaf className="w-6 h-6" /> },
  { id: 4, name: 'Unscented', scents: ['Unscented Oils and Soaps'], icon: <Droplets className="w-6 h-6" /> }
];

const retailLocations = [
  { id: 1, name: 'A&C Mall, East Legon', phone: '+233 204525893', contact: 'Call/Whatsapp' },
  { id: 2, name: 'Marina Mall, Airport City', phone: '+233 205154298', contact: 'Call/Whatsapp' }
];

const valueProps = [
  { icon: <Leaf className="w-6 h-6" />, title: '100% Natural', desc: 'Pure organic ingredients' },
  { icon: <Globe className="w-6 h-6" />, title: 'Made in Ghana', desc: 'Handcrafted locally' },
  { icon: <Shield className="w-6 h-6" />, title: 'Quality Assured', desc: 'Premium quality tested' },
  { icon: <Truck className="w-6 h-6" />, title: 'Fast Delivery', desc: 'Quick shipping nationwide' }
];

const aboutLinks = [
  { href: '/about/vision', title: 'The Vision', desc: 'Our brand values and mission' },
  { href: '/about/story', title: 'The AB Essentia Story', desc: 'Our journey and heritage' },
  { href: '/about/ingredients', title: 'What\'s in our Products', desc: 'Our premium ingredients' },
  { href: '/about/founder', title: 'The Founder', desc: 'Meet our founder' }
];

export default function Home() {
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [currentHero, setCurrentHero] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const handleTestimonialsScroll = () => {
    if (testimonialsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = testimonialsRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const ref = testimonialsRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleTestimonialsScroll);
      handleTestimonialsScroll();
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', handleTestimonialsScroll);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [categoryList, featuredProducts, trendingProducts] = await Promise.all([
          productApi.getCategories(),
          productApi.getFeatured(),
          productApi.getTrending(),
        ]);
        if (!isMounted) return;
        setCategories(categoryList as Category[]);
        setFeatured(featuredProducts.length > 0 ? featuredProducts : trendingProducts.slice(0, 4));
        setTrending(trendingProducts);
      } catch (error) {
        console.error('Failed to load home page data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const scrollTestimonials = (direction: 'left' | 'right') => {
    if (testimonialsRef.current) {
      testimonialsRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col bg-background">
      {/* Hero */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-black">
        <div className="absolute inset-0">
          {heroImages.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt="AB Essentia natural beauty"
              fill
              sizes="100vw"
              priority={index === 0}
              className={`object-cover object-center transition-all duration-[2000ms] ease-in-out ${
                index === currentHero ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-110 z-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent z-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-20" />
        </div>

        <div className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary-light" />
              Beauty by Nature
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white font-serif leading-[1.1] text-balance">
              Nature&apos;s Care, Handcrafted for You
            </h1>
            <p className="text-xl md:text-2xl text-primary-light font-serif leading-relaxed text-balance">
              Experience them with AB Essentia
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-white/90 font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Nature Inspired
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Hand-crafted
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                African Skincare
              </span>
            </div>
            <Link href="/products" className="inline-block">
              <Button size="lg">
                Shop Now
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHero(index)}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === currentHero ? 'w-8 bg-primary' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Side arrows */}
        <button
          onClick={() => setCurrentHero((prev) => (prev - 1 + heroImages.length) % heroImages.length)}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:border-primary transition-all duration-300"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentHero((prev) => (prev + 1) % heroImages.length)}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:border-primary transition-all duration-300"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </section>

      {/* Product Categories */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              Categories
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">The best way to buy the products you love.</h2>
            <p className="text-lg text-gray-600">Browse our premium collection of natural beauty products, crafted in Ghana.</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => {
                const name = category.name;
                const meta = CATEGORY_META[name];
                const icon = meta?.icon ?? <Sparkles className="w-6 h-6" />;
                const image = category.image || '/hero-2.jpeg';
                const description = category.description || meta?.description || `Shop ${name}`;
                return (
                  <Link key={category.id || name} href="/products" className="group relative block overflow-hidden rounded-3xl bg-black aspect-[4/5]">
                    <Image
                      src={image}
                      alt={name}
                      fill
                      className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                      <div className="w-12 h-12 mb-4 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-primary-light">
                        {icon}
                      </div>
                      <h3 className="text-2xl font-bold text-white font-serif mb-2">{name}</h3>
                      <p className="text-white/80 text-sm leading-relaxed mb-4 line-clamp-2">{description}</p>
                      <span className="inline-flex items-center text-primary-light font-semibold group-hover:gap-2 transition-all">
                        Shop <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Scent Collections */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              Fragrance
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Shop by Scent Collection</h2>
            <p className="text-lg text-gray-600">Find your perfect scent from our curated collections.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scentCollections.map((collection) => (
              <Card key={collection.id} className="group p-6 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 mb-6 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  {collection.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground font-serif mb-4">{collection.name}</h3>
                <ul className="space-y-2">
                  {collection.scents.map((scent, index) => (
                    <li key={index} className="text-sm text-gray-600 hover:text-primary cursor-pointer transition-colors">
                      {scent}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
                <Sparkles className="w-4 h-4" />
                Featured
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif">Featured Products</h2>
            </div>
            <Link href="/products" className="inline-flex items-center gap-1 text-primary font-semibold hover:gap-2 transition-all">
              View All <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/products/${product.id}`} className="group block">
                  <Card className="overflow-hidden hover:-translate-y-2 transition-transform duration-300">
                    <div className="aspect-square bg-muted relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-20 h-20 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <span className="inline-block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                        {getBadge(product)}
                      </span>
                      <h3 className="text-lg font-bold text-foreground font-serif mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                      <p className="text-gray-500 text-sm line-clamp-2">{product.description ?? ''}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
                <TrendingUp className="w-4 h-4" />
                Trending
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif">Trending Products</h2>
            </div>
            <Link href="/products" className="inline-flex items-center gap-1 text-primary font-semibold hover:gap-2 transition-all">
              View All <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/products/${product.id}`} className="group block">
                  <Card className="overflow-hidden hover:-translate-y-2 transition-transform duration-300">
                    <div className="aspect-square bg-muted relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-20 h-20 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <span className="inline-block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                        {getBadge(product)}
                      </span>
                      <h3 className="text-lg font-bold text-foreground font-serif mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                      <p className="text-gray-500 text-sm line-clamp-2">{product.description ?? ''}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ingredients */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              Ingredients
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Nature&apos;s Best Ingredients</h2>
            <p className="text-lg text-gray-600">Our products are crafted with premium organic ingredients sourced directly from Ghana.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ingredients.map((ingredient) => (
              <Card key={ingredient.id} className="group text-center p-8 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  {ingredient.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground font-serif mb-2">{ingredient.name}</h3>
                <p className="text-gray-600 text-sm">{ingredient.benefit}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bundles */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              Save More
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Bundle & Save</h2>
            <p className="text-lg text-gray-600">Get more value with our curated product bundles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {bundles.map((bundle) => (
              <Card key={bundle.id} className="group overflow-hidden hover:-translate-y-2 transition-transform duration-300">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-2/5 aspect-square md:aspect-auto bg-gray-50 relative">
                    <Image
                      src={bundle.image}
                      alt={bundle.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                  </div>
                  <CardContent className="md:w-3/5 p-8 flex flex-col justify-center">
                    <span className="inline-flex w-fit items-center gap-1.5 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                      <Award className="w-3 h-3" /> Best Value
                    </span>
                    <h3 className="text-2xl font-bold text-foreground font-serif mb-2">{bundle.name}</h3>
                    <p className="text-gray-600 text-sm mb-6">Includes: {bundle.products.join(', ')}</p>
                    <Link href="/products" className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                      Shop Bundle <ChevronRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              Testimonials
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Let customers speak for us</h2>
          </div>
          <div className="relative">
            {showLeft && (
              <button
                onClick={() => scrollTestimonials('left')}
                className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-surface rounded-full shadow-xl flex items-center justify-center hover:bg-muted transition-colors border border-border/60"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
            )}
            <div
              ref={testimonialsRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="flex-shrink-0 w-80 p-6 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <p className="font-bold text-foreground text-sm">{testimonial.name}</p>
                      <p className="text-xs text-secondary font-medium mt-0.5">{testimonial.product}</p>
                    </div>
                    <Quote className="w-8 h-8 text-primary/20" />
                  </div>
                </Card>
              ))}
            </div>
            {showRight && (
              <button
                onClick={() => scrollTestimonials('right')}
                className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-surface rounded-full shadow-xl flex items-center justify-center hover:bg-muted transition-colors border border-border/60"
              >
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* About Quick Links */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              About Us
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Our Story</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aboutLinks.map((link) => (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full p-6 hover:-translate-y-2 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-foreground font-serif mb-2 group-hover:text-primary transition-colors">{link.title}</h3>
                  <p className="text-sm text-gray-600">{link.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((prop, idx) => (
              <div key={idx} className="bg-muted rounded-3xl p-8 text-center hover:-translate-y-1 transition-transform duration-300">
                <div className="w-14 h-14 mx-auto mb-5 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  {prop.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground font-serif mb-1">{prop.title}</h3>
                <p className="text-gray-500 text-sm">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Retail Locations */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <MapPin className="w-4 h-4" />
              Retail
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Retail Shops</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {retailLocations.map((loc) => (
              <Card key={loc.id} className="p-6 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground font-serif mb-1">{loc.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{loc.phone}</span>
                      <span className="text-secondary font-medium">({loc.contact})</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground font-serif">Shop Hours</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Mondays - Saturdays</p>
                <p className="text-gray-600">9am - 8pm</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Sundays</p>
                <p className="text-gray-600">1pm - 8pm</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-serif">Start Your Natural Beauty Journey</h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">Join thousands of customers with AB Essentia&apos;s premium natural products.</p>
          <Link href="/products" className="inline-block">
            <Button size="lg">
              Shop Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
