'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { usePlanSummary } from '@/lib/plans/queries';
import { ConfigurationSectionHeader } from './configuration-section-header';

/**
 * Frozen spec (see docs/SESSION_CHECKPOINT.md for the full design history):
 * every card answers one operational question and ends in a single "Next
 * Step" derived honestly from real backend state - never an invented
 * health metric. Only the Plans card is live this sprint - Fees/Discounts/
 * Billing Runs render a plain "not available yet" state, not because the
 * backend lacks the data (Fees' GET /fees already exists) but because
 * THEIR OWN frontend screens aren't part of this sprint's scope yet, and a
 * card linking to a route that doesn't exist would be worse than an honest
 * stub. Waivers gets a plain text line, not a card - there's no tenant-wide
 * endpoint to summarize it, no Next Step to derive, and (unlike Fees/
 * Discounts/Billing Runs) no per-child waiver UI exists anywhere in the app
 * yet either, so the copy must not imply one does.
 */
export function ConfigurationDashboard() {
  const plans = usePlanSummary();

  return (
    <div className="flex flex-col gap-6">
      <ConfigurationSectionHeader
        title="Configuration"
        action={
          !plans.isLoading && plans.activeCount === 0
            ? { label: 'Create your first plan', href: '/dashboard/configuration/plans/new' }
            : { label: 'View plans', href: '/dashboard/configuration/plans' }
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlansCard
          isLoading={plans.isLoading}
          error={plans.error}
          activeCount={plans.activeCount}
          total={plans.total}
        />
        <StubCard title="Fees" />
        <StubCard title="Discounts" />
        <StubCard title="Billing Runs" />
      </div>

      <p className="text-sm text-muted-foreground">
        Waivers aren&apos;t available in this release yet.
      </p>
    </div>
  );
}

function PlansCard({
  isLoading,
  error,
  activeCount,
  total,
}: {
  isLoading: boolean;
  error: unknown;
  activeCount: number;
  total: number;
}) {
  const nextStep =
    activeCount === 0
      ? { label: 'Create your first plan', href: '/dashboard/configuration/plans/new' }
      : { label: 'Review plan prices', href: '/dashboard/configuration/plans' };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans</CardTitle>
      </CardHeader>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {isApiError(error) ? error.message : 'Something went wrong.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {activeCount === 0
              ? 'No active plans — nothing can be billed yet.'
              : `${activeCount} active plan${activeCount === 1 ? '' : 's'}${total > activeCount ? ` (${total} total)` : ''}.`}
          </p>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={nextStep.href}>{nextStep.label}</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Deliberately not a fake "0" or a colored status - honest placeholder until this area's own frontend ships. */
function StubCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <p className="text-sm text-muted-foreground">Not available yet.</p>
    </Card>
  );
}
