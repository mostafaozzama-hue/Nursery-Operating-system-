import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Easy Enrollment (Product Gap H, phase 2) - a visible, non-blocking
 * reminder for missing-but-important information (e.g. plannedEndDate).
 * Reuses the existing warning color token (design-system.md §5.7, same as
 * Badge's "warning" variant) rather than introducing a new one. Never
 * disables the save action it sits next to - purely informational.
 */
export function InlineWarning({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
