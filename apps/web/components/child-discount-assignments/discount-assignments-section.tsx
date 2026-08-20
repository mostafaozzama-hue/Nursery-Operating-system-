'use client';

import type { ChildDiscountAssignment, DiscountType } from '@nursery-os/contracts';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { formatEffectiveRange } from '@/lib/child-discount-assignments/mapper';
import { useAssignChildDiscount, useRemoveChildDiscount } from '@/lib/child-discount-assignments/mutations';
import { useChildDiscountAssignments } from '@/lib/child-discount-assignments/queries';
import { useDiscountDirectory } from '@/lib/discounts/queries';
import { formatMoney } from '@/lib/money';
import { ExpireChildDiscountSheet } from './expire-child-discount-sheet';

/**
 * Assign is an inline disclosure within this card, not a Sheet - same reasoning as
 * FeeAssignmentsSection. Adds an optional effectiveTo at assign time (AssignChildDiscountDto's own
 * shape - a bounded promotional discount known upfront), alongside the required effectiveFrom.
 * Expire needs a real date input, so it gets its own minimal Sheet. Open read (any authenticated
 * user); Assign/Expire gated on canManage, matching the backend's own OWNER/ADMIN write / open read
 * split.
 */
export function DiscountAssignmentsSection({ childId }: { childId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useChildDiscountAssignments(childId);
  const {
    discounts: allDiscounts,
    byId: discountsById,
    isLoading: discountsLoading,
    error: discountsError,
    refetch: refetchDiscounts,
    // includeInactive: true - deactivating a Discount only blocks new assignments, existing ones
    // stay unaffected, so a Discount referenced by this Child's history must still resolve to its
    // real name and type (needed for percentage-vs-currency amount formatting below) even once
    // inactive. The picker below re-filters to active-only itself.
  } = useDiscountDirectory(true);
  const {
    mutate: assignDiscount,
    isPending: isAssigning,
    error: assignError,
  } = useAssignChildDiscount();
  const {
    mutate: removeDiscount,
    isPending: isRemoving,
    error: removeError,
  } = useRemoveChildDiscount();

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [pendingExpire, setPendingExpire] = useState<ChildDiscountAssignment | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ChildDiscountAssignment | null>(null);

  const openAssignments = data.filter((assignment) => !assignment.effectiveTo);
  const openDiscountIds = new Set(openAssignments.map((assignment) => assignment.discountId));
  // Discount bug fix (Easy Enrollment, Product Gap H phase 2): once an
  // exclusive (non-stackable) discount is open, the picker no longer offers
  // *any* other exclusive discount - only the same one already assigned
  // (excluded above) or stackable ones remain pickable. Mirrors the backend
  // conflict check in ChildDiscountAssignmentRepository.assign exactly, so
  // the UI never lets a user attempt a request the API would reject anyway.
  const hasOpenExclusive = openAssignments.some(
    (assignment) => discountsById.get(assignment.discountId)?.stackable === false,
  );
  const availableDiscounts = allDiscounts.filter(
    (discount) =>
      discount.isActive && !openDiscountIds.has(discount.id) && !(hasOpenExclusive && !discount.stackable),
  );

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    try {
      await removeDiscount(childId, pendingRemove.discountId);
      setPendingRemove(null);
      refetch();
    } catch {
      // dialog stays open for the user to retry or cancel
    }
  };

  const resetAssignForm = () => {
    setShowAssignForm(false);
    setSelectedDiscountId('');
    setEffectiveFrom('');
    setEffectiveTo('');
  };

  const handleAssign = async () => {
    if (!selectedDiscountId || !effectiveFrom) return;
    try {
      await assignDiscount(childId, selectedDiscountId, {
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      });
      resetAssignForm();
      refetch();
    } catch {
      // surfaced via assignError below
    }
  };

  const discountName = (discountId: string) =>
    discountsById.get(discountId)?.name ?? 'Unknown discount';

  /**
   * A percentage or a currency value depending on the Discount's own type, same as DiscountList's
   * formatDiscountAmount. type is undefined only if a Discount can no longer be resolved at all
   * (never happens in practice, since includeInactive covers every non-deleted Discount) - falls
   * back to plain currency formatting rather than guessing wrong either way.
   */
  const formatTypedAmount = (type: DiscountType | undefined, amount: string) =>
    type === 'PERCENTAGE' ? `${amount}%` : formatMoney(amount);

  const columns: DataTableColumn<ChildDiscountAssignment>[] = [
    {
      header: 'Discount',
      cell: (assignment) => (
        <span className="inline-flex items-center gap-2">
          {discountName(assignment.discountId)}
          {discountsById.get(assignment.discountId)?.stackable === false && (
            <Badge variant="muted">Exclusive</Badge>
          )}
        </span>
      ),
    },
    {
      header: 'Amount',
      cell: (assignment) =>
        formatTypedAmount(
          discountsById.get(assignment.discountId)?.type,
          assignment.snapshotAmount,
        ),
    },
    {
      header: 'Effective period',
      cell: (assignment) => (
        <span className="inline-flex items-center gap-2">
          {formatEffectiveRange(assignment.effectiveFrom, assignment.effectiveTo)}
          {!assignment.effectiveTo && <Badge variant="success">Current</Badge>}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (assignment: ChildDiscountAssignment) =>
              !assignment.effectiveTo ? (
                <span className="inline-flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setPendingExpire(assignment)}>
                    Expire
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingRemove(assignment)}>
                    Remove
                  </Button>
                </span>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discount Assignments</CardTitle>
        {canManage && !showAssignForm && (
          <Button size="sm" onClick={() => setShowAssignForm(true)}>
            Assign a discount
          </Button>
        )}
      </CardHeader>

      {canManage && showAssignForm && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <Label>Discount</Label>
            {discountsError ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">
                  {isApiError(discountsError)
                    ? discountsError.message
                    : 'Could not load discounts.'}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={refetchDiscounts}>
                  Retry
                </Button>
              </div>
            ) : (
              <Select value={selectedDiscountId || undefined} onValueChange={setSelectedDiscountId}>
                <SelectTrigger>
                  <SelectValue placeholder={discountsLoading ? 'Loading…' : 'Select a discount'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDiscounts.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      {discount.name} ({formatTypedAmount(discount.type, discount.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasOpenExclusive && (
              <p className="text-xs text-muted-foreground">
                An exclusive discount is already active - only stackable discounts can be added
                alongside it. Remove the exclusive one first to assign a different exclusive discount.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discountEffectiveFrom">Effective from</Label>
            <Input
              id="discountEffectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discountEffectiveTo">Effective to (optional)</Label>
            <Input
              id="discountEffectiveTo"
              type="date"
              value={effectiveTo}
              onChange={(event) => setEffectiveTo(event.target.value)}
            />
          </div>

          {assignError != null && (
            <p className="text-sm text-destructive">
              {isApiError(assignError) ? assignError.message : 'Something went wrong.'}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!selectedDiscountId || !effectiveFrom || isAssigning}
              onClick={handleAssign}
            >
              {isAssigning ? 'Assigning…' : 'Assign'}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetAssignForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">
            {isApiError(error) ? error.message : 'Something went wrong.'}
          </p>
          <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
            Retry
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(assignment) => assignment.id}
            isLoading={isLoading}
            emptyMessage="No discounts assigned yet."
          />
          {removeError != null && (
            <p className="text-sm text-destructive">
              {isApiError(removeError) ? removeError.message : 'Something went wrong.'}
            </p>
          )}
        </>
      )}

      <ExpireChildDiscountSheet
        childId={childId}
        assignment={pendingExpire}
        discountName={pendingExpire ? discountName(pendingExpire.discountId) : ''}
        onOpenChange={(open) => !open && setPendingExpire(null)}
        onDone={() => {
          setPendingExpire(null);
          refetch();
        }}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Remove discount"
        description={
          pendingRemove
            ? `Are you sure you want to remove "${discountName(pendingRemove.discountId)}" from this child? This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        isPending={isRemoving}
        onConfirm={handleConfirmRemove}
      />
    </Card>
  );
}
