import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Truck, Shield, Leaf, Droplets, Gem, Flower, Award, Globe, ChevronRight, MapPin, Clock, TrendingUp, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProductCard from '@/components/product-card';
import { getCategories, getFeatured, getTrending, getBundles } from '@/lib/server/catalogue';

export const metadata: Metadata = {
  title: 'AB Essentia — Natural Beauty, Handcrafted in Ghana',
  description:
    'Shop premium natural skincare handcrafted in Ghana: black soaps, body butters, hair oils and more. Delivery nationwide.',
};

export const revalidate = 300;

const WHATSAPP_URL =
  'https://wa.me/233242351314?text=' +
  encodeURIComponent('Hello AB Essentia! I have a question about your products.');

const CATEGORY_META: Record<string, { image: string; description: string }> = {
  'ALL PRODUCTS': {
    image: '/hero-aot-38.jpg',
    description: 'Browse our complete collection of all products',
  },
  '1 KG POUCHES': {
    image: '/IMG_3006.jpeg',
    description: 'Bulk packaging for wholesale and large quantity needs',
  },
  'BEARD AND HAIR OIL': {
    image: '/IMG_4793.jpg',
    description: 'Nourishing oils for beard grooming and hair care',
  },
  'BODY BUTTERS': {
    image: '/IMG_3007.jpeg',
    description: 'Rich, creamy body butters for deep moisturization',
  },
  'FACE AND BODY SCRUBS': {
    image: '/IMG_4795.jpg',
    description: 'Exfoliating scrubs for smooth, glowing skin',
  },
  'HAIR OILS': {
    image: '/IMG_3008.jpeg',
    description: 'Natural hair oils for nourishment and growth',
  },
  'MOISTURIZING BODY OILS': {
    image: '/IMG_4797.jpg',
    description: 'Lightweight body oils for daily hydration',
  },
  'MORINGA BLACK SOAPS': {
    image: '/IMG_4798.jpg',
    description: 'Traditional African black soap with moringa benefits',
  },
  'PURE SEED OILS': {
    image: '/IMG_4878.jpg',
    description: 'Pure, unrefined seed oils for natural skincare',
  },
};

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  '1 KG POUCHES': Droplets,
  'BEARD AND HAIR OIL': Gem,
  'BODY BUTTERS': Flower,
  'FACE AND BODY SCRUBS': Sparkles,
  'HAIR OILS': Droplets,
  'MOISTURIZING BODY OILS': Gem,
  'MORINGA BLACK SOAPS': Flower,
  'PURE SEED OILS': Sparkles,
};

const ingredients = [
  { name: 'Moringa', benefit: 'Rich in antioxidants, promotes skin regeneration', icon: Leaf },
  { name: 'Shea Butter', benefit: 'Deep moisturization, reduces inflammation', icon: Droplets },
  { name: 'Neem', benefit: 'Antibacterial, treats skin conditions', icon: Flower },
  { name: 'Coconut Oil', benefit: 'Nourishing, protects skin barrier', icon: Gem },
];

const valueProps = [
  { icon: Leaf, title: '100% Natural', desc: 'Pure organic ingredients' },
  { icon: Globe, title: 'Made in Ghana', desc: 'Handcrafted locally' },
  { icon: Shield, title: 'Quality Assured', desc: 'Premium quality tested' },
  { icon: Truck, title: 'Nationwide Delivery', desc: 'Rider delivers, pay on delivery' },
];

const aboutLinks = [
  { href: '/about', title: 'The Vision', desc: 'Our brand values and mission' },
  { href: '/about', title: 'The AB Essentia Story', desc: 'Our journey and heritage' },
  { href: '/products', title: "What's in our Products", desc: 'Our premium ingredients' },
  { href: '/about', title: 'The Founder', desc: 'Meet our founder' },
];

