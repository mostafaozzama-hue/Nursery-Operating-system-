import { PayrollForm } from '@/components/payroll/payroll-form';

export const metadata = { title: 'Add Payroll Record · Nursery OS' };

export default function NewPayrollPage() {
  return <PayrollForm mode="create" />;
}
