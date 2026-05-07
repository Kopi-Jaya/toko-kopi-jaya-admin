"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Coffee,
  FolderOpen,
  Sliders,
  MapPin,
  Users,
  UserCog,
  Ticket,
  Gift,
  Clock,
  Receipt,
  Percent,
  LogOut,
  ScanLine,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, type StaffRole } from "@/lib/auth";

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  /// Roles allowed to see this item. `undefined` means everyone with
  /// dashboard access (admin/manager/super_admin).
  roles?: StaffRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Orders", href: "/orders", icon: ShoppingCart },
      { title: "Validate QR", href: "/validate", icon: ScanLine },
    ],
  },
  {
    label: "Menu Management",
    items: [
      { title: "Products", href: "/products", icon: Coffee },
      { title: "Categories", href: "/categories", icon: FolderOpen },
      { title: "Modifiers", href: "/modifiers", icon: Sliders },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Members", href: "/members", icon: Users },
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Rewards", href: "/rewards", icon: Gift },
    ],
  },
  {
    label: "Operations",
    items: [
      // Outlet + staff management is super_admin only — outlet admins
      // shouldn't be minting accounts or onboarding new branches.
      {
        title: "Outlets",
        href: "/outlets",
        icon: MapPin,
        roles: ["super_admin"],
      },
      {
        title: "Staff",
        href: "/staff",
        icon: UserCog,
        roles: ["super_admin"],
      },
      { title: "Shifts", href: "/shifts", icon: Clock },
      { title: "Discounts", href: "/discounts", icon: Ticket },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Tax", href: "/tax", icon: Receipt },
      { title: "Service Charges", href: "/service-charges", icon: Percent },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role;

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.roles) return true;
        return role ? item.roles.includes(role) : false;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img src="/logo.png" alt="Kopi Jaya" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-white">Toko Kopi Jaya</span>
            <span className="text-xs text-white/60">Admin Dashboard</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-white/50 text-xs uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={`${user?.name || "User"} (${user?.role || ""})`}
              className="group-data-[collapsible=icon]:justify-center"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-medium text-white">
                {user?.name?.charAt(0) || "?"}
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm text-white">{user?.name}</span>
                <span className="text-xs capitalize text-white/60">{user?.role}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