export default async function Home() {
  const [categories, featured, trending, bundles] = await Promise.all([
    getCategories(),
    getFeatured(),
    getTrending(),
    getBundles(),
  ]);

  const hasAllProducts = categories.some((c) => c.name.toUpperCase() === 'ALL PRODUCTS');
  const allCategories = hasAllProducts
    ? categories
    : [{ id: 'all', name: 'ALL PRODUCTS' }, ...categories];

  const featuredList = featured.length > 0 ? featured.slice(0, 4) : trending.slice(0, 4);

  return (
    <div className="flex flex-col bg-background">
      {/* Hero — single static image */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-black">
        <Image
          src="/hero-aot-51.jpg"
          alt="AB Essentia natural beauty products"
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary-light" />
              Handcrafted in Ghana
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white font-serif leading-[1.1] text-balance">
              Nature&apos;s Care, Handcrafted for You
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-xl">
              Premium African skincare — black soaps, body butters and nourishing oils, made from pure natural ingredients.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/products">
                <Button size="lg">
                  Shop Now
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  <MessageCircle className="mr-2 w-5 h-5" />
                  Chat on WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              Categories
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">
              The best way to buy the products you love.
            </h2>
            <p className="text-lg text-gray-600">
              Browse our premium collection of natural beauty products, crafted in Ghana.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allCategories.map((category) => {
              const name = category.name;
              const meta = CATEGORY_META[name];
              const Icon = CATEGORY_ICONS[name] ?? Sparkles;
              const image = category.image || meta?.image || '/hero-2.jpeg';
              const description = category.description || meta?.description || `Shop ${name}`;
              return (
                <Link
                  key={category.id || name}
                  href={name === 'ALL PRODUCTS' ? '/products' : `/products?category=${encodeURIComponent(name)}`}
                  className="group relative block overflow-hidden rounded-3xl bg-black aspect-[4/5]"
                >
                  <Image
                    src={image}
                    alt={name}
                    fill
                    className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <div className="w-12 h-12 mb-4 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-primary-light">
                      <Icon className="w-6 h-6" />
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
        </div>
      </section>

      {/* Featured Products */}
      {featuredList.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Products */}
      {trending.length > 0 && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ingredients */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Leaf className="w-4 h-4" />
              Ingredients
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Nature&apos;s Best Ingredients</h2>
            <p className="text-lg text-gray-600">
              Our products are crafted with premium organic ingredients sourced directly from Ghana.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ingredients.map((ingredient) => (
              <Card key={ingredient.name} className="text-center p-8">
                <div className="w-14 h-14 mx-auto mb-5 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <ingredient.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground font-serif mb-2">{ingredient.name}</h3>
                <p className="text-gray-600 text-sm">{ingredient.benefit}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bundles */}
      {bundles.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
                <Award className="w-4 h-4" />
                Save More
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Bundle &amp; Save</h2>
              <p className="text-lg text-gray-600">Get more value with our curated product bundles.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {bundles.map((bundle) => (
                <Card key={bundle.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/5 aspect-square md:aspect-auto bg-gray-50 relative">
                      {bundle.image ? (
                        <Image
                          src={bundle.image}
                          alt={bundle.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-20 h-20 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <CardContent className="md:w-3/5 p-8 flex flex-col justify-center">
                      <span className="inline-flex w-fit items-center gap-1.5 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                        <Award className="w-3 h-3" /> Best Value
                      </span>
                      <h3 className="text-2xl font-bold text-foreground font-serif mb-2">{bundle.name}</h3>
                      <p className="text-gray-600 text-sm mb-6">
                        Includes: {Array.isArray(bundle.products) ? bundle.products.join(', ') : bundle.products}
                      </p>
                      <Link href="/products" className="inline-flex items-center gap-2 text-primary font-semibold">
                        Shop Bundle <ChevronRight className="w-4 h-4" />
                      </Link>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Quick Links */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
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
              <Link key={link.title} href={link.href} className="group">
                <Card className="h-full p-6">
                  <h3 className="text-xl font-bold text-foreground font-serif mb-2 group-hover:text-primary transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-gray-600">{link.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((prop) => (
              <div key={prop.title} className="bg-background rounded-3xl border border-[#E7E5E4] p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-5 bg-primary rounded-2xl flex items-center justify-center text-white">
                  <prop.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-serif mb-1">{prop.title}</h3>
                <p className="text-gray-500 text-sm">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Retail Locations */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <MapPin className="w-4 h-4" />
              Retail
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-serif mb-4">Retail Shops</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-serif">Palace Supermarkets</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {['Spintex', 'Labone', 'Adenta', 'Tema'].map((branch) => (
                  <div key={branch} className="flex items-center text-gray-600">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5" />
                    {branch}
                  </div>
                ))}
              </div>
            </Card>
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
        </div>
      </section>

      {/* CTA — WhatsApp */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1F5E43] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-serif">Questions? We&apos;re a chat away.</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Message us on WhatsApp for product advice, orders, or delivery questions — we reply personally.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-white text-[#1F5E43] hover:bg-white/90">
                <MessageCircle className="mr-2 w-5 h-5" />
                Chat on WhatsApp
              </Button>
            </a>
            <Link href="/products">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                Browse Products
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
