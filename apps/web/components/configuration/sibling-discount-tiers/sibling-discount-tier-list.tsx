'use client';

import type { SiblingDiscountTier } from '@nursery-os/contracts';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { formatEffectiveRange } from '@/lib/sibling-discount-tiers/mapper';
import { useSiblingDiscountTiers } from '@/lib/sibling-discount-tiers/queries';
import { ConfigurationSectionHeader } from '../configuration-section-header';
import { SetSiblingDiscountTierSheet } from './set-sibling-discount-tier-sheet';

/** Standalone-page version of PlanPricesSection - same Card+DataTable shape, plus the page's own ConfigurationSectionHeader since this isn't embedded in a Detail page. No dashboard card, reached only via the secondary link on Discounts List. */
export function SiblingDiscountTierList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useSiblingDiscountTiers();
  const [sheetOpen, setSheetOpen] = useState(false);

  const columns: DataTableColumn<SiblingDiscountTier>[] = [
    { header: 'Threshold', cell: (tier) => tier.siblingCountThreshold },
    { header: 'Discount %', cell: (tier) => `${tier.discountPercentage}%` },
    {
      header: 'Effective period',
      cell: (tier) => (
        <span className="inline-flex items-center gap-2">
          {formatEffectiveRange(tier.effectiveFrom, tier.effectiveTo)}
          {!tier.effectiveTo && <Badge variant="success">Current</Badge>}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader title="Sibling Discount Tiers" />

      <Card>
        <CardHeader>
          <CardTitle>Tier history</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              Set new tier
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
            rowKey={(tier) => tier.id}
            isLoading={isLoading}
            emptyMessage="No sibling discount tiers set yet."
          />
        )}
      </Card>

      <SetSiblingDiscountTierSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDone={() => {
          setSheetOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
