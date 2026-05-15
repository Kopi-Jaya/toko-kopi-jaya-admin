"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OutletScopePicker } from "@/components/outlet-scope-picker";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ScopeProvider } from "@/lib/scope";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Block render until auth state is resolved, then redirect if no user.
  // Never render dashboard content without a confirmed user.
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-end border-b border-border bg-card px-6">
          <OutletScopePicker />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ScopeProvider>
        <DashboardShell>{children}</DashboardShell>
      </ScopeProvider>
    </AuthProvider>
  );
}
