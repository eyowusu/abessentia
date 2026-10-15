import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 bg-background">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );
}
