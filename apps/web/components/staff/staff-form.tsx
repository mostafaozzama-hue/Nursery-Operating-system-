'use client';

import type { Classroom, Membership } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClassroomPicker } from '@/components/classrooms/classroom-picker';
import { MembershipPicker } from '@/components/staff/membership-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { useMembershipDirectory } from '@/lib/memberships/queries';
import { useCreateStaff, useUpdateStaff } from '@/lib/staff/mutations';
import { useStaffMember } from '@/lib/staff/queries';
import {
  emptyStaffFormValues,
  staffFormSchema,
  toCreateStaffRequest,
  type StaffFormValues,
} from '@/lib/staff/schema';

type StaffFormProps = { mode: 'create' } | { mode: 'edit'; staffId: string };

/**
 * Two independent optional relations (classroom, user) rendered as inline
 * picker slots, not a sequential stage flow like EnrollForm - neither blocks
 * the other and both can be set, changed, or left unset in any order.
 */
export function StaffForm(props: StaffFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const existing = useStaffMember(isEdit ? props.staffId : null);
  const { mutate: createStaff, isPending: isCreating, error: createError } = useCreateStaff();
  const { mutate: updateStaff, isPending: isUpdating, error: updateError } = useUpdateStaff();

  const classroomDirectory = useClassroomDirectory();
  const membershipDirectory = useMembershipDirectory(true);

  const [values, setValues] = useState<StaffFormValues>(emptyStaffFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StaffFormValues, string>>>(
    {},
  );

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [showClassroomPicker, setShowClassroomPicker] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [showMembershipPicker, setShowMembershipPicker] = useState(false);

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        firstName: existing.data.firstName,
        lastName: existing.data.lastName,
        position: existing.data.position ?? '',
        hireDate: existing.data.hireDate ?? '',
      });
      setClassroomId(existing.data.classroomId);
      setUserId(existing.data.userId);
    }
  }, [isEdit, existing.data]);

  const setField =
    (field: keyof StaffFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = staffFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof StaffFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof StaffFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const record =
        props.mode === 'edit'
          ? await updateStaff(props.staffId, toCreateStaffRequest(result.data, classroomId, userId))
          : await createStaff(toCreateStaffRequest(result.data, classroomId, userId));
      router.push(`/dashboard/staff/${record.id}`);
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

  const classroomName = classroomId
    ? (selectedClassroom?.name ??
      classroomDirectory.byId.get(classroomId)?.name ??
      'Unknown classroom')
    : null;
  const membershipEmail = userId
    ? (selectedMembership?.email ?? membershipDirectory.byId.get(userId)?.email ?? 'Unknown user')
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="position">Position</Label>
        <Input id="position" value={values.position} onChange={setField('position')} />
        {fieldErrors.position && <p className="text-sm text-destructive">{fieldErrors.position}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hireDate">Hire date</Label>
        <Input id="hireDate" type="date" value={values.hireDate} onChange={setField('hireDate')} />
        {fieldErrors.hireDate && <p className="text-sm text-destructive">{fieldErrors.hireDate}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Classroom</Label>
        {showClassroomPicker ? (
          <div className="flex flex-col gap-2">
            <ClassroomPicker
              directory={classroomDirectory}
              onSelect={(classroom) => {
                setSelectedClassroom(classroom);
                setClassroomId(classroom.id);
                setShowClassroomPicker(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowClassroomPicker(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm">{classroomName ?? 'Unassigned'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowClassroomPicker(true)}
            >
              {classroomId ? 'Change' : 'Assign'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Linked user</Label>
        {showMembershipPicker ? (
          <div className="flex flex-col gap-2">
            <MembershipPicker
              directory={membershipDirectory}
              onSelect={(membership) => {
                setSelectedMembership(membership);
                setUserId(membership.userId);
                setShowMembershipPicker(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowMembershipPicker(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm">{membershipEmail ?? 'Not linked'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMembershipPicker(true)}
            >
              {userId ? 'Change' : 'Link'}
            </Button>
          </div>
        )}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff'}
      </Button>
    </form>
  );
}
