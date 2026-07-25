import { Card, CardContent } from '@/components/ui/card';
import { Target, Heart, Users, Award, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Our Story
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground font-serif mb-6">About AB Essentia</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Beauty by Nature — A legacy of care, handcrafted for today by nature.
          </p>
        </div>

        {/* Beauty by Nature Section */}
        <section className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
                <Heart className="w-4 h-4" />
                Our Heritage
              </span>
              <h2 className="text-4xl font-bold text-foreground font-serif mb-6">Beauty by Nature</h2>
              <div className="space-y-5 text-gray-600 leading-relaxed text-lg">
                <p>
                  At the heart of AB ESSENTIA is the story of our grandmother Agnes Baidoo — a hardworking, industrious woman who trusted in nature&apos;s power long before &quot;clean beauty&quot; had a name. She showed us how to turn simple botanicals into remedies that cared for the body holistically, teaching us that true care comes from the earth.
                </p>
                <p>
                  Inspired by her wisdom and hands-on approach, we&apos;ve created a modern beauty brand that honors her values: natural ingredients, honest formulations, sustainable practices and free from toxins. Every product reflects her belief that true beauty comes from purity, intention, and respect for the world around us.
                </p>
                <p>
                  AB ESSENTIA is where heritage meets modern beauty care — a legacy of care, handcrafted for today by nature. It is a Ghanaian owned brand with a keen eye for natural, quality and authentic products, preserving tradition by applying values passed down through generations.
                </p>
                <p className="font-bold text-secondary text-xl">
                  From Seed to Skin, AB ESSENTIA brings you &quot;Beauty by Nature&quot;!
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/about-1.jpg" alt="Beauty by Nature" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-24">
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
            <CardContent className="p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-foreground font-serif">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                At AB ESSENTIA, our mission is to provide high-quality, natural products that will nourish, heal and protect our customers Skin and hair, while delivering exceptional customer care and building long-term relationships. We are committed to sustainability, community involvement, women empowerment and promoting Ghanaian culture through our delivery of service to our customers.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Vision Section */}
        <section className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-secondary/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/about-2.jpg" alt="Our Vision" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-dark rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary/20">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-foreground font-serif">Our Vision</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our vision is to become a leading brand renowned for our commitment to quality, customer satisfaction and community development. We aim to inspire a love for natural living and promote Ghanaian culture, while making a positive impact on the environment and society.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-24">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" />
              What We Stand For
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-4">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Heart className="w-8 h-8" />, title: 'Natural Ingredients', desc: 'Free from toxins, honest formulations', from: 'from-primary', to: 'to-secondary' },
              { icon: <Users className="w-8 h-8" />, title: 'Community Focus', desc: 'Women empowerment & community involvement', from: 'from-secondary', to: 'to-secondary-dark' },
              { icon: <Award className="w-8 h-8" />, title: 'Sustainability', desc: 'Respect for the environment', from: 'from-primary', to: 'to-primary-light' },
              { icon: <Target className="w-8 h-8" />, title: 'Ghanaian Heritage', desc: 'Preserving tradition & culture', from: 'from-black', to: 'to-gray-800' },
            ].map((value) => (
              <Card key={value.title} className="group text-center p-8 hover:-translate-y-2 transition-transform duration-300">
                <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${value.from} ${value.to} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">{value.icon}</div>
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground font-serif">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.desc}</p>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
