import type { Metadata } from 'next';
import ContactClient from './contact-client';

export const metadata: Metadata = {
  title: 'Contact Us — AB Essentia',
  description:
    'Questions about products, orders or delivery? Reach AB Essentia on WhatsApp, by email or by phone. Shops in Achimota, Accra and Palace Supermarkets branches.',
};

export default function ContactPage() {
  return <ContactClient />;
}
