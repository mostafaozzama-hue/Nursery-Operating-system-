'use client';

import type { PlanPrice } from '@nursery-os/contracts';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { formatEffectiveRange } from '@/lib/plan-prices/mapper';
import { usePlanPrices } from '@/lib/plan-prices/queries';
import { formatMoney } from '@/lib/money';
import { SetPlanPriceSheet } from './set-plan-price-sheet';

export function PlanPricesSection({ planId }: { planId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = usePlanPrices(planId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const columns: DataTableColumn<PlanPrice>[] = [
    { header: 'Amount', cell: (price) => formatMoney(price.amount) },
    {
      header: 'Effective period',
      cell: (price) => (
        <span className="inline-flex items-center gap-2">
          {formatEffectiveRange(price.effectiveFrom, price.effectiveTo)}
          {!price.effectiveTo && <Badge variant="success">Current</Badge>}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Prices</CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            Set new price
          </Button>
        )}
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
          rowKey={(price) => price.id}
          isLoading={isLoading}
          emptyMessage="No price set yet."
        />
      )}

      <SetPlanPriceSheet
        planId={planId}
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
