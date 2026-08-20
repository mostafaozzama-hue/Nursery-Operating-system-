'use client';

import { PhotoUploadField } from '@/components/children/photo-upload-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChildFormValues } from '@/lib/admissions/schema';

/**
 * Easy Enrollment wizard, Step 1 (Product Gap H). Same fields/labels as the
 * standalone ChildForm - reuses childFormSchema/ChildFormValues so validation
 * behaves identically, just rendered inline instead of navigating away.
 *
 * Photo upload is deferred here (photoFile held by the wizard's own state,
 * uploaded via a follow-up call only after "Enroll Child" successfully
 * creates the child) - there's no child id to upload against yet mid-wizard,
 * unlike the standalone ChildForm editing an existing child.
 */
export function ChildStep({
  values,
  onChange,
  fieldErrors,
  onPhotoFileSelected,
}: {
  values: ChildFormValues;
  onChange: (partial: Partial<ChildFormValues>) => void;
  fieldErrors: Partial<Record<keyof ChildFormValues, string>>;
  onPhotoFileSelected: (file: File) => void;
}) {
  const setField =
    (field: keyof ChildFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: event.target.value });
    };

  return (
    <div className="flex flex-col gap-4">
      <PhotoUploadField previewUrl={null} onFileSelected={onPhotoFileSelected} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={values.firstName} onChange={setField('firstName')} />
          {fieldErrors.firstName && (
            <p className="text-sm text-destructive">{fieldErrors.firstName}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={values.lastName} onChange={setField('lastName')} />
          {fieldErrors.lastName && <p className="text-sm text-destructive">{fieldErrors.lastName}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nickname">Nickname (optional)</Label>
        <Input id="nickname" autoComplete="off" value={values.nickname} onChange={setField('nickname')} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={values.dateOfBirth}
            onChange={setField('dateOfBirth')}
          />
          {fieldErrors.dateOfBirth && (
            <p className="text-sm text-destructive">{fieldErrors.dateOfBirth}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gender">Gender (optional)</Label>
          <Input id="gender" autoComplete="off" value={values.gender} onChange={setField('gender')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationality">Nationality (optional)</Label>
          <Input
            id="nationality"
            autoComplete="off"
            value={values.nationality}
            onChange={setField('nationality')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="motherLanguage">Mother language (optional)</Label>
          <Input
            id="motherLanguage"
            autoComplete="off"
            value={values.motherLanguage}
            onChange={setField('motherLanguage')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" autoComplete="off" value={values.address} onChange={setField('address')} />
      </div>
    </div>
  );
}
