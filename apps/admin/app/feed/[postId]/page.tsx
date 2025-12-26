"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PostCard } from "../../components/post-card";
import { NestedReplyCard, type NestedReply } from "../../components/nested-reply";
import { ComposePost } from "../../components/compose-post";
import { AuthRequiredDialog } from "../../components/auth-required-dialog";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Card } from "@repo/ui/components/card";
import { Avatar } from "@repo/ui/components/avatar";
import { ArrowLeft, MessageCircle, Repeat2, Heart, Share, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../providers/auth-provider";
import { usePost, usePostReplies, usePostThread, useCreatePost, useLikePost, useRepostPost } from "../../hooks/use-feed";
import { formatDistanceToNow } from "date-fns";

// Helper function to recursively convert API reply to NestedReply type
function convertReply(reply: any): NestedReply {
  return {
    id: reply.id,
    content: reply.content,
    authorId: reply.authorId,
    authorName: reply.authorName || "Unknown",
    authorEmail: reply.authorEmail,
    parentPostId: reply.parentPostId,
    createdAt: new Date(reply.createdAt),
    likesCount: reply.likesCount,
    repostsCount: reply.repostsCount,
    repliesCount: reply.repliesCount,
    isLiked: reply.isLiked,
    isReposted: reply.isReposted,
    nestedReplies: (reply.nestedReplies || []).map(convertReply),
  };
}

// Thread post card for ancestors
function ThreadPostCard({
  post,
  onLike,
  onRepost,
  onReply,
  onAuthorClick,
  onPostClick,
}: {
  post: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    parentPostId: string | null;
    createdAt: Date;
    likesCount: number;
    repostsCount: number;
    repliesCount: number;
    isLiked: boolean;
    isReposted: boolean;
  };
  onLike?: (postId: string) => Promise<void>;
  onRepost?: (postId: string) => Promise<void>;
  onReply?: (postId: string) => void;
  onAuthorClick?: (authorId: string) => void;
  onPostClick?: (postId: string) => void;
}) {
  return (
    <div className="hover:bg-accent/5 transition-colors">
      <PostCard
        post={post}
        onLike={onLike}
        onRepost={onRepost}
        onReply={onReply}
        onAuthorClick={onAuthorClick}
        onPostClick={onPostClick}
      />
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { session } = useAuth();
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; content: string } | null>(null);

  // Fetch post, thread (ancestors), and replies
  const {
    data: post,
    isLoading: isLoadingPost,
    isError: isPostError,
    error: postError,
    refetch: refetchPost,
  } = usePost(postId);

  const {
    data: threadData,
    isLoading: isLoadingThread,
    refetch: refetchThread,
  } = usePostThread(postId);

  const {
    data: repliesData,
    isLoading: isLoadingReplies,
    isError: isRepliesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchReplies,
  } = usePostReplies(postId);

  // Mutations
  const createPostMutation = useCreatePost();
  const likePostMutation = useLikePost();
  const repostPostMutation = useRepostPost();

  // Flatten replies pages
  const replies = useMemo(() => {
    if (!repliesData?.pages) return [];
    return repliesData.pages.flatMap((page) => page.replies);
  }, [repliesData]);

  // Get thread (parent posts)
  const thread = useMemo(() => {
    return threadData?.thread ?? [];
  }, [threadData]);

  const handleBack = () => {
    router.back();
  };

  const handleComposeReply = async (content: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }

    // Use replyTarget.id if replying to a specific post, otherwise use the main postId
    const parentId = replyTarget?.id || postId;

    createPostMutation.mutate(
      { content, parentPostId: parentId },
      {
        onSuccess: () => {
          setIsComposeOpen(false);
          setReplyTarget(null);
          refetchPost();
          refetchReplies();
        },
      }
    );
  };

  const handleLike = async (targetPostId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    likePostMutation.mutate(targetPostId, {
      onSuccess: () => {
        refetchPost();
        refetchThread();
        refetchReplies();
      },
    });
  };

  const handleRepost = async (targetPostId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    repostPostMutation.mutate(targetPostId, {
      onSuccess: () => {
        refetchPost();
        refetchThread();
        refetchReplies();
      },
    });
  };

  // Helper to find a post by ID in the nested replies tree
  const findPostInReplies = (targetId: string, repliesList: any[]): any | null => {
    for (const reply of repliesList) {
      if (reply.id === targetId) return reply;
      if (reply.nestedReplies?.length > 0) {
        const found = findPostInReplies(targetId, reply.nestedReplies);
        if (found) return found;
      }
    }
    return null;
  };

  const handleReplyClick = (targetPostId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }

    // If replying to the main post
    if (targetPostId === postId) {
      setReplyTarget({ id: postId, content: post?.content || "" });
    } else {
      // Find the post in replies to get its content
      const targetPost = findPostInReplies(targetPostId, replies);
      if (targetPost) {
        setReplyTarget({ id: targetPostId, content: targetPost.content });
      } else {
        // Fallback to just the ID
        setReplyTarget({ id: targetPostId, content: "" });
      }
    }
    setIsComposeOpen(true);
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/profile/${authorId}`);
  };

  const handlePostClick = (clickedPostId: string) => {
    if (clickedPostId !== postId) {
      router.push(`/feed/${clickedPostId}`);
    }
  };

  // Not logged in state
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Post</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Sign in to view this post and its replies.
          </p>
          <Button onClick={() => router.push("/login")}>Sign In</Button>
        </div>
        <AuthRequiredDialog
          open={showAuthRequired}
          onOpenChange={setShowAuthRequired}
        />
      </div>
    );
  }

  // Loading state
  if (isLoadingPost) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Post</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isPostError || !post) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Post</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <MessageCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-medium mb-2">Failed to load post</p>
          <p className="text-muted-foreground mb-4">
            {postError?.message || "Post not found"}
          </p>
          <Button variant="outline" onClick={() => refetchPost()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {thread.length > 0 ? "Thread" : "Post"}
          </h1>
        </div>
      </div>

      {/* Parent Thread (Ancestors) */}
      {isLoadingThread ? (
        <div className="divide-y">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 space-y-3 relative">
              <div className="absolute left-7 top-14 bottom-0 w-0.5 bg-border" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : thread.length > 0 ? (
        <div>
          {thread.map((parentPost) => (
            <ThreadPostCard
              key={parentPost.id}
              post={{
                id: parentPost.id,
                content: parentPost.content,
                authorId: parentPost.authorId,
                authorName: parentPost.authorName || "Unknown",
                authorEmail: parentPost.authorEmail,
                parentPostId: parentPost.parentPostId,
                createdAt: new Date(parentPost.createdAt),
                likesCount: parentPost.likesCount,
                repostsCount: parentPost.repostsCount,
                repliesCount: parentPost.repliesCount,
                isLiked: parentPost.isLiked,
                isReposted: parentPost.isReposted,
              }}
              onLike={handleLike}
              onRepost={handleRepost}
              onAuthorClick={handleAuthorClick}
              onPostClick={handlePostClick}
            />
          ))}
        </div>
      ) : null}

      {/* Main Post */}
      <Card className="p-4 border-b border-x-0 border-t-0 rounded-none">
        <div className="flex gap-3">
          <Avatar
            className="w-12 h-12 cursor-pointer"
            onClick={() => handleAuthorClick(post.authorId)}
          >
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-base font-medium">
              {post.authorName?.[0]?.toUpperCase() || "?"}
            </div>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => handleAuthorClick(post.authorId)}
                className="font-semibold hover:underline"
              >
                {post.authorName || "Unknown"}
              </button>
              <span className="text-muted-foreground text-sm">
                @{post.authorEmail?.split("@")[0] || "unknown"}
              </span>
            </div>
          </div>
        </div>

        <p className="text-lg whitespace-pre-wrap mt-3 mb-4">{post.content}</p>

        <div className="text-muted-foreground text-sm mb-4 pb-4 border-b">
          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
        </div>

        {/* Stats */}
        {(post.repostsCount > 0 || post.likesCount > 0) && (
          <div className="flex gap-4 text-sm mb-4 pb-4 border-b">
            {post.repostsCount > 0 && (
              <span>
                <span className="font-semibold">{post.repostsCount}</span>{" "}
                <span className="text-muted-foreground">Reposts</span>
              </span>
            )}
            {post.likesCount > 0 && (
              <span>
                <span className="font-semibold">{post.likesCount}</span>{" "}
                <span className="text-muted-foreground">Likes</span>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-10 px-3 text-muted-foreground hover:text-primary"
            onClick={() => handleReplyClick(postId)}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 h-10 px-3 ${
              post.isReposted
                ? "text-green-600 hover:text-green-700"
                : "text-muted-foreground hover:text-green-600"
            }`}
            onClick={() => handleRepost(post.id)}
          >
            <Repeat2 className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 h-10 px-3 ${
              post.isLiked
                ? "text-red-600 hover:text-red-700"
                : "text-muted-foreground hover:text-red-600"
            }`}
            onClick={() => handleLike(post.id)}
          >
            <Heart className={`w-5 h-5 ${post.isLiked ? "fill-current" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-10 px-3 text-muted-foreground hover:text-primary"
          >
            <Share className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Replies Section Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Replies
          {post.repliesCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({post.repliesCount})
            </span>
          )}
        </h2>
      </div>

      {/* Replies */}
      {isLoadingReplies ? (
        <div className="divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : isRepliesError ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load replies</p>
        </div>
      ) : replies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">
            No replies yet. Be the first to reply!
          </p>
          <Button onClick={() => handleReplyClick(postId)} variant="outline" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            Reply
          </Button>
        </div>
      ) : (
        <div>
          {replies.map((reply) => (
            <NestedReplyCard
              key={reply.id}
              reply={convertReply(reply)}
              onLike={handleLike}
              onRepost={handleRepost}
              onReply={handleReplyClick}
              onAuthorClick={handleAuthorClick}
            />
          ))}

          {/* Load More Replies */}
          {hasNextPage && (
            <div className="p-4 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more replies"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Compose Reply Dialog */}
      <ComposePost
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) setReplyTarget(null);
        }}
        onSubmit={handleComposeReply}
        parentPostId={replyTarget?.id || postId}
        parentPostContent={replyTarget?.content || post.content}
      />

      <AuthRequiredDialog
        open={showAuthRequired}
        onOpenChange={setShowAuthRequired}
      />
    </div>
  );
}
