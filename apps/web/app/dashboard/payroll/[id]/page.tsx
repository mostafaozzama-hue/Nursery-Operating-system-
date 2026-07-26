import { PayrollDetail } from '@/components/payroll/payroll-detail';

export const metadata = { title: 'Payroll · Nursery OS' };

export default async function PayrollRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayrollDetail payrollId={id} />;
}
