import { Suspense } from 'react';
import { HolidayList } from '@/components/configuration/holidays/holiday-list';

export const metadata = { title: 'Holidays · Nursery OS' };

export default function HolidaysPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <HolidayList />
    </Suspense>
  );
}
