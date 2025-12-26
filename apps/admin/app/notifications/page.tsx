"use client";

import { useState, useEffect } from "react";
import { NotificationCard } from "../components/notification-card";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

interface Notification {
  id: string;
  type: "like" | "retweet" | "reply" | "follow";
  actorId: string;
  actorName: string | null;
  actorEmail: string;
  tweetId: string | null;
  tweetContent: string | null;
  isRead: boolean;
  createdAt: Date;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (session) {
      loadNotifications();
    }
  }, [filter, session]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/rpc/notifications.list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 50,
          unreadOnly: filter === "unread",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }

      const data = await response.json();
      setNotifications(
        data.notifications.map((notif: any) => ({
          ...notif,
          createdAt: new Date(notif.createdAt),
        }))
      );
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/rpc/notifications.markAsRead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/rpc/notifications.markAllAsRead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === "follow") {
      router.push(`/profile/${notification.actorId}`);
    } else if (notification.tweetId) {
      router.push(`/tweet/${notification.tweetId}`);
    }
  };

  const handleActorClick = (actorId: string) => {
    router.push(`/profile/${actorId}`);
  };

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="px-4 pb-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
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
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BellOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {filter === "all" &&
              "When someone likes, retweets, or replies to your tweets, you'll see it here"}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onNotificationClick={handleNotificationClick}
              onActorClick={handleActorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
