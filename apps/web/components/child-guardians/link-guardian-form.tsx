'use client';

import { RELATIONSHIP_TYPES, type Guardian } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GuardianPicker } from '@/components/child-guardians/guardian-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { relationshipTypeLabel } from '@/lib/child-guardians/mapper';
import { useLinkGuardian, useUpdateChildGuardianLink } from '@/lib/child-guardians/mutations';
import { useChildGuardian, useChildGuardians } from '@/lib/child-guardians/queries';
import {
  emptyLinkFormValues,
  linkFormSchema,
  toCreateChildGuardianRequest,
  toUpdateChildGuardianRequest,
  type LinkFormValues,
} from '@/lib/child-guardians/schema';
import { fullName } from '@/lib/guardians/mapper';
import { useGuardian } from '@/lib/guardians/queries';
import { cn } from '@/lib/utils';

type LinkGuardianFormProps = { childId: string } & (
  { mode: 'create' } | { mode: 'edit'; linkId: string }
);

export function LinkGuardianForm(props: LinkGuardianFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const { childId } = props;

  const existingLinks = useChildGuardians(childId);
  const existingLink = useChildGuardian(isEdit ? props.linkId : null);
  const existingGuardian = useGuardian(
    isEdit && existingLink.data ? existingLink.data.guardianId : null,
  );

  const { mutate: linkGuardian, isPending: isCreating, error: createError } = useLinkGuardian();
  const {
    mutate: updateLink,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateChildGuardianLink();

  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [values, setValues] = useState<LinkFormValues>(emptyLinkFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LinkFormValues, string>>>({});

  useEffect(() => {
    if (isEdit && existingLink.data) {
      setValues({
        relationshipType: existingLink.data.relationshipType,
        isPrimaryContact: existingLink.data.isPrimaryContact,
        isEmergencyContact: existingLink.data.isEmergencyContact,
        canPickup: existingLink.data.canPickup,
      });
    }
  }, [isEdit, existingLink.data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = linkFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof LinkFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof LinkFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      if (isEdit) {
        await updateLink(props.linkId, toUpdateChildGuardianRequest(result.data));
      } else if (selectedGuardian) {
        await linkGuardian(toCreateChildGuardianRequest(childId, selectedGuardian.id, result.data));
      }
      router.push(`/dashboard/children/${childId}`);
    } catch {
      // surfaced via createError/updateError below
    }
  };

  if (isEdit && (existingLink.isLoading || existingGuardian.isLoading)) {
    return <p>Loading…</p>;
  }

  if (isEdit && (existingLink.error || existingGuardian.error)) {
    const error = existingLink.error ?? existingGuardian.error;
    return (
      <p className="text-destructive">
        {isApiError(error) ? error.message : 'Something went wrong.'}
      </p>
    );
  }

  if (!isEdit && !selectedGuardian) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Link a guardian</h1>
        <GuardianPicker
          excludeIds={existingLinks.data.map((link) => link.guardianId)}
          onSelect={setSelectedGuardian}
        />
      </div>
    );
  }

  const guardianName = isEdit
    ? existingGuardian.data
      ? fullName(existingGuardian.data)
      : ''
    : selectedGuardian
      ? fullName(selectedGuardian)
      : '';
  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Guardian</p>
        <p className="font-medium">{guardianName}</p>
        {!isEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedGuardian(null)}>
            Change guardian
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="relationshipType">Relationship</Label>
        <select
          id="relationshipType"
          value={values.relationshipType}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              relationshipType: event.target.value as LinkFormValues['relationshipType'],
            }))
          }
          className={cn(
            'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
          )}
        >
          <option value="">Select a relationship…</option>
          {RELATIONSHIP_TYPES.map((type) => (
            <option key={type} value={type}>
              {relationshipTypeLabel(type)}
            </option>
          ))}
        </select>
        {fieldErrors.relationshipType && (
          <p className="text-sm text-destructive">{fieldErrors.relationshipType}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isPrimaryContact}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, isPrimaryContact: event.target.checked }))
          }
        />
        Primary contact
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isEmergencyContact}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, isEmergencyContact: event.target.checked }))
          }
        />
        Emergency contact
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.canPickup}
          onChange={(event) => setValues((prev) => ({ ...prev, canPickup: event.target.checked }))}
        />
        Can pick up
      </label>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Link guardian'}
      </Button>
    </form>
  );
}
