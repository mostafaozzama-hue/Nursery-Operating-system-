'use client';

import { WAIVER_REASON_CODES, WAIVER_TYPES } from '@nursery-os/contracts';
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
import type { EnrollmentStepValues } from '@/lib/admissions/schema';
import { useDiscountDirectory } from '@/lib/discounts/queries';
import { useFeeDirectory } from '@/lib/fees/queries';
import { formatMoney } from '@/lib/money';
import { WAIVER_REASON_CODE_LABEL, WAIVER_TYPE_LABEL } from '@/lib/waivers/mapper';

/**
 * Easy Enrollment wizard, Step 3's Fees/Discount/Waiver fields (Product Gap
 * H phase 2). Reuses ChildFeeAssignment/ChildDiscountAssignment/Waiver as-is
 * via AdmissionRepository's atomic transaction - no new billing concepts.
 * Discount and Waiver are each a single optional slot, not a picker-and-add
 * list, matching AdmissionDiscountInput/AdmissionWaiverInput's contract
 * (keeps the wizard simple; more can be added later from the Child Detail
 * page's existing sections). The exclusive-discount and duplicate-waiver
 * guards (bug fixes) apply exactly as they do everywhere else - a rejected
 * request surfaces the backend's real error, same as every other step here.
 */
export function FeesDiscountWaiverFields({
  values,
  onChange,
  discountError,
  waiverError,
}: {
  values: EnrollmentStepValues;
  onChange: (partial: Partial<EnrollmentStepValues>) => void;
  discountError: string | null;
  waiverError: string | null;
}) {
  const { fees, isLoading: feesLoading, error: feesError, refetch: refetchFees } = useFeeDirectory();
  const {
    discounts,
    isLoading: discountsLoading,
    error: discountsError,
    refetch: refetchDiscounts,
  } = useDiscountDirectory();

  const activeFees = fees.filter((fee) => fee.isActive);
  const activeDiscounts = discounts.filter((discount) => discount.isActive);

  const toggleFee = (feeId: string, checked: boolean) => {
    onChange({
      feeIds: checked ? [...values.feeIds, feeId] : values.feeIds.filter((id) => id !== feeId),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Fees (optional)</Label>
        {feesError ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-destructive">
              {isApiError(feesError) ? feesError.message : 'Could not load fees.'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={refetchFees}>
              Retry
            </Button>
          </div>
        ) : feesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : activeFees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fees configured.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activeFees.map((fee) => (
              <label key={fee.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.feeIds.includes(fee.id)}
                  onChange={(event) => toggleFee(fee.id, event.target.checked)}
                />
                {fee.name} ({formatMoney(fee.amount)})
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.discount.included}
            onChange={(event) =>
              onChange({ discount: { ...values.discount, included: event.target.checked } })
            }
          />
          Discount (optional)
        </label>
        {values.discount.included && (
          <>
            {discountsError ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">
                  {isApiError(discountsError) ? discountsError.message : 'Could not load discounts.'}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={refetchDiscounts}>
                  Retry
                </Button>
              </div>
            ) : (
              <Select
                value={values.discount.discountId || undefined}
                onValueChange={(value) => onChange({ discount: { ...values.discount, discountId: value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={discountsLoading ? 'Loading…' : 'Select a discount'} />
                </SelectTrigger>
                <SelectContent>
                  {activeDiscounts.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      {discount.name} ({discount.stackable ? 'stackable' : 'exclusive'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountEffectiveTo">Effective to (optional)</Label>
              <Input
                id="discountEffectiveTo"
                type="date"
                value={values.discount.effectiveTo}
                onChange={(event) =>
                  onChange({ discount: { ...values.discount, effectiveTo: event.target.value } })
                }
              />
            </div>
            {discountError && <p className="text-sm text-destructive">{discountError}</p>}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.waiver.included}
            onChange={(event) => onChange({ waiver: { ...values.waiver, included: event.target.checked } })}
          />
          Waiver (optional)
        </label>
        {values.waiver.included && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={values.waiver.type || undefined}
                onValueChange={(value) =>
                  onChange({ waiver: { ...values.waiver, type: value as (typeof WAIVER_TYPES)[number] } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a waiver type" />
                </SelectTrigger>
                <SelectContent>
                  {WAIVER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {WAIVER_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="waiverPercentage">Percentage</Label>
              <Input
                id="waiverPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.waiver.percentage}
                onChange={(event) =>
                  onChange({ waiver: { ...values.waiver, percentage: event.target.value } })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Reason</Label>
              <Select
                value={values.waiver.reasonCode || undefined}
                onValueChange={(value) =>
                  onChange({
                    waiver: { ...values.waiver, reasonCode: value as (typeof WAIVER_REASON_CODES)[number] },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {WAIVER_REASON_CODES.map((reasonCode) => (
                    <SelectItem key={reasonCode} value={reasonCode}>
                      {WAIVER_REASON_CODE_LABEL[reasonCode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="waiverReasonNote">
                Reason note{values.waiver.reasonCode === 'OTHER' ? '' : ' (optional)'}
              </Label>
              <Input
                id="waiverReasonNote"
                value={values.waiver.reasonNote}
                onChange={(event) =>
                  onChange({ waiver: { ...values.waiver, reasonNote: event.target.value } })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="waiverEffectiveTo">
                Effective to{values.waiver.reviewAnnually ? ' (optional)' : ''}
              </Label>
              <Input
                id="waiverEffectiveTo"
                type="date"
                value={values.waiver.effectiveTo}
                onChange={(event) =>
                  onChange({ waiver: { ...values.waiver, effectiveTo: event.target.value } })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.waiver.reviewAnnually}
                onChange={(event) =>
                  onChange({ waiver: { ...values.waiver, reviewAnnually: event.target.checked } })
                }
              />
              Review annually
            </label>
            {waiverError && <p className="text-sm text-destructive">{waiverError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
