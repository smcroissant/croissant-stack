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
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["profile", userId] });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(["profile", userId]);

      // Optimistically update the profile
      queryClient.setQueryData(["profile", userId], (old: any) => {
        if (!old) return old;
        const newIsFollowing = !old.isFollowing;
        return {
          ...old,
          isFollowing: newIsFollowing,
          followersCount: newIsFollowing 
            ? old.followersCount + 1 
            : Math.max(0, old.followersCount - 1),
        };
      });

      return { previousProfile, userId };
    },
    onError: (_err, userId, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(["profile", userId], context.previousProfile);
      }
    },
    onSettled: (_data, _error, userId) => {
      // Invalidate the feed since following changes what appears
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      // Invalidate profile to get fresh data
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      // Invalidate isFollowing query
      queryClient.invalidateQueries({ queryKey: ["isFollowing", userId] });
      // Invalidate user posts/reposts/likes in case visibility changed
      queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
      queryClient.invalidateQueries({ queryKey: ["userReposts", userId] });
      queryClient.invalidateQueries({ queryKey: ["userLikes", userId] });
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
 * Hook to fetch a single post (requires auth)
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
 * Hook to fetch a single PUBLIC post (no auth required)
 * Used for SSR hydration and unauthenticated views
 */
export function usePublicPost(postId: string, initialData?: any) {
  return useQuery({
    queryKey: ["publicPost", postId],
    queryFn: async () => {
      return orpc.feed.getPublicPost.call({ postId });
    },
    enabled: !!postId,
    initialData,
    staleTime: initialData ? 1000 * 60 : 0, // Keep initial data fresh for 1 minute
  });
}

/**
 * Hook to fetch replies for a post with infinite scroll (requires auth)
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
 * Hook to fetch PUBLIC replies for a post with infinite scroll (no auth required)
 */
export function usePublicPostReplies(postId: string, limit: number = 20, initialData?: any) {
  return useInfiniteQuery({
    queryKey: ["publicPostReplies", postId, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.feed.getPublicPostReplies.call({
        postId,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!postId,
    initialData: initialData ? { pages: [initialData], pageParams: [undefined] } : undefined,
  });
}

/**
 * Hook to fetch parent thread (ancestors) of a post (requires auth)
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

/**
 * Hook to fetch PUBLIC parent thread (ancestors) of a post (no auth required)
 */
export function usePublicPostThread(postId: string, initialData?: any) {
  return useQuery({
    queryKey: ["publicPostThread", postId],
    queryFn: async () => {
      return orpc.feed.getPublicPostThread.call({ postId });
    },
    enabled: !!postId,
    initialData,
    staleTime: initialData ? 1000 * 60 : 0,
  });
}

/**
 * Hook to fetch a user's profile
 */
export function useProfile(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      return orpc.feed.getProfile.call({ userId });
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch the current user's profile
 */
export function useMyProfile() {
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => {
      return orpc.feed.getMyProfile.call({});
    },
  });
}

/**
 * Hook to update privacy setting
 */
export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isPrivate: boolean) => {
      return orpc.feed.updatePrivacy.call({ isPrivate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Hook to fetch a user's posts with infinite scroll
 */
export function useUserPosts(userId: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["userPosts", userId, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.feed.getUserPosts.call({
        userId,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a user's reposts with infinite scroll
 */
export function useUserReposts(userId: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["userReposts", userId, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.feed.getUserReposts.call({
        userId,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a user's likes with infinite scroll
 */
export function useUserLikes(userId: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["userLikes", userId, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.feed.getUserLikes.call({
        userId,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!userId,
  });
}

