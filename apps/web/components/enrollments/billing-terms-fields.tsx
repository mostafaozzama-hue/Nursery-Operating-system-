'use client';

import { DEPOSIT_REFUND_POLICIES } from '@nursery-os/contracts';
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
import { useChildGuardians } from '@/lib/child-guardians/queries';
import { DEPOSIT_REFUND_POLICY_LABEL } from '@/lib/enrollment-billing-terms/mapper';
import type { OpenBillingTermsFormValues } from '@/lib/enrollment-billing-terms/schema';
import { fullName } from '@/lib/guardians/mapper';
import { useGuardianDirectory } from '@/lib/guardians/queries';
import { usePlanDirectory } from '@/lib/plans/queries';

/**
 * The fields shared by the Enroll form's billing-terms disclosure and the
 * BillingTermsSheet - everything except effectiveFrom, which only the
 * Sheet's change-existing flow needs. Guardian picker is scoped to this
 * specific child's own linked guardians (useChildGuardians), not a
 * tenant-wide search - you can only bill someone actually linked to the
 * child. Plan picker is a plain Select (usePlanDirectory, active-only),
 * per the approved "no new picker pattern" decision.
 */
export function BillingTermsFields({
  childId,
  values,
  onChange,
  fieldErrors,
}: {
  childId: string;
  values: OpenBillingTermsFormValues;
  onChange: (partial: Partial<OpenBillingTermsFormValues>) => void;
  fieldErrors: Partial<Record<keyof OpenBillingTermsFormValues, string>>;
}) {
  const {
    plans,
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans,
  } = usePlanDirectory();
  const { data: childGuardianLinks } = useChildGuardians(childId);
  const { byId: guardianById, isLoading: guardiansLoading } = useGuardianDirectory();

  const childGuardians = childGuardianLinks
    .map((link) => guardianById.get(link.guardianId))
    .filter((guardian): guardian is NonNullable<typeof guardian> => guardian != null);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>Plan</Label>
        {plansError ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-destructive">
              {isApiError(plansError) ? plansError.message : 'Could not load plans.'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={refetchPlans}>
              Retry
            </Button>
          </div>
        ) : (
          <Select
            value={values.planId || 'none'}
            onValueChange={(value) => onChange({ planId: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={plansLoading ? 'Loading…' : 'No plan'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No plan</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Billing guardian</Label>
        <Select
          value={values.billingGuardianId || undefined}
          onValueChange={(value) => onChange({ billingGuardianId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={guardiansLoading ? 'Loading…' : 'Select a guardian'} />
          </SelectTrigger>
          <SelectContent>
            {childGuardians.map((guardian) => (
              <SelectItem key={guardian.id} value={guardian.id}>
                {fullName(guardian)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.billingGuardianId && (
          <p className="text-sm text-destructive">{fieldErrors.billingGuardianId}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customRateAmount">Custom rate (optional)</Label>
        <Input
          id="customRateAmount"
          type="number"
          min="0"
          step="0.01"
          value={values.customRateAmount}
          onChange={(event) => onChange({ customRateAmount: event.target.value })}
        />
        {fieldErrors.customRateAmount && (
          <p className="text-sm text-destructive">{fieldErrors.customRateAmount}</p>
        )}
      </div>

      {values.customRateAmount && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customRateReason">Reason for custom rate</Label>
          <Input
            id="customRateReason"
            value={values.customRateReason}
            onChange={(event) => onChange({ customRateReason: event.target.value })}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="depositAmount">Deposit (optional)</Label>
        <Input
          id="depositAmount"
          type="number"
          min="0"
          step="0.01"
          value={values.depositAmount}
          onChange={(event) => onChange({ depositAmount: event.target.value })}
        />
        {fieldErrors.depositAmount && (
          <p className="text-sm text-destructive">{fieldErrors.depositAmount}</p>
        )}
      </div>

      {values.depositAmount && (
        <div className="flex flex-col gap-1.5">
          <Label>Deposit refund policy</Label>
          <Select
            value={values.depositRefundPolicy || undefined}
            onValueChange={(value) => onChange({ depositRefundPolicy: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a policy" />
            </SelectTrigger>
            <SelectContent>
              {DEPOSIT_REFUND_POLICIES.map((policy) => (
                <SelectItem key={policy} value={policy}>
                  {DEPOSIT_REFUND_POLICY_LABEL[policy]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="withdrawalNoticeGivenDate">Withdrawal notice given (optional)</Label>
        <Input
          id="withdrawalNoticeGivenDate"
          type="date"
          value={values.withdrawalNoticeGivenDate}
          onChange={(event) => onChange({ withdrawalNoticeGivenDate: event.target.value })}
        />
      </div>
    </>
  );
}
