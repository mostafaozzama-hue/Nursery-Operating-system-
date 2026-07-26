import { cn } from '@/lib/utils';

/** Per design-system.md §5.10 - pulsing --muted block. Pulse only runs under motion-safe (§7: respect prefers-reduced-motion). */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('motion-safe:animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
