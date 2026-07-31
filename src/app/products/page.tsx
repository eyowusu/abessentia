'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ProductsPageContent from './products-content';

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
