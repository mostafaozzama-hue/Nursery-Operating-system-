'use client';

import type { ChildDiscountAssignment } from '@nursery-os/contracts';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isApiError } from '@/lib/api/errors';
import { useExpireChildDiscount } from '@/lib/child-discount-assignments/mutations';

/**
 * A minimal Sheet collecting one effectiveTo date - mirrors UnassignChildFeeSheet exactly.
 * effectiveTo-after-effectiveFrom is a server-state rule, deliberately not pre-validated
 * client-side - the backend's real error surfaces via submitError.
 */
export function ExpireChildDiscountSheet({
  childId,
  assignment,
  discountName,
  onOpenChange,
  onDone,
}: {
  childId: string;
  assignment: ChildDiscountAssignment | null;
  discountName: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { mutate: expireDiscount, isPending, error: submitError } = useExpireChildDiscount();
  const [effectiveTo, setEffectiveTo] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignment || !effectiveTo) return;

    try {
      await expireDiscount(childId, assignment.discountId, { effectiveTo });
      setEffectiveTo('');
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  /** Reset on every close, not just a successful submit - the Sheet stays mounted between different target rows, so canceling with a partially-entered date must not leak it into the next row opened. */
  const handleOpenChange = (open: boolean) => {
    if (!open) setEffectiveTo('');
    onOpenChange(open);
  };

  return (
    <Sheet open={assignment !== null} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Expire {discountName}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <p className="text-xs text-muted-foreground">
            Ends this discount assignment as of the effective date below. Past assignment history is
            kept, not overwritten.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expireEffectiveTo">Effective to</Label>
            <Input
              id="expireEffectiveTo"
              type="date"
              value={effectiveTo}
              onChange={(event) => setEffectiveTo(event.target.value)}
            />
          </div>

          {submitError != null && (
            <p className="text-sm text-destructive">
              {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" size="touch" disabled={!effectiveTo || isPending}>
              {isPending ? 'Saving…' : 'Expire'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
