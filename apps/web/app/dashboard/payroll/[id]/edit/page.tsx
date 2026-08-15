import { PayrollForm } from '@/components/payroll/payroll-form';

export const metadata = { title: 'Edit Payroll Record · Nursery OS' };

export default async function EditPayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayrollForm mode="edit" payrollId={id} />;
}
