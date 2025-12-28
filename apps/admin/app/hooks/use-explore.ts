"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";

export interface ExplorePost {
  id: string;
  content: string;
  authorId: string;
  parentPostId: string | null;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string;
  authorImage: string | null;
  authorIsPrivate: boolean;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  isLiked: boolean;
  isReposted: boolean;
  engagementScore?: number;
}

export interface ExploreHashtag {
  id: string;
  name: string;
  postCount: number;
  createdAt: Date;
}

export interface ExploreUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isPrivate: boolean;
  createdAt: Date;
  isFollowing: boolean;
  isOwnProfile: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

/**
 * Hook to fetch trending posts with infinite scroll
 */
export function useTrendingPosts(
  timeframe: "24h" | "7d" | "30d" = "24h",
  limit: number = 20
) {
  return useInfiniteQuery({
    queryKey: ["trendingPosts", timeframe, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.explore.getTrendingPosts.call({
        limit,
        timeframe,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

/**
 * Hook to fetch trending hashtags
 */
export function useTrendingHashtags(limit: number = 10) {
  return useQuery({
    queryKey: ["trendingHashtags", limit],
    queryFn: async () => {
      return orpc.explore.getTrendingHashtags.call({ limit });
    },
  });
}

/**
 * Hook to fetch posts by hashtag with infinite scroll
 */
export function usePostsByHashtag(hashtag: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["postsByHashtag", hashtag, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.explore.getPostsByHashtag.call({
        hashtag,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!hashtag,
  });
}

/**
 * Hook to search posts with infinite scroll
 */
export function useSearchPosts(query: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["searchPosts", query, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.explore.searchPosts.call({
        query,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: query.length >= 1,
  });
}

/**
 * Hook to search users with infinite scroll
 */
export function useSearchUsers(query: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["searchUsers", query, limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.explore.searchUsers.call({
        query,
        limit,
        cursor: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: query.length >= 1,
  });
}

/**
 * Hook to fetch suggested users to follow
 */
export function useSuggestedUsers(limit: number = 5) {
  return useQuery({
    queryKey: ["suggestedUsers", limit],
    queryFn: async () => {
      return orpc.explore.getSuggestedUsers.call({ limit });
    },
  });
}

/**
 * Hook to fetch discover feed (posts from users you don't follow)
 */
export function useDiscoverFeed(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["discoverFeed", limit],
    queryFn: async ({ pageParam }) => {
      const result = await orpc.explore.getDiscoverFeed.call({
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
 * Hook to handle like with optimistic update for explore posts
 */
export function useExploreLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return orpc.feed.likePost.call({ postId });
    },
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["trendingPosts"] });
      await queryClient.cancelQueries({ queryKey: ["searchPosts"] });
      await queryClient.cancelQueries({ queryKey: ["postsByHashtag"] });
      await queryClient.cancelQueries({ queryKey: ["discoverFeed"] });

      // Helper to update posts in infinite query
      const updateInfiniteQuery = (queryKey: string[]) => {
        queryClient.setQueriesData({ queryKey }, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map((post: ExplorePost) =>
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
      };

      updateInfiniteQuery(["trendingPosts"]);
      updateInfiniteQuery(["searchPosts"]);
      updateInfiniteQuery(["postsByHashtag"]);
      updateInfiniteQuery(["discoverFeed"]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trendingPosts"] });
      queryClient.invalidateQueries({ queryKey: ["searchPosts"] });
      queryClient.invalidateQueries({ queryKey: ["postsByHashtag"] });
      queryClient.invalidateQueries({ queryKey: ["discoverFeed"] });
    },
  });
}

/**
 * Hook to handle repost with optimistic update for explore posts
 */
export function useExploreRepostPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return orpc.feed.repostPost.call({ postId });
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["trendingPosts"] });
      await queryClient.cancelQueries({ queryKey: ["searchPosts"] });
      await queryClient.cancelQueries({ queryKey: ["postsByHashtag"] });
      await queryClient.cancelQueries({ queryKey: ["discoverFeed"] });

      const updateInfiniteQuery = (queryKey: string[]) => {
        queryClient.setQueriesData({ queryKey }, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map((post: ExplorePost) =>
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
      };

      updateInfiniteQuery(["trendingPosts"]);
      updateInfiniteQuery(["searchPosts"]);
      updateInfiniteQuery(["postsByHashtag"]);
      updateInfiniteQuery(["discoverFeed"]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trendingPosts"] });
      queryClient.invalidateQueries({ queryKey: ["searchPosts"] });
      queryClient.invalidateQueries({ queryKey: ["postsByHashtag"] });
      queryClient.invalidateQueries({ queryKey: ["discoverFeed"] });
    },
  });
}

/**
 * Hook to follow user with optimistic update
 */
export function useExploreFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return orpc.feed.followUser.call({ userId });
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["suggestedUsers"] });
      await queryClient.cancelQueries({ queryKey: ["searchUsers"] });

      // Optimistically update suggested users
      queryClient.setQueryData(["suggestedUsers"], (old: any) => {
        if (!old?.users) return old;
        return {
          ...old,
          users: old.users.filter((user: ExploreUser) => user.id !== userId),
        };
      });

      // Optimistically update search users
      queryClient.setQueriesData({ queryKey: ["searchUsers"] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            users: page.users.map((user: ExploreUser) =>
              user.id === userId
                ? {
                    ...user,
                    isFollowing: !user.isFollowing,
                    followersCount: user.isFollowing
                      ? user.followersCount - 1
                      : user.followersCount + 1,
                  }
                : user
            ),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["searchUsers"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["discoverFeed"] });
    },
  });
}


