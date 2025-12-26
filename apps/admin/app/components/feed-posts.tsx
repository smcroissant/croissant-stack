"use client";

import { useState, useMemo } from "react";
import { PostCard } from "./post-card";
import { ComposePost } from "./compose-post";
import { AuthRequiredDialog } from "./auth-required-dialog";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Feather, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFeed, useCreatePost, useLikePost, useRepostPost } from "../hooks/use-feed";

interface FeedPostsProps {
  isAuthenticated: boolean;
}

export function FeedPosts({ isAuthenticated }: FeedPostsProps) {
  const router = useRouter();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [replyToPost, setReplyToPost] = useState<{
    id: string;
    content: string;
  } | null>(null);

  // Fetch feed using custom hook
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed();

  // Mutations
  const createPostMutation = useCreatePost();
  const likePostMutation = useLikePost();
  const repostPostMutation = useRepostPost();

  // Flatten pages into a single array of posts
  const posts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.posts);
  }, [data]);

  const handleComposePost = async (
    content: string,
    parentPostId?: string
  ) => {
    if (!isAuthenticated) {
      setShowAuthRequired(true);
      return;
    }

    createPostMutation.mutate(
      { content, parentPostId },
      {
        onSuccess: () => {
          setIsComposeOpen(false);
          setReplyToPost(null);
        },
      }
    );
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      setShowAuthRequired(true);
      return;
    }
    likePostMutation.mutate(postId);
  };

  const handleRepost = async (postId: string) => {
    if (!isAuthenticated) {
      setShowAuthRequired(true);
      return;
    }
    repostPostMutation.mutate(postId);
  };

  const handleReply = (postId: string) => {
    if (!isAuthenticated) {
      setShowAuthRequired(true);
      return;
    }
    const post = posts.find((t) => t.id === postId);
    if (post) {
      setReplyToPost({ id: post.id, content: post.content });
      setIsComposeOpen(true);
    }
  };

  const handleComposeClick = () => {
    if (!isAuthenticated) {
      setShowAuthRequired(true);
      return;
    }
    setReplyToPost(null);
    setIsComposeOpen(true);
  };

  const handlePostClick = (postId: string) => {
    router.push(`/feed/${postId}`);
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/profile/${authorId}`);
  };

  return (
    <>
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Home</h1>
          <Button size="sm" className="gap-2" onClick={handleComposeClick}>
            <Feather className="w-4 h-4" />
            Post
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Feather className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-medium mb-2">Failed to load feed</p>
          <p className="text-muted-foreground mb-4">
            {error?.message || "An unexpected error occurred"}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full mb-6">
            <Feather className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-xl font-medium mb-2">Your feed is empty</p>
          <p className="text-muted-foreground mb-6 max-w-md">
            Follow some users to see their posts here, or create your first post to get started.
          </p>
          <Button onClick={handleComposeClick} className="gap-2">
            <Feather className="w-4 h-4" />
            Create your first post
          </Button>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                content: post.content,
                authorId: post.authorId,
                authorName: post.authorName || "Unknown",
                authorEmail: post.authorEmail,
                parentPostId: post.parentPostId,
                createdAt: new Date(post.createdAt),
                likesCount: post.likesCount,
                repostsCount: post.repostsCount,
                repliesCount: post.repliesCount,
                isLiked: post.isLiked,
                isReposted: post.isReposted,
                replyToAuthorName: post.replyToAuthorName,
                replyToAuthorEmail: post.replyToAuthorEmail,
              }}
              onLike={handleLike}
              onRepost={handleRepost}
              onReply={handleReply}
              onAuthorClick={handleAuthorClick}
              onPostClick={handlePostClick}
            />
          ))}

          {/* Load More Button */}
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
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <ComposePost
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) {
            setReplyToPost(null);
          }
        }}
        onSubmit={handleComposePost}
        parentPostId={replyToPost?.id}
        parentPostContent={replyToPost?.content}
      />

      <AuthRequiredDialog
        open={showAuthRequired}
        onOpenChange={setShowAuthRequired}
      />
    </>
  );
}

