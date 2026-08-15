/**
 * No entity in this app carries its own currency field (unlike
 * StaffPayroll.currency) - enterprise-roadmap.md §4 already flags this and
 * recommends a tenant-level default currency setting once it exists. Until
 * then, amounts are assumed to be in the tenant's default currency (EGP,
 * the product's primary market) rather than shown unlabeled. Revisit this
 * constant (or replace it with a real tenant setting) when multi-currency
 * support is built - tracked as Enterprise-phase work, not deferred silently.
 */
const TENANT_DEFAULT_CURRENCY = 'EGP';

/** currencyDisplay: 'code' is deliberate - EGP has no universally unambiguous symbol in ICU data across environments (risk of rendering as a pound-sign easily confused with GBP), so the currency code is always spelled out. */
export function formatMoney(amount: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: TENANT_DEFAULT_CURRENCY,
    currencyDisplay: 'code',
  }).format(Number(amount));
}
