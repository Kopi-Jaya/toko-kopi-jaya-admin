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

interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  role: "admin" | "manager" | "cashier" | "barista";
  type: "staff" | "member";
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
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const { data } = await api.post<{
        type: string;
        role: string;
        user: { staff_id?: number; member_id?: number; name: string; username?: string; email?: string };
        access_token: string;
        refresh_token: string;
      }>("/auth/login", { identifier, password });

      if (data.type !== "staff" || !["admin", "manager"].includes(data.role)) {
        throw new Error("Access denied. Admin or Manager role required.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      const userData: User = {
        id: data.user.staff_id || data.user.member_id || 0,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        role: data.role as User["role"],
        type: data.type as User["type"],
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
