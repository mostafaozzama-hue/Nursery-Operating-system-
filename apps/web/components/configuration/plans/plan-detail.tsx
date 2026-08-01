'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/common/badge';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useActivatePlan, useDeactivatePlan } from '@/lib/plans/mutations';
import {
  PLAN_BILLING_CYCLE_LABEL,
  formatScheduleDays,
  formatScheduleWindow,
} from '@/lib/plans/mapper';
import { usePlan } from '@/lib/plans/queries';
import { PlanFeesSection } from './plan-fees-section';
import { PlanPricesSection } from './plan-prices-section';

export function PlanDetail({ planId }: { planId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = usePlan(planId);
  const { mutate: activatePlan, isPending: isActivating } = useActivatePlan();
  const { mutate: deactivatePlan, isPending: isDeactivating } = useDeactivatePlan();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleActivate = async () => {
    try {
      await activatePlan(planId);
      refetch();
    } catch {
      // mutation hook already captured the error; button re-enables for the user to retry
    }
  };

  const handleConfirmDeactivate = async () => {
    try {
      await deactivatePlan(planId);
      setConfirmOpen(false);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  if (isLoading) {
    return <p>Loading…</p>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive">
          {isApiError(error) ? error.message : 'Something went wrong.'}
        </p>
        <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{data.name}</PageTitle>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Billing cycle</dt>
        <dd>{PLAN_BILLING_CYCLE_LABEL[data.billingCycle]}</dd>
        <dt className="text-muted-foreground">Schedule</dt>
        <dd>{formatScheduleDays(data.scheduleDaysOfWeek)}</dd>
        <dt className="text-muted-foreground">Time</dt>
        <dd>{formatScheduleWindow(data.scheduleStartTime, data.scheduleEndTime)}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <Badge variant={data.isActive ? 'success' : 'muted'}>
            {data.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </dd>
      </dl>

      {canManage && (
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/configuration/plans/${planId}/edit`}>Edit</Link>
          </Button>
          {data.isActive ? (
            <Button
              variant="destructive"
              disabled={isDeactivating}
              onClick={() => setConfirmOpen(true)}
            >
              Deactivate
            </Button>
          ) : (
            <Button variant="outline" disabled={isActivating} onClick={handleActivate}>
              Activate
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Deactivate plan"
        description={`Are you sure you want to deactivate ${data.name}? It can no longer be selected for new use, but existing enrollments and price history are unaffected.`}
        confirmLabel="Deactivate"
        isPending={isDeactivating}
        onConfirm={handleConfirmDeactivate}
      />

      <PlanPricesSection planId={planId} />
      <PlanFeesSection planId={planId} />
    </div>
  );
}
