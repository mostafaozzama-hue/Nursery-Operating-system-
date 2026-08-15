'use client';

import type { Waiver } from '@nursery-os/contracts';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { Badge } from '@/components/common/badge';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import {
  formatEffectiveRange,
  WAIVER_REASON_CODE_LABEL,
  WAIVER_TYPE_LABEL,
} from '@/lib/waivers/mapper';
import { useChildWaivers } from '@/lib/waivers/queries';
import { WaiverSheet } from './waiver-sheet';

/**
 * Entirely gated on canManage by the caller (ChildDetail) - unlike Fee/Discount assignments,
 * WaiverController's @Roles('OWNER', 'ADMIN') is class-level, covering the GET route too, so there
 * is no open-read variant here to build.
 */
export function WaiversSection({ childId }: { childId: string }) {
  const { data, isLoading, error, refetch } = useChildWaivers(childId);
  const [sheetTarget, setSheetTarget] = useState<Waiver | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openCreate = () => {
    setSheetTarget(null);
    setSheetOpen(true);
  };

  const openEdit = (waiver: Waiver) => {
    setSheetTarget(waiver);
    setSheetOpen(true);
  };

  const columns: DataTableColumn<Waiver>[] = [
    { header: 'Type', cell: (waiver) => WAIVER_TYPE_LABEL[waiver.type] },
    { header: 'Percentage', cell: (waiver) => `${waiver.percentage}%` },
    { header: 'Reason', cell: (waiver) => WAIVER_REASON_CODE_LABEL[waiver.reasonCode] },
    {
      header: 'Effective period',
      cell: (waiver) => (
        <span className="inline-flex items-center gap-2">
          {formatEffectiveRange(waiver.effectiveFrom, waiver.effectiveTo)}
          {waiver.reviewAnnually && <Badge variant="warning">Review annually</Badge>}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (waiver) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(waiver)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waivers</CardTitle>
        <Button size="sm" onClick={openCreate}>
          Add waiver
        </Button>
      </CardHeader>

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
          rowKey={(waiver) => waiver.id}
          isLoading={isLoading}
          emptyMessage="No waivers yet."
        />
      )}

      <WaiverSheet
        childId={childId}
        target={sheetTarget}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDone={() => {
          setSheetOpen(false);
          refetch();
        }}
      />
    </Card>
  );
}
