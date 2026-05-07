"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export type StaffRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "cashier"
  | "barista";

export interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  role: StaffRole;
  type: "staff" | "member";
  /// `null` for super_admin (cross-outlet) or members; otherwise the
  /// outlet the staff member is assigned to. Read by ScopeContext to
  /// decide whether the user is locked to one outlet.
  outlet_id: number | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Defer the state writes off the effect commit phase so React doesn't
    // re-render mid-commit. Equivalent functionally; satisfies the
    // react-hooks/set-state-in-effect lint that's now an error in this stack.
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    queueMicrotask(() => {
      if (stored && token) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.clear();
        }
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const { data } = await api.post<{
        type: string;
        role: string;
        user: {
          id?: number;
          staff_id?: number;
          member_id?: number;
          name: string;
          username?: string;
          email?: string;
          outlet_id?: number | null;
        };
        access_token: string;
        refresh_token: string;
      }>("/auth/login", { identifier, password });

      const allowedRoles = ["super_admin", "admin", "manager"];
      if (data.type !== "staff" || !allowedRoles.includes(data.role)) {
        throw new Error("Access denied. Admin, Manager, or Super Admin role required.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      const userData: User = {
        // Backend currently returns `id`; older code looked for
        // `staff_id`/`member_id`. Honor any of them.
        id:
          data.user.id ??
          data.user.staff_id ??
          data.user.member_id ??
          0,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        role: data.role as StaffRole,
        type: data.type as User["type"],
        outlet_id: data.user.outlet_id ?? null,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      router.push("/");
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
