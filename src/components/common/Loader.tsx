import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-6 w-6 animate-spin text-wine-700', className)}
    />
  );
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader className="h-8 w-8" />
    </div>
  );
}
