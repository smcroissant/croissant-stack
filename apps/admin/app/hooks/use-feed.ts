"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";

export interface FeedPost {
  id: string;
  content: string;
  authorId: string;
  parentPostId: string | null;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string;
  authorImage: string | null;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  isLiked: boolean;
  isReposted: boolean;
  replyToAuthorName?: string | null;
  replyToAuthorEmail?: string | null;
}

/**
 * Hook to fetch the user's feed with infinite scroll
 */
export function useFeed(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["feed", limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.feed.getFeed.call({
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

/**
 * Hook to create a new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content: string; parentPostId?: string }) => {
      return orpc.feed.createPost.call(data);
    },
    onSuccess: () => {
      // Invalidate the feed to refetch
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to like/unlike a post
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return orpc.feed.likePost.call({ postId });
    },
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["feed"] });

      // Snapshot the previous value
      const previousFeed = queryClient.getQueryData(["feed", 20]);

      // Optimistically update
      queryClient.setQueryData(["feed", 20], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: FeedPost) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: !post.isLiked,
                    likesCount: post.isLiked
                      ? post.likesCount - 1
                      : post.likesCount + 1,
                  }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (_err, _postId, context) => {
      // Rollback on error
      if (context?.previousFeed) {
        queryClient.setQueryData(["feed", 20], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to repost/un-repost a post
 */
export function useRepostPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return orpc.feed.repostPost.call({ postId });
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });

      const previousFeed = queryClient.getQueryData(["feed", 20]);

      queryClient.setQueryData(["feed", 20], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: FeedPost) =>
              post.id === postId
                ? {
                    ...post,
                    isReposted: !post.isReposted,
                    repostsCount: post.isReposted
                      ? post.repostsCount - 1
                      : post.repostsCount + 1,
                  }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (_err, _postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["feed", 20], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to follow/unfollow a user
 */
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return orpc.feed.followUser.call({ userId });
    },
    onSuccess: () => {
      // Invalidate the feed since following changes what appears
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to check if current user is following another user
 */
export function useIsFollowing(userId: string) {
  return useQuery({
    queryKey: ["isFollowing", userId],
    queryFn: async () => {
      return orpc.feed.isFollowing.call({ userId });
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a single post
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      return orpc.feed.getPost.call({ postId });
    },
    enabled: !!postId,
  });
}

/**
 * Hook to fetch replies for a post with infinite scroll
 */
export function usePostReplies(postId: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["postReplies", postId, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.feed.getPostReplies.call({
        postId,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!postId,
  });
}

/**
 * Hook to fetch parent thread (ancestors) of a post
 */
export function usePostThread(postId: string) {
  return useQuery({
    queryKey: ["postThread", postId],
    queryFn: async () => {
      return orpc.feed.getPostThread.call({ postId });
    },
    enabled: !!postId,
  });
}

