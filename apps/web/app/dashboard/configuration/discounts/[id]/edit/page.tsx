import { DiscountForm } from '@/components/configuration/discounts/discount-form';

export const metadata = { title: 'Edit Discount · Nursery OS' };

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiscountForm mode="edit" discountId={id} />;
}
