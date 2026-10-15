'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CONTACT_EMAIL } from '@/lib/config';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 bg-background">
      <Card className="max-w-md w-full text-center p-10 border-primary/10">
        <CardContent className="p-0">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-foreground mb-3">Something went wrong</h1>
          <p className="text-gray-600 mb-2">
            We hit an unexpected problem loading this page. Trying again usually fixes it.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            If it keeps happening, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={reset}>
              Try Again
            </Button>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
