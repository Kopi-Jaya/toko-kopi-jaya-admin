"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { useAuth, type StaffRole } from "./auth";

export interface OutletSummary {
  outlet_id: number;
  name: string;
}

export interface Scope {
  role: StaffRole | null;
  /// `null` means "all outlets" — only meaningful for super_admin.
  /// For outlet-scoped roles, this always matches the user's outlet_id.
  currentOutletId: number | null;
  isSuperAdmin: boolean;
  /// True when the user can switch outlets via the header picker.
  canSwitchOutlet: boolean;
  /// Outlets visible in the picker. Empty until loaded.
  availableOutlets: OutletSummary[];
  outletsLoading: boolean;
  setCurrentOutletId: (id: number | null) => void;
}

const ScopeContext = createContext<Scope | null>(null);

const STORAGE_KEY = "admin.currentOutletId";

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOutletId, setCurrentOutletIdState] = useState<number | null>(
    null,
  );
  const [availableOutlets, setAvailableOutlets] = useState<OutletSummary[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  const canSwitchOutlet = isSuperAdmin;

  // Initialize the scope from the user's identity. Defer state writes off
  // the effect commit phase so React 19's set-state-in-effect lint stays
  // happy (same pattern auth.tsx uses for the same reason).
  useEffect(() => {
    queueMicrotask(() => {
      if (!user) {
        setCurrentOutletIdState(null);
        return;
      }
      if (isSuperAdmin) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "" || stored === "all") {
          setCurrentOutletIdState(null);
          return;
        }
        const parsed = stored ? Number.parseInt(stored, 10) : NaN;
        setCurrentOutletIdState(Number.isFinite(parsed) ? parsed : null);
      } else {
        setCurrentOutletIdState(user.outlet_id ?? null);
      }
    });
  }, [user, isSuperAdmin]);

  // Super-admin needs the outlet list to populate the picker. Outlet-scoped
  // users don't — they can't switch. State writes are deferred via
  // queueMicrotask for the same reason as above.
  useEffect(() => {
    if (!isSuperAdmin) {
      queueMicrotask(() => setAvailableOutlets([]));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setOutletsLoading(true);
    });
    api
      .get<{ data: { outlet_id: number; name: string }[] }>("/outlets?limit=100")
      .then(({ data }) => {
        if (cancelled) return;
        // Backend wraps the list in `{ data: [...] }`; the api helper
        // strips one layer but the meta-paginated endpoints have an
        // inner `data` key. Be defensive about both shapes.
        const raw = (data as unknown as { data?: OutletSummary[] }).data ?? data;
        const list = Array.isArray(raw) ? raw : [];
        setAvailableOutlets(
          list.map((o) => ({ outlet_id: Number(o.outlet_id), name: o.name })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableOutlets([]);
      })
      .finally(() => {
        if (cancelled) return;
        setOutletsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const setCurrentOutletId = useCallback(
    (id: number | null) => {
      if (!canSwitchOutlet) return;
      setCurrentOutletIdState(id);
      localStorage.setItem(STORAGE_KEY, id === null ? "all" : String(id));
    },
    [canSwitchOutlet],
  );

  const value = useMemo<Scope>(
    () => ({
      role: user?.role ?? null,
      currentOutletId,
      isSuperAdmin,
      canSwitchOutlet,
      availableOutlets,
      outletsLoading,
      setCurrentOutletId,
    }),
    [
      user?.role,
      currentOutletId,
      isSuperAdmin,
      canSwitchOutlet,
      availableOutlets,
      outletsLoading,
      setCurrentOutletId,
    ],
  );

  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope(): Scope {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
}
