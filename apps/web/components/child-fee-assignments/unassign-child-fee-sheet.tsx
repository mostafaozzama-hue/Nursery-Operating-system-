'use client';

import type { ChildFeeAssignment } from '@nursery-os/contracts';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isApiError } from '@/lib/api/errors';
import { useUnassignChildFee } from '@/lib/child-fee-assignments/mutations';

/**
 * A minimal Sheet collecting one effectiveTo date - a ConfirmDialog doesn't fit here, since
 * unassigning needs a real business date, not a yes/no. Mirrors SetPlanPriceSheet/
 * SetSiblingDiscountTierSheet's "one date, one button" shape. effectiveTo-after-effectiveFrom is a
 * server-state rule, deliberately not pre-validated client-side - the backend's real error surfaces
 * via submitError, same convention as PlanPrice/SiblingDiscountTier's own date-ordering rules.
 */
export function UnassignChildFeeSheet({
  childId,
  assignment,
  feeName,
  onOpenChange,
  onDone,
}: {
  childId: string;
  assignment: ChildFeeAssignment | null;
  feeName: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { mutate: unassignFee, isPending, error: submitError } = useUnassignChildFee();
  const [effectiveTo, setEffectiveTo] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignment || !effectiveTo) return;

    try {
      await unassignFee(childId, assignment.feeId, { effectiveTo });
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
          <SheetTitle>Unassign {feeName}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <p className="text-xs text-muted-foreground">
            Ends this fee assignment as of the effective date below. Past assignment history is
            kept, not overwritten.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unassignEffectiveTo">Effective to</Label>
            <Input
              id="unassignEffectiveTo"
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
              {isPending ? 'Saving…' : 'Unassign'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
