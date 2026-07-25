'use client';

import { RELATIONSHIP_TYPES, type Child } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChildPicker } from '@/components/child-guardians/child-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { relationshipTypeLabel } from '@/lib/child-guardians/mapper';
import { useLinkGuardian, useUpdateChildGuardianLink } from '@/lib/child-guardians/mutations';
import { useChildGuardian, useGuardianChildren } from '@/lib/child-guardians/queries';
import {
  emptyLinkFormValues,
  linkFormSchema,
  toCreateChildGuardianRequest,
  toUpdateChildGuardianRequest,
  type LinkFormValues,
} from '@/lib/child-guardians/schema';
import { fullName } from '@/lib/children/mapper';
import { useChild } from '@/lib/children/queries';
import { cn } from '@/lib/utils';

type LinkChildFormProps = { guardianId: string } & (
  { mode: 'create' } | { mode: 'edit'; linkId: string }
);

export function LinkChildForm(props: LinkChildFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const { guardianId } = props;

  const existingLinks = useGuardianChildren(guardianId);
  const existingLink = useChildGuardian(isEdit ? props.linkId : null);
  const existingChild = useChild(isEdit && existingLink.data ? existingLink.data.childId : null);

  const { mutate: linkGuardian, isPending: isCreating, error: createError } = useLinkGuardian();
  const {
    mutate: updateLink,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateChildGuardianLink();

  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
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
      } else if (selectedChild) {
        await linkGuardian(toCreateChildGuardianRequest(selectedChild.id, guardianId, result.data));
      }
      router.push(`/dashboard/guardians/${guardianId}`);
    } catch {
      // surfaced via createError/updateError below
    }
  };

  if (isEdit && (existingLink.isLoading || existingChild.isLoading)) {
    return <p>Loading…</p>;
  }

  if (isEdit && (existingLink.error || existingChild.error)) {
    const error = existingLink.error ?? existingChild.error;
    return (
      <p className="text-destructive">
        {isApiError(error) ? error.message : 'Something went wrong.'}
      </p>
    );
  }

  if (!isEdit && !selectedChild) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Link a child</h1>
        <ChildPicker
          excludeIds={existingLinks.data.map((link) => link.childId)}
          onSelect={setSelectedChild}
        />
      </div>
    );
  }

  const childName = isEdit
    ? existingChild.data
      ? fullName(existingChild.data)
      : ''
    : selectedChild
      ? fullName(selectedChild)
      : '';
  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Child</p>
        <p className="font-medium">{childName}</p>
        {!isEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedChild(null)}>
            Change child
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
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Link child'}
      </Button>
    </form>
  );
}
