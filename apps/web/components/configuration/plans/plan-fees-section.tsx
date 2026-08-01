'use client';

import type { PlanFee } from '@nursery-os/contracts';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
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
import { FEE_TYPE_LABEL } from '@/lib/fees/mapper';
import { useFeeDirectory } from '@/lib/fees/queries';
import { formatMoney } from '@/lib/money';
import { useAttachPlanFee, useDetachPlanFee } from '@/lib/plan-fees/mutations';
import { usePlanFees } from '@/lib/plan-fees/queries';

/**
 * Attach is an inline disclosure within this card, not a Sheet - two fields
 * (pick an existing Fee, toggle mandatory) is closer to "select an item and
 * confirm" than a form that needs a dedicated panel; a Sheet here would be
 * reflexively copying Sprint 2's Set-Price pattern without it being
 * justified by the action's own complexity. Mirrors PlanForm's "More
 * options" disclosure mechanism (design-system.md §10.3), not the Sheet
 * component.
 */
export function PlanFeesSection({ planId }: { planId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = usePlanFees(planId);
  const {
    fees: activeFees,
    isLoading: feesLoading,
    error: feesError,
    refetch: refetchFees,
  } = useFeeDirectory();
  const { mutate: attachFee, isPending: isAttaching, error: attachError } = useAttachPlanFee();
  const { mutate: detachFee, isPending: isDetaching } = useDetachPlanFee();

  const [showAttachForm, setShowAttachForm] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [pendingDetach, setPendingDetach] = useState<PlanFee | null>(null);

  const attachedFeeIds = new Set(data.map((planFee) => planFee.feeId));
  const availableFees = activeFees.filter((fee) => !attachedFeeIds.has(fee.id));

  const resetAttachForm = () => {
    setShowAttachForm(false);
    setSelectedFeeId('');
    setIsMandatory(false);
  };

  const handleAttach = async () => {
    if (!selectedFeeId) return;
    try {
      await attachFee(planId, { feeId: selectedFeeId, isMandatory });
      resetAttachForm();
      refetch();
    } catch {
      // surfaced via attachError below
    }
  };

  const handleConfirmDetach = async () => {
    if (!pendingDetach) return;
    try {
      await detachFee(planId, pendingDetach.feeId);
      setPendingDetach(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<PlanFee>[] = [
    { header: 'Fee', cell: (planFee) => planFee.fee.name },
    { header: 'Type', cell: (planFee) => FEE_TYPE_LABEL[planFee.fee.type] },
    { header: 'Amount', cell: (planFee) => formatMoney(planFee.fee.amount) },
    {
      header: 'Mandatory',
      cell: (planFee) => (
        <Badge variant={planFee.isMandatory ? 'info' : 'muted'}>
          {planFee.isMandatory ? 'Mandatory' : 'Optional'}
        </Badge>
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (planFee: PlanFee) => (
              <Button variant="ghost" size="sm" onClick={() => setPendingDetach(planFee)}>
                Detach
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fees</CardTitle>
        {canManage && !showAttachForm && (
          <Button size="sm" onClick={() => setShowAttachForm(true)}>
            Attach a fee
          </Button>
        )}
      </CardHeader>

      {canManage && showAttachForm && (
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
            <Label>Mandatory for this plan?</Label>
            <Select
              value={isMandatory ? 'mandatory' : 'optional'}
              onValueChange={(value) => setIsMandatory(value === 'mandatory')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optional">Optional</SelectItem>
                <SelectItem value="mandatory">Mandatory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {attachError != null && (
            <p className="text-sm text-destructive">
              {isApiError(attachError) ? attachError.message : 'Something went wrong.'}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" disabled={!selectedFeeId || isAttaching} onClick={handleAttach}>
              {isAttaching ? 'Attaching…' : 'Attach'}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetAttachForm}>
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
          rowKey={(planFee) => planFee.id}
          isLoading={isLoading}
          emptyMessage="No fees attached yet."
        />
      )}

      <ConfirmDialog
        open={pendingDetach !== null}
        onOpenChange={(open) => !open && setPendingDetach(null)}
        title="Detach fee"
        description={`Are you sure you want to detach ${pendingDetach?.fee.name} from this plan? It can no longer be selected for new use on this plan, but nothing already relying on it is affected.`}
        confirmLabel="Detach"
        isPending={isDetaching}
        onConfirm={handleConfirmDetach}
      />
    </Card>
  );
}
