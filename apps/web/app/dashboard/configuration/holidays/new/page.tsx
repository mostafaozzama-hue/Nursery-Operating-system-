import { HolidayForm } from '@/components/configuration/holidays/holiday-form';

export const metadata = { title: 'Add Holiday · Nursery OS' };

export default function NewHolidayPage() {
  return <HolidayForm mode="create" />;
}
