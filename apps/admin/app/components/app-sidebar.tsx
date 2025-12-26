"use client";

import { Home, User, Bell, Hash, Settings, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@repo/ui/components/sidebar";
import { useAuth } from "../providers/auth-provider";
import { Avatar } from "@repo/ui/components/avatar";
import { Separator } from "@repo/ui/components/separator";
import { ModeToggle } from "./mode-toggle";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/feed",
    icon: Home,
  },
  {
    title: "Explore",
    url: "/explore",
    icon: Hash,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    badge: true, // Show badge for notifications
  },
  {
    title: "Profile",
    url: "/profile/me",
    icon: User,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { session, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session) {
      loadUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch("/api/rpc/notifications.unreadCount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Twitter Clone</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="relative">
                      <item.icon />
                      <span>{item.title}</span>
                      {item.badge && unreadCount > 0 && (
                        <span className="absolute right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-2" />
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-sm font-medium">Theme</span>
          <ModeToggle />
        </div>
        <Separator className="my-2" />
        {session ? (
          <>
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="w-10 h-10">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {session.user.name?.[0]?.toUpperCase() || "?"}
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut} className="text-destructive">
                  <LogOut />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/login" className="font-medium">
                  <User />
                  <span>Sign in</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
