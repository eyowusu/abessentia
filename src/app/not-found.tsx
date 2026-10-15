import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 bg-background">
      <Card className="max-w-md w-full text-center p-10 border-primary/10">
        <CardContent className="p-0">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <Package className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Page not found</h1>
          <p className="text-gray-600 mb-8">
            The page or product you are looking for does not exist or may have been removed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
