"use client";

import { Card } from "@repo/ui/components/card";
import { Avatar } from "@repo/ui/components/avatar";
import { Heart, Repeat2, MessageCircle, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationCardProps {
  notification: {
    id: string;
    type: "like" | "retweet" | "reply" | "follow";
    actorId: string;
    actorName: string | null;
    actorEmail: string;
    tweetId: string | null;
    tweetContent: string | null;
    isRead: boolean;
    createdAt: Date;
  };
  onNotificationClick?: (notification: any) => void;
  onActorClick?: (actorId: string) => void;
}

export function NotificationCard({
  notification,
  onNotificationClick,
  onActorClick,
}: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "retweet":
        return <Repeat2 className="w-5 h-5 text-green-500" />;
      case "reply":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-purple-500" />;
    }
  };

  const getText = () => {
    const name = notification.actorName || notification.actorEmail;
    switch (notification.type) {
      case "like":
        return (
          <>
            <span className="font-semibold">{name}</span> liked your tweet
          </>
        );
      case "retweet":
        return (
          <>
            <span className="font-semibold">{name}</span> retweeted your tweet
          </>
        );
      case "reply":
        return (
          <>
            <span className="font-semibold">{name}</span> replied to your tweet
          </>
        );
      case "follow":
        return (
          <>
            <span className="font-semibold">{name}</span> started following you
          </>
        );
    }
  };

  const handleClick = () => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleActorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onActorClick) {
      onActorClick(notification.actorId);
    }
  };

  return (
    <Card
      className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors border-l-4 ${
        notification.isRead
          ? "border-l-transparent"
          : "border-l-primary bg-accent/20"
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <button
              onClick={handleActorClick}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-10 h-10">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {notification.actorName?.[0]?.toUpperCase() ||
                    notification.actorEmail[0]?.toUpperCase()}
                </div>
              </Avatar>
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm mb-1">{getText()}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(notification.createdAt, {
                  addSuffix: true,
                })}
              </p>

              {notification.tweetContent && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.tweetContent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
