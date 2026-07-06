"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClipboardList, Layers, Users } from "lucide-react";

import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const primaryNav = [
  { title: "Platforms", href: "/", icon: Layers },
  { title: "All Teams", href: "/teams", icon: Users },
  { title: "All Changes", href: "/change", icon: ClipboardList },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    (pathname === "/" && status !== "authenticated")
  ) {
    return null;
  }

  const displayName = session?.user?.name || "Change Auditor";
  const displayEmail = session?.user?.email || "Not signed in";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CA";
  const authLabel =
    status === "loading"
      ? "Checking session..."
      : status === "authenticated"
        ? displayEmail
        : "Not signed in";

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <div className="flex justify-between">
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            Change Audit
          </div>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />

      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {authLabel}
            </p>
          </div>
        </div>
        <AuthSignOutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
