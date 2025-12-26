"use client";

import { Card } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Avatar } from "@repo/ui/components/avatar";
import { MessageCircle, Repeat2, Heart, Share } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface TweetCardProps {
  tweet: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    parentTweetId: string | null;
    createdAt: Date;
    likesCount: number;
    retweetsCount: number;
    repliesCount: number;
    isLiked: boolean;
    isRetweeted: boolean;
  };
  onLike?: (tweetId: string) => Promise<void>;
  onRetweet?: (tweetId: string) => Promise<void>;
  onReply?: (tweetId: string) => void;
  onAuthorClick?: (authorId: string) => void;
}

export function TweetCard({
  tweet,
  onLike,
  onRetweet,
  onReply,
  onAuthorClick,
}: TweetCardProps) {
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [isRetweeted, setIsRetweeted] = useState(tweet.isRetweeted);
  const [likesCount, setLikesCount] = useState(tweet.likesCount);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweetsCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isRetweeting, setIsRetweeting] = useState(false);

  const handleLike = async () => {
    if (isLiking || !onLike) return;
    setIsLiking(true);
    try {
      await onLike(tweet.id);
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    } catch (error) {
      console.error("Failed to like tweet:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRetweet = async () => {
    if (isRetweeting || !onRetweet) return;
    setIsRetweeting(true);
    try {
      await onRetweet(tweet.id);
      setIsRetweeted(!isRetweeted);
      setRetweetsCount(isRetweeted ? retweetsCount - 1 : retweetsCount + 1);
    } catch (error) {
      console.error("Failed to retweet:", error);
    } finally {
      setIsRetweeting(false);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(tweet.id);
    }
  };

  const handleAuthorClick = () => {
    if (onAuthorClick) {
      onAuthorClick(tweet.authorId);
    }
  };

  return (
    <Card className="p-4 hover:bg-accent/5 transition-colors border-b border-x-0 border-t-0 rounded-none">
      <div className="flex gap-3">
        <Avatar
          className="w-10 h-10 cursor-pointer"
          onClick={handleAuthorClick}
        >
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {tweet.authorName?.[0]?.toUpperCase() || "?"}
          </div>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={handleAuthorClick}
              className="font-semibold hover:underline text-sm"
            >
              {tweet.authorName || "Unknown"}
            </button>
            <span className="text-muted-foreground text-sm">
              @{tweet.authorEmail?.split("@")[0] || "unknown"}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(tweet.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <p className="text-sm whitespace-pre-wrap mb-3">{tweet.content}</p>

          <div className="flex items-center gap-8">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-8 px-2 text-muted-foreground hover:text-primary"
              onClick={handleReply}
            >
              <MessageCircle className="w-4 h-4" />
              {tweet.repliesCount > 0 && (
                <span className="text-xs">{tweet.repliesCount}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 h-8 px-2 ${
                isRetweeted
                  ? "text-green-600 hover:text-green-700"
                  : "text-muted-foreground hover:text-green-600"
              }`}
              onClick={handleRetweet}
              disabled={isRetweeting}
            >
              <Repeat2 className="w-4 h-4" />
              {retweetsCount > 0 && (
                <span className="text-xs">{retweetsCount}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 h-8 px-2 ${
                isLiked
                  ? "text-red-600 hover:text-red-700"
                  : "text-muted-foreground hover:text-red-600"
              }`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-8 px-2 text-muted-foreground hover:text-primary"
            >
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
