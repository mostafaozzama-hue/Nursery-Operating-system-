import { Suspense } from 'react';
import { DiscountList } from '@/components/configuration/discounts/discount-list';

export const metadata = { title: 'Discounts · Nursery OS' };

export default function DiscountsPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <DiscountList />
    </Suspense>
  );
}
