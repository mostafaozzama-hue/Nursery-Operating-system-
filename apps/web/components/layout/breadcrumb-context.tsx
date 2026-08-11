'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface BreadcrumbContextValue {
  labels: Record<string, string>;
  setLabel: (segment: string, label: string | undefined) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

/**
 * Lets a detail/edit page resolve its own dynamic route segment (a raw
 * entity ID) into a human-readable breadcrumb label, using data it already
 * fetches for its own page content - no new network request (ux-debt.md
 * UXD-2). Keyed by the literal segment value (the ID itself), not the full
 * href, so any page anywhere in the tree can register a label for "this ID"
 * without knowing its own path. Scoped to the Dashboard shell - see
 * dashboard-shell.tsx.
 */
export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((segment: string, label: string | undefined) => {
    setLabels((prev) => {
      if (label === undefined) {
        if (!(segment in prev)) return prev;
        const next = { ...prev };
        delete next[segment];
        return next;
      }
      if (prev[segment] === label) return prev;
      return { ...prev, [segment]: label };
    });
  }, []);

  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/** Consumed by Breadcrumbs only - the current segment -> resolved label map. */
export function useBreadcrumbLabels(): Record<string, string> {
  const ctx = useContext(BreadcrumbContext);
  return ctx?.labels ?? {};
}

/**
 * Call from a detail/edit page once its entity has loaded, passing the raw
 * route param (e.g. childId) and the resolved display name. Pass
 * `undefined` for label while loading or in create mode - never register
 * the ID as its own label. Safe to call unconditionally on every render
 * (required by the Rules of Hooks): pass `undefined` for either argument
 * and it no-ops. Unregisters on unmount so a stale name never lingers after
 * navigating away.
 */
export function useBreadcrumbLabel(segment: string | undefined, label: string | undefined): void {
  const ctx = useContext(BreadcrumbContext);
  const setLabel = ctx?.setLabel;

  useEffect(() => {
    if (!setLabel || !segment) {
      return;
    }
    setLabel(segment, label);
    return () => setLabel(segment, undefined);
  }, [setLabel, segment, label]);
}
