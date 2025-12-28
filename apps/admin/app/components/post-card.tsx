"use client";

import { Card } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Avatar } from "@repo/ui/components/avatar";
import { MessageCircle, Repeat2, Heart, Share, CornerDownRight, Lock } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    authorIsPrivate?: boolean;
    parentPostId: string | null;
    createdAt: Date;
    likesCount: number;
    repostsCount: number;
    repliesCount: number;
    isLiked: boolean;
    isReposted: boolean;
    replyToAuthorName?: string | null;
    replyToAuthorEmail?: string | null;
    // Repost info - when this post appears in feed because someone reposted it
    repostedByUserId?: string | null;
    repostedByUserName?: string | null;
    repostedByUserEmail?: string | null;
  };
  onLike?: (postId: string) => Promise<void>;
  onRepost?: (postId: string) => Promise<void>;
  onReply?: (postId: string) => void;
  onAuthorClick?: (authorId: string) => void;
  onPostClick?: (postId: string) => void;
  onRepostedByClick?: (userId: string) => void;
}

export function PostCard({
  post,
  onLike,
  onRepost,
  onReply,
  onAuthorClick,
  onPostClick,
  onRepostedByClick,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isReposted, setIsReposted] = useState(post.isReposted);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  const handleLike = async () => {
    if (isLiking || !onLike) return;
    setIsLiking(true);
    try {
      await onLike(post.id);
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    } catch (error) {
      console.error("Failed to like post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    if (isReposting || !onRepost) return;
    setIsReposting(true);
    try {
      await onRepost(post.id);
      setIsReposted(!isReposted);
      setRepostsCount(isReposted ? repostsCount - 1 : repostsCount + 1);
    } catch (error) {
      console.error("Failed to repost:", error);
    } finally {
      setIsReposting(false);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(post.id);
    }
  };

  const handleAuthorClick = () => {
    if (onAuthorClick) {
      onAuthorClick(post.authorId);
    }
  };

  const handlePostClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons or links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    if (onPostClick) {
      onPostClick(post.id);
    }
  };

  const handleRepostedByClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRepostedByClick && post.repostedByUserId) {
      onRepostedByClick(post.repostedByUserId);
    }
  };

  return (
    <Card 
      className="p-4 hover:bg-accent/5 transition-colors border-b border-x-0 border-t-0 rounded-none cursor-pointer"
      onClick={handlePostClick}
    >
      {/* Repost indicator */}
      {post.repostedByUserId && post.repostedByUserEmail && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 ml-12">
          <Repeat2 className="w-3 h-3" />
          <button
            onClick={handleRepostedByClick}
            className="hover:underline"
          >
            {post.repostedByUserName || post.repostedByUserEmail.split("@")[0]} reposted
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <Avatar
          className="w-10 h-10 cursor-pointer"
          onClick={handleAuthorClick}
        >
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {post.authorName?.[0]?.toUpperCase() || "?"}
          </div>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Reply indicator */}
          {post.parentPostId && post.replyToAuthorEmail && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <CornerDownRight className="w-3 h-3" />
              <span>Replying to</span>
              <span className="text-primary hover:underline cursor-pointer">
                @{post.replyToAuthorEmail.split("@")[0]}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={handleAuthorClick}
              className="font-semibold hover:underline text-sm flex items-center gap-1"
            >
              {post.authorName || "Unknown"}
              {post.authorIsPrivate && (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
            <span className="text-muted-foreground text-sm">
              @{post.authorEmail?.split("@")[0] || "unknown"}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>

          <div className="flex items-center gap-8">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-8 px-2 text-muted-foreground hover:text-primary"
              onClick={handleReply}
            >
              <MessageCircle className="w-4 h-4" />
              {post.repliesCount > 0 && (
                <span className="text-xs">{post.repliesCount}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 h-8 px-2 ${
                isReposted
                  ? "text-green-600 hover:text-green-700"
                  : "text-muted-foreground hover:text-green-600"
              }`}
              onClick={handleRepost}
              disabled={isReposting}
            >
              <Repeat2 className="w-4 h-4" />
              {repostsCount > 0 && (
                <span className="text-xs">{repostsCount}</span>
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

