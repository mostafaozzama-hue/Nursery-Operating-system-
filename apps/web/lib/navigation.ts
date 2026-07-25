export interface NavItem {
  href: string;
  label: string;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/children', label: 'Children' },
  { href: '/dashboard/guardians', label: 'Guardians' },
  { href: '/dashboard/classrooms', label: 'Classrooms' },
  { href: '/dashboard/settings', label: 'Settings' },
];
