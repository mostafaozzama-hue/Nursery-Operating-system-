/**
 * Shared shell for every screen under /dashboard/configuration - consistent
 * outer spacing, replacing what every existing detail/list page currently
 * hand-rolls individually. Breadcrumbs are NOT rendered here: verified by
 * reading dashboard-shell.tsx/top-nav.tsx directly, Breadcrumbs is already
 * rendered once, globally, in TopNav (part of the outer DashboardShell every
 * dashboard route already sits inside) - this layout would only duplicate
 * it. The "Configuration" segment resolves correctly there via its own
 * NAV_ITEMS entry (see lib/navigation.ts), the same mechanism every other
 * module's breadcrumb already uses - no new breadcrumb infrastructure added
 * for this sprint. The Plans List and Add Plan routes are fully static and
 * label cleanly. Edit Plan (plans/[id]/edit) is not fully clean: its [id]
 * segment has no NAV_ITEMS match, so breadcrumbs.tsx's labelFor fallback
 * renders the raw UUID there today, same as every other module's edit page
 * (Classrooms, Guardians, etc.) - this is the pre-existing, already-tracked
 * UXD-2 defect, not something this sprint introduces or fixes. Resolving it
 * for Plans specifically only makes sense once Plan Detail (Sprint 2) gives
 * the route a resolved plan name to breadcrumb with instead.
 */
export default function ConfigurationLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
