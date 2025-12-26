"use client";

import { useState } from "react";
import { NotificationCard } from "../components/notification-card";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

interface Notification {
  id: string;
  type: "like" | "repost" | "reply" | "follow";
  actorId: string;
  actorName: string | null;
  actorEmail: string;
  postId: string | null;
  postContent: string | null;
  isRead: boolean;
  createdAt: Date;
}

// Fake notifications data
const FAKE_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "like",
    actorId: "user-1",
    actorName: "John Doe",
    actorEmail: "john@example.com",
    postId: "post-1",
    postContent: "Just shipped a new feature! Check it out.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
  {
    id: "2",
    type: "repost",
    actorId: "user-2",
    actorName: "Jane Smith",
    actorEmail: "jane@example.com",
    postId: "post-2",
    postContent: "Working on something exciting today!",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "3",
    type: "reply",
    actorId: "user-3",
    actorName: "Bob Johnson",
    actorEmail: "bob@example.com",
    postId: "post-3",
    postContent: "Great post! Would love to hear more about this.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
  {
    id: "4",
    type: "follow",
    actorId: "user-4",
    actorName: "Alice Williams",
    actorEmail: "alice@example.com",
    postId: null,
    postContent: null,
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "5",
    type: "like",
    actorId: "user-5",
    actorName: "Charlie Brown",
    actorEmail: "charlie@example.com",
    postId: "post-4",
    postContent: "Amazing work on the new design system!",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>(FAKE_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const handleMarkAsRead = async (notificationId: string) => {
    // Update local state
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    // Update local state
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === "follow") {
      router.push(`/profile/${notification.actorId}`);
    } else if (notification.postId) {
      router.push(`/post/${notification.postId}`);
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

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

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

      {filteredNotifications.length === 0 ? (
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
