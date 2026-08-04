'use client';

import type { ChildFeeAssignment } from '@nursery-os/contracts';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
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
import { formatEffectiveRange } from '@/lib/child-fee-assignments/mapper';
import { useAssignChildFee } from '@/lib/child-fee-assignments/mutations';
import { useChildFeeAssignments } from '@/lib/child-fee-assignments/queries';
import { useFeeDirectory } from '@/lib/fees/queries';
import { formatMoney } from '@/lib/money';
import { UnassignChildFeeSheet } from './unassign-child-fee-sheet';

/**
 * Assign is an inline disclosure within this card, not a Sheet - two fields (pick an existing Fee,
 * an effective date) doesn't justify a dedicated panel, mirroring PlanFeesSection's exact
 * attach-form shape. Unassign needs a real date input (not just a yes/no), so it gets its own
 * minimal Sheet instead of a ConfirmDialog. Open read (any authenticated user); Assign/Unassign
 * gated on canManage, matching the backend's own OWNER/ADMIN write / open read split.
 */
export function FeeAssignmentsSection({ childId }: { childId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useChildFeeAssignments(childId);
  const {
    fees: allFees,
    byId: feesById,
    isLoading: feesLoading,
    error: feesError,
    refetch: refetchFees,
    // includeInactive: true - deactivating a Fee only blocks new assignments, existing ones stay
    // unaffected, so a Fee referenced by this Child's history must still resolve to its real name
    // even once inactive. The picker below re-filters to active-only itself.
  } = useFeeDirectory(true);
  const { mutate: assignFee, isPending: isAssigning, error: assignError } = useAssignChildFee();

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [pendingUnassign, setPendingUnassign] = useState<ChildFeeAssignment | null>(null);

  const openFeeIds = new Set(
    data.filter((assignment) => !assignment.effectiveTo).map((assignment) => assignment.feeId),
  );
  const availableFees = allFees.filter((fee) => fee.isActive && !openFeeIds.has(fee.id));

  const resetAssignForm = () => {
    setShowAssignForm(false);
    setSelectedFeeId('');
    setEffectiveFrom('');
  };

  const handleAssign = async () => {
    if (!selectedFeeId || !effectiveFrom) return;
    try {
      await assignFee(childId, { feeId: selectedFeeId, effectiveFrom });
      resetAssignForm();
      refetch();
    } catch {
      // surfaced via assignError below
    }
  };

  const feeName = (feeId: string) => feesById.get(feeId)?.name ?? 'Unknown fee';

  const columns: DataTableColumn<ChildFeeAssignment>[] = [
    { header: 'Fee', cell: (assignment) => feeName(assignment.feeId) },
    { header: 'Amount', cell: (assignment) => formatMoney(assignment.snapshotAmount) },
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
            cell: (assignment: ChildFeeAssignment) =>
              !assignment.effectiveTo ? (
                <Button variant="ghost" size="sm" onClick={() => setPendingUnassign(assignment)}>
                  Unassign
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Assignments</CardTitle>
        {canManage && !showAssignForm && (
          <Button size="sm" onClick={() => setShowAssignForm(true)}>
            Assign a fee
          </Button>
        )}
      </CardHeader>

      {canManage && showAssignForm && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <Label>Fee</Label>
            {feesError ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">
                  {isApiError(feesError) ? feesError.message : 'Could not load fees.'}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={refetchFees}>
                  Retry
                </Button>
              </div>
            ) : (
              <Select value={selectedFeeId || undefined} onValueChange={setSelectedFeeId}>
                <SelectTrigger>
                  <SelectValue placeholder={feesLoading ? 'Loading…' : 'Select a fee'} />
                </SelectTrigger>
                <SelectContent>
                  {availableFees.map((fee) => (
                    <SelectItem key={fee.id} value={fee.id}>
                      {fee.name} ({formatMoney(fee.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feeEffectiveFrom">Effective from</Label>
            <Input
              id="feeEffectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
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
              disabled={!selectedFeeId || !effectiveFrom || isAssigning}
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
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(assignment) => assignment.id}
          isLoading={isLoading}
          emptyMessage="No fees assigned yet."
        />
      )}

      <UnassignChildFeeSheet
        childId={childId}
        assignment={pendingUnassign}
        feeName={pendingUnassign ? feeName(pendingUnassign.feeId) : ''}
        onOpenChange={(open) => !open && setPendingUnassign(null)}
        onDone={() => {
          setPendingUnassign(null);
          refetch();
        }}
      />
    </Card>
  );
}
