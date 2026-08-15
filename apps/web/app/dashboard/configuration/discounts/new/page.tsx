import { DiscountForm } from '@/components/configuration/discounts/discount-form';

export const metadata = { title: 'Add Discount · Nursery OS' };

export default function NewDiscountPage() {
  return <DiscountForm mode="create" />;
}
