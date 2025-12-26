"use client";

import { Card } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Avatar } from "@repo/ui/components/avatar";
import { MessageCircle, Repeat2, Heart, Share, CornerDownRight } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

// Recursive type for nested replies
export interface NestedReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  parentPostId: string | null;
  createdAt: Date;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  isLiked: boolean;
  isReposted: boolean;
  nestedReplies: NestedReply[];
}

interface NestedReplyCardProps {
  reply: NestedReply;
  depth?: number;
  onLike: (postId: string) => Promise<void>;
  onRepost: (postId: string) => Promise<void>;
  onReply: (postId: string) => void;
  onAuthorClick: (authorId: string) => void;
}

// Single reply item that can render recursively
function ReplyItem({
  reply,
  depth = 0,
  onLike,
  onRepost,
  onReply,
  onAuthorClick,
}: NestedReplyCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(reply.isLiked);
  const [isReposted, setIsReposted] = useState(reply.isReposted);
  const [likesCount, setLikesCount] = useState(reply.likesCount);
  const [repostsCount, setRepostsCount] = useState(reply.repostsCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  const hasNestedReplies = reply.nestedReplies && reply.nestedReplies.length > 0;
  
  // Calculate indentation - max indent at depth 6
  const maxDepth = 6;
  const effectiveDepth = Math.min(depth, maxDepth);
  const indentPx = effectiveDepth * 20;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);
    try {
      await onLike(reply.id);
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    } catch (error) {
      console.error("Failed to like post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReposting) return;
    setIsReposting(true);
    try {
      await onRepost(reply.id);
      setIsReposted(!isReposted);
      setRepostsCount(isReposted ? repostsCount - 1 : repostsCount + 1);
    } catch (error) {
      console.error("Failed to repost:", error);
    } finally {
      setIsReposting(false);
    }
  };

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    router.push(`/feed/${reply.id}`);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAuthorClick(reply.authorId);
  };

  // Avatar size decreases with depth
  const avatarSizes = ["w-10 h-10", "w-9 h-9", "w-8 h-8", "w-7 h-7", "w-7 h-7", "w-6 h-6", "w-6 h-6"];
  const avatarSize = avatarSizes[Math.min(depth, avatarSizes.length - 1)];
  const textSizes = ["text-sm", "text-sm", "text-sm", "text-xs", "text-xs", "text-xs", "text-xs"];
  const textSize = textSizes[Math.min(depth, textSizes.length - 1)];

  return (
    <div className="relative">
      {/* Reply content */}
      <div
        className="relative hover:bg-accent/5 transition-colors cursor-pointer border-b border-border/50"
        style={{ paddingLeft: `${indentPx + 16}px` }}
        onClick={handlePostClick}
      >
        <div className="py-3 pr-4">
          {/* Reply indicator for nested replies */}
          {depth > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              <CornerDownRight className="w-3 h-3" />
              <span>Reply</span>
            </div>
          )}

          <div className="flex gap-2">
            {/* Avatar */}
            <Avatar
              className={`${avatarSize} cursor-pointer flex-shrink-0`}
              onClick={handleAuthorClick}
            >
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {reply.authorName?.[0]?.toUpperCase() || "?"}
              </div>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleAuthorClick}
                  className={`font-semibold hover:underline ${textSize}`}
                >
                  {reply.authorName || "Unknown"}
                </button>
                <span className={`text-muted-foreground ${textSize}`}>
                  @{reply.authorEmail?.split("@")[0] || "unknown"}
                </span>
                <span className={`text-muted-foreground ${textSize}`}>·</span>
                <span className={`text-muted-foreground ${textSize}`}>
                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                </span>
              </div>

              <p className={`whitespace-pre-wrap mt-1 mb-2 ${textSize}`}>{reply.content}</p>

              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-6 px-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply(reply.id);
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {reply.repliesCount > 0 && <span>{reply.repliesCount}</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 h-6 px-1.5 text-xs ${
                    isReposted
                      ? "text-green-500 bg-green-500/10"
                      : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                  }`}
                  onClick={handleRepost}
                  disabled={isReposting}
                >
                  <Repeat2 className="w-3.5 h-3.5" />
                  {repostsCount > 0 && <span>{repostsCount}</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 h-6 px-1.5 text-xs ${
                    isLiked
                      ? "text-red-500 bg-red-500/10"
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  }`}
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                  {likesCount > 0 && <span>{likesCount}</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-6 px-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recursively render nested replies */}
      {hasNestedReplies && (
        <div>
          {reply.nestedReplies.map((nested) => (
            <ReplyItem
              key={nested.id}
              reply={nested}
              depth={depth + 1}
              onLike={onLike}
              onRepost={onRepost}
              onReply={onReply}
              onAuthorClick={onAuthorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main export - wrapper for top-level reply
export function NestedReplyCard({
  reply,
  onLike,
  onRepost,
  onReply,
  onAuthorClick,
}: Omit<NestedReplyCardProps, 'depth'>) {
  return (
    <ReplyItem
      reply={reply}
      depth={0}
      onLike={onLike}
      onRepost={onRepost}
      onReply={onReply}
      onAuthorClick={onAuthorClick}
    />
  );
}
