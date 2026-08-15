import { HolidayForm } from '@/components/configuration/holidays/holiday-form';

export const metadata = { title: 'Edit Holiday · Nursery OS' };

export default async function EditHolidayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HolidayForm mode="edit" holidayId={id} />;
}
