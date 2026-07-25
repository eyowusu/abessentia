'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Contact form submitted:', formData);
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Contact form error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const contactInfo = [
    { icon: <Mail className="w-6 h-6" />, title: 'Email', lines: ['info@abessentiagh.com', 'We\'ll respond within 24 hours'], color: 'from-primary to-secondary' },
    { icon: <Phone className="w-6 h-6" />, title: 'Mobile', lines: ['+233 (0) 24 235 1314'], color: 'from-secondary to-secondary-dark' },
    { icon: <MapPin className="w-6 h-6" />, title: 'Address', lines: ['Christian Village Rd', 'Achimota, Accra', 'Ghana'], color: 'from-primary to-primary-light' },
  ];

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Get In Touch
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground font-serif mb-6">Keep In Touch with Us</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We&apos;re talking about clean beauty gift sets, of course – and we&apos;ve got a bouquet of beauties for yourself or someone you love.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground font-serif">Get in Touch</h2>
              </div>

              <div className="space-y-6">
                {contactInfo.map((item) => (
                  <div key={item.title} className="flex items-start gap-4 group">
                    <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                      <div className="text-white">{item.icon}</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground font-serif mb-1">{item.title}</h3>
                      {item.lines.map((line, i) => (
                        <p key={i} className={i === item.lines.length - 1 && item.title === 'Email' ? 'text-sm text-gray-500' : 'text-gray-600'}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-6 h-6 text-primary" />
                  <h3 className="font-bold text-xl text-foreground font-serif">Shop Hours</h3>
                </div>
                <div className="space-y-4 text-gray-700">
                  <div className="flex justify-between items-center py-3 border-b border-border/50">
                    <span className="font-medium">Mon - Fri</span>
                    <span className="text-secondary font-bold">09:30 - 05:00</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-medium">Sat & Sun</span>
                    <span className="text-secondary font-bold">09:30 - 05:30</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="border-secondary/10">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary-dark rounded-xl flex items-center justify-center shadow-lg shadow-secondary/20">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground font-serif">Send us a Message</h2>
              </div>

              {success && (
                <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Thank you! Your message has been sent successfully.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {[
                  { id: 'name', label: 'Name', type: 'text', placeholder: 'Your name' },
                  { id: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                  { id: 'subject', label: 'Subject', type: 'text', placeholder: 'How can we help?' },
                ].map((field) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-sm font-semibold text-foreground mb-2">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      id={field.id}
                      name={field.id}
                      value={formData[field.id as keyof typeof formData]}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder-gray-400"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder-gray-400 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 w-5 h-5" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
