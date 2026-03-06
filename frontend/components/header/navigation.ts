export type NavItem = {
  href: string;
  label: string;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contracts", label: "Contracts" },
  { href: "/incidents", label: "Incidents" },
  { href: "/assets", label: "Assets" },
  { href: "/maintenance", label: "Maintenance" },
];

export const HR_NAV_ITEMS: NavItem[] = [
  { href: "/employees", label: "Employees" },
  { href: "/departments", label: "Departments" },
  { href: "/shifts", label: "Shifts" },
  { href: "/time-off", label: "Time-Off" },
];

export function isActivePath(pathname: string, path: string): boolean {
  return pathname.startsWith(path);
}

export function isHrActivePath(pathname: string): boolean {
  return HR_NAV_ITEMS.some((item) => isActivePath(pathname, item.href));
}
