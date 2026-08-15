import type { PayFrequency, PayType } from '@nursery-os/contracts';

const PAY_TYPE_LABELS: Record<PayType, string> = {
  HOURLY: 'Hourly',
  SALARY: 'Salary',
};

const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
};

export function formatPayType(payType: PayType): string {
  return PAY_TYPE_LABELS[payType];
}

export function formatPayFrequency(payFrequency: PayFrequency): string {
  return PAY_FREQUENCY_LABELS[payFrequency];
}

export function formatPayRate(payRate: string, currency: string, payType: PayType): string {
  const amount = Number(payRate).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${amount}${payType === 'HOURLY' ? '/hr' : '/yr'}`;
}

export function formatEffectiveDate(effectiveDate: string): string {
  return new Date(effectiveDate).toLocaleDateString();
}
