export function staffFullName(staff: { firstName: string; lastName: string }): string {
  return `${staff.firstName} ${staff.lastName}`;
}

export function formatHireDate(hireDate: string): string {
  return new Date(hireDate).toLocaleDateString();
}
