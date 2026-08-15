import { StaffForm } from '@/components/staff/staff-form';

export const metadata = { title: 'Add Staff · Nursery OS' };

export default function NewStaffPage() {
  return <StaffForm mode="create" />;
}
