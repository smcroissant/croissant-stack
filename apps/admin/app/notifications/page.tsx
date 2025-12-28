"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationCard } from "../components/notification-card";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Bell, BellOff, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useClearAllNotifications,
  type Notification,
} from "../hooks";

export default function NotificationsPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Hooks for data fetching
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useNotifications();

  const { data: unreadCountData } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const clearAll = useClearAllNotifications();

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated notifications and cast the type properly
  const notifications: Notification[] = (
    data?.pages.flatMap((page) => page.notifications) ?? []
  ).map((n) => ({
    ...n,
    type: n.type as Notification["type"],
    actorName: n.actorName ?? null,
  }));

  const unreadCount = unreadCountData?.count ?? 0;

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead.mutate(notificationId);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  const handleClearAll = useCallback(() => {
    clearAll.mutate();
  }, [clearAll]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }

      // Navigate based on notification type
      if (notification.type === "follow") {
        router.push(`/profile/${notification.actorId}`);
      } else if (notification.postId) {
        router.push(`/feed/${notification.postId}`);
      }
    },
    [handleMarkAsRead, router]
  );

  const handleActorClick = useCallback(
    (actorId: string) => {
      router.push(`/profile/${actorId}`);
    },
    [router]
  );

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BellOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Sign in to view your notifications
          </p>
          <Button onClick={() => router.push("/login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BellOff className="w-16 h-16 text-destructive mb-4" />
          <p className="text-muted-foreground mb-4">
            Failed to load notifications
          </p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleClearAll}
                disabled={clearAll.isPending}
              >
                {clearAll.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 pb-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BellOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {filter === "all" &&
              "When someone likes, reposts, or replies to your posts, you'll see it here"}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={{
                ...notification,
                createdAt: new Date(notification.createdAt),
              }}
              onNotificationClick={handleNotificationClick}
              onActorClick={handleActorClick}
            />
          ))}

          {/* Load more trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
