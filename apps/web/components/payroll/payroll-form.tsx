'use client';

import type { Staff } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StaffPicker } from '@/components/payroll/staff-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useCreatePayroll, useUpdatePayroll } from '@/lib/payroll/mutations';
import { usePayrollRecord } from '@/lib/payroll/queries';
import {
  emptyPayrollFormValues,
  payrollFormSchema,
  toCreatePayrollRequest,
  toUpdatePayrollRequest,
  type PayrollFormValues,
} from '@/lib/payroll/schema';
import { staffFullName } from '@/lib/staff/mapper';
import { useStaffMember } from '@/lib/staff/queries';

const SELECT_CLASSNAME = cn(
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
);

type PayrollFormProps = { mode: 'create' } | { mode: 'edit'; payrollId: string };

/** staffId is fixed at creation - not reassignable via edit, so the picker only ever appears in create mode. */
export function PayrollForm(props: PayrollFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isEdit = props.mode === 'edit';
  const existing = usePayrollRecord(canManage && isEdit ? props.payrollId : null);
  const { mutate: createPayroll, isPending: isCreating, error: createError } = useCreatePayroll();
  const { mutate: updatePayroll, isPending: isUpdating, error: updateError } = useUpdatePayroll();

  const [values, setValues] = useState<PayrollFormValues>(emptyPayrollFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PayrollFormValues, string>>>(
    {},
  );

  const [staffId, setStaffId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const existingStaff = useStaffMember(!isEdit || staffId === null ? null : staffId);

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        payType: existing.data.payType,
        payRate: existing.data.payRate,
        payFrequency: existing.data.payFrequency,
        currency: existing.data.currency,
        effectiveDate: existing.data.effectiveDate,
      });
      setStaffId(existing.data.staffId);
    }
  }, [isEdit, existing.data]);

  if (!canManage) {
    return <p className="text-muted-foreground">You don&apos;t have access to payroll records.</p>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEdit && !staffId) {
      return;
    }
    const result = payrollFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof PayrollFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof PayrollFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const record =
        props.mode === 'edit'
          ? await updatePayroll(props.payrollId, toUpdatePayrollRequest(result.data))
          : await createPayroll(toCreatePayrollRequest(result.data, staffId!));
      router.push(`/dashboard/payroll/${record.id}`);
    } catch {
      // surfaced via createError/updateError below
    }
  };

  if (isEdit && existing.isLoading) {
    return <p>Loading…</p>;
  }

  if (isEdit && existing.error) {
    return (
      <p className="text-destructive">
        {isApiError(existing.error) ? existing.error.message : 'Something went wrong.'}
      </p>
    );
  }

  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;
  const staffName = isEdit
    ? existingStaff.data
      ? staffFullName(existingStaff.data)
      : 'Loading…'
    : selectedStaff
      ? staffFullName(selectedStaff)
      : null;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Staff</Label>
        {isEdit ? (
          <p className="text-sm">{staffName}</p>
        ) : showStaffPicker ? (
          <div className="flex flex-col gap-2">
            <StaffPicker
              onSelect={(staff) => {
                setSelectedStaff(staff);
                setStaffId(staff.id);
                setShowStaffPicker(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowStaffPicker(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm">{staffName ?? 'Not selected'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowStaffPicker(true)}
            >
              {staffId ? 'Change' : 'Select'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payType">Pay type</Label>
        <select
          id="payType"
          value={values.payType}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              payType: event.target.value as PayrollFormValues['payType'],
            }))
          }
          className={SELECT_CLASSNAME}
        >
          <option value="SALARY">Salary</option>
          <option value="HOURLY">Hourly</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payRate">Pay rate</Label>
        <Input
          id="payRate"
          type="number"
          step="0.01"
          value={values.payRate}
          onChange={(event) => setValues((prev) => ({ ...prev, payRate: event.target.value }))}
        />
        {fieldErrors.payRate && <p className="text-sm text-destructive">{fieldErrors.payRate}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payFrequency">Pay frequency</Label>
        <select
          id="payFrequency"
          value={values.payFrequency}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              payFrequency: event.target.value as PayrollFormValues['payFrequency'],
            }))
          }
          className={SELECT_CLASSNAME}
        >
          <option value="MONTHLY">Monthly</option>
          <option value="BIWEEKLY">Biweekly</option>
          <option value="WEEKLY">Weekly</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          value={values.currency}
          onChange={(event) => setValues((prev) => ({ ...prev, currency: event.target.value }))}
        />
        {fieldErrors.currency && <p className="text-sm text-destructive">{fieldErrors.currency}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="effectiveDate">Effective date</Label>
        <Input
          id="effectiveDate"
          type="date"
          value={values.effectiveDate}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, effectiveDate: event.target.value }))
          }
        />
        {fieldErrors.effectiveDate && (
          <p className="text-sm text-destructive">{fieldErrors.effectiveDate}</p>
        )}
      </div>

      {!isEdit && !staffId && <p className="text-sm text-destructive">Select a staff member.</p>}

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting || (!isEdit && !staffId)}>
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add payroll record'}
      </Button>
    </form>
  );
}
