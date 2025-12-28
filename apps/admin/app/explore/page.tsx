"use client";

import { useState, useEffect, useRef } from "react";
import { PostCard } from "../components/post-card";
import { ComposePost } from "../components/compose-post";
import { AuthRequiredDialog } from "../components/auth-required-dialog";
import { TrendingHashtags } from "../components/trending-hashtags";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/components/card";
import { Avatar } from "@repo/ui/components/avatar";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Badge } from "@repo/ui/components/badge";
import {
  Feather,
  TrendingUp,
  Clock,
  Flame,
  Search,
  Users,
  Hash,
  Compass,
  X,
  UserPlus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers/auth-provider";
import {
  useTrendingPosts,
  useTrendingHashtags,
  usePostsByHashtag,
  useSearchPosts,
  useSearchUsers,
  useSuggestedUsers,
  useDiscoverFeed,
  useExploreLikePost,
  useExploreRepostPost,
  useExploreFollowUser,
} from "../hooks";

// Custom hook for intersection observer
function useIntersectionObserver() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return { ref, inView };
}

// Debounce hook for search
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Loading skeleton for posts
function PostSkeleton() {
  return (
    <Card className="p-4 border-b border-x-0 border-t-0 rounded-none">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-8 mt-3">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// User card component for search results and suggestions
function UserCard({
  user,
  onFollow,
  onProfileClick,
  isFollowing,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean;
    isOwnProfile: boolean;
  };
  onFollow: (userId: string) => void;
  onProfileClick: (userId: string) => void;
  isFollowing?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors border-b last:border-b-0">
      <div
        className="flex items-center gap-3 cursor-pointer flex-1"
        onClick={() => onProfileClick(user.id)}
      >
        <Avatar className="w-12 h-12">
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-medium">
            {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
          </div>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {user.name || "Unknown"}
            </span>
            {user.isPrivate && (
              <Badge variant="secondary" className="text-xs">
                Private
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            @{user.email.split("@")[0]}
          </p>
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span>
              <strong>{user.followersCount}</strong> followers
            </span>
            <span>
              <strong>{user.postsCount}</strong> posts
            </span>
          </div>
        </div>
      </div>
      {!user.isOwnProfile && (
        <Button
          variant={user.isFollowing ? "outline" : "default"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onFollow(user.id);
          }}
          className="ml-2"
        >
          {user.isFollowing ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  // State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "search" | "discover">("trending");
  const [searchTab, setSearchTab] = useState<"posts" | "users" | "hashtags">("posts");
  const [replyToPost, setReplyToPost] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const hashtagParam = searchParams?.get("hashtag");
  const debouncedSearch = useDebounceValue(searchQuery, 300);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useIntersectionObserver();

  // Hooks for data fetching
  const trendingPostsQuery = useTrendingPosts(timeframe);
  const trendingHashtagsQuery = useTrendingHashtags(10);
  const hashtagPostsQuery = usePostsByHashtag(hashtagParam || "", 20);
  const searchPostsQuery = useSearchPosts(debouncedSearch, 20);
  const searchUsersQuery = useSearchUsers(debouncedSearch, 20);
  const suggestedUsersQuery = useSuggestedUsers(5);
  const discoverFeedQuery = useDiscoverFeed(20);

  // Mutations
  const likeMutation = useExploreLikePost();
  const repostMutation = useExploreRepostPost();
  const followMutation = useExploreFollowUser();

  // Infinite scroll effect
  useEffect(() => {
    if (inView) {
      if (hashtagParam && hashtagPostsQuery.hasNextPage && !hashtagPostsQuery.isFetchingNextPage) {
        hashtagPostsQuery.fetchNextPage();
      } else if (activeTab === "trending" && trendingPostsQuery.hasNextPage && !trendingPostsQuery.isFetchingNextPage) {
        trendingPostsQuery.fetchNextPage();
      } else if (activeTab === "discover" && discoverFeedQuery.hasNextPage && !discoverFeedQuery.isFetchingNextPage) {
        discoverFeedQuery.fetchNextPage();
      } else if (activeTab === "search" && debouncedSearch) {
        if (searchTab === "posts" && searchPostsQuery.hasNextPage && !searchPostsQuery.isFetchingNextPage) {
          searchPostsQuery.fetchNextPage();
        } else if (searchTab === "users" && searchUsersQuery.hasNextPage && !searchUsersQuery.isFetchingNextPage) {
          searchUsersQuery.fetchNextPage();
        }
      }
    }
  }, [inView, hashtagParam, activeTab, searchTab, debouncedSearch]);

  // Reset search when tab changes
  useEffect(() => {
    if (activeTab !== "search") {
      setSearchQuery("");
    }
  }, [activeTab]);

  // Get flattened posts from infinite query
  const getTrendingPosts = () => {
    return trendingPostsQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  };

  const getHashtagPosts = () => {
    return hashtagPostsQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  };

  const getSearchPosts = () => {
    return searchPostsQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  };

  const getSearchUsers = () => {
    return searchUsersQuery.data?.pages.flatMap((page) => page.users) ?? [];
  };

  const getDiscoverPosts = () => {
    return discoverFeedQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  };

  // Get hashtags from query
  const getHashtags = () => {
    return trendingHashtagsQuery.data?.hashtags ?? [];
  };

  // Get suggested users
  const getSuggestedUsers = () => {
    return suggestedUsersQuery.data?.users ?? [];
  };

  // Handlers
  const handleLike = async (postId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    await likeMutation.mutateAsync(postId);
  };

  const handleRepost = async (postId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    await repostMutation.mutateAsync(postId);
  };

  const handleReply = (postId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    // Find the post to get its content
    const allPosts = [...getTrendingPosts(), ...getHashtagPosts(), ...getSearchPosts(), ...getDiscoverPosts()];
    const post = allPosts.find((p) => p.id === postId);
    if (post) {
      setReplyToPost({ id: post.id, content: post.content });
      setIsComposeOpen(true);
    }
  };

  const handlePostClick = (postId: string) => {
    router.push(`/feed/${postId}`);
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/profile/${authorId}`);
  };

  const handleFollow = async (userId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    await followMutation.mutateAsync(userId);
  };

  const handleComposePost = async (
    content: string,
    parentPostId?: string
  ) => {
    // This would call createPost mutation
    setReplyToPost(null);
    setIsComposeOpen(false);
  };

  const handleNewPost = () => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    setReplyToPost(null);
    setIsComposeOpen(true);
  };

  const clearHashtagFilter = () => {
    router.push("/explore");
  };

  // Render posts with loading state
  const renderPosts = (
    posts: any[],
    isLoading: boolean,
    isFetchingNextPage: boolean,
    showRanking: boolean = false
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">No posts found</p>
          <Button onClick={handleNewPost}>Create the first post</Button>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {posts.map((post, index) => (
          <div key={post.id} className="relative">
            {showRanking && post.engagementScore !== undefined && (
              <div className="absolute left-0 top-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-1 rounded-r-lg text-xs font-bold flex items-center gap-1.5 z-10 shadow-md">
                <Flame className="w-3.5 h-3.5" />
                #{index + 1}
              </div>
            )}
            <PostCard
              post={{
                ...post,
                authorName: post.authorName || "Unknown",
              }}
              onLike={handleLike}
              onRepost={handleRepost}
              onReply={handleReply}
              onAuthorClick={handleAuthorClick}
              onPostClick={handlePostClick}
            />
          </div>
        ))}
        {isFetchingNextPage && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={loadMoreRef} className="h-1" />
      </div>
    );
  };

  // If viewing a specific hashtag
  if (hashtagParam) {
    const hashtagInfo = hashtagPostsQuery.data?.pages[0]?.hashtag;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={clearHashtagFilter}>
                <X className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Hash className="w-5 h-5 text-primary" />
                  {hashtagParam}
                </h1>
                {hashtagInfo && (
                  <p className="text-sm text-muted-foreground">
                    {hashtagInfo.postCount.toLocaleString()} posts
                  </p>
                )}
              </div>
            </div>
            <Button size="sm" className="gap-2" onClick={handleNewPost}>
              <Feather className="w-4 h-4" />
              Post
            </Button>
          </div>
        </div>

        {renderPosts(
          getHashtagPosts(),
          hashtagPostsQuery.isLoading,
          hashtagPostsQuery.isFetchingNextPage,
          false
        )}

        <ComposePost
          open={isComposeOpen}
          onOpenChange={(open) => {
            setIsComposeOpen(open);
            if (!open) setReplyToPost(null);
          }}
          onSubmit={handleComposePost}
          parentPostId={replyToPost?.id}
          parentPostContent={replyToPost?.content}
        />

        <AuthRequiredDialog
          open={showAuthRequired}
          onOpenChange={setShowAuthRequired}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            Explore
          </h1>
          <Button size="sm" className="gap-2" onClick={handleNewPost}>
            <Feather className="w-4 h-4" />
            Post
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="px-4 pb-2"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Discover
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Main content area */}
        <div className="lg:col-span-2">
          {/* Trending Tab */}
          {activeTab === "trending" && (
            <>
              <div className="mb-4">
                <Tabs
                  value={timeframe}
                  onValueChange={(v) => setTimeframe(v as any)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="24h" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      24h
                    </TabsTrigger>
                    <TabsTrigger value="7d" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      7 Days
                    </TabsTrigger>
                    <TabsTrigger value="30d" className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      30 Days
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {renderPosts(
                getTrendingPosts(),
                trendingPostsQuery.isLoading,
                trendingPostsQuery.isFetchingNextPage,
                true
              )}
            </>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <>
              <div className="mb-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search posts, users, or hashtags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {debouncedSearch && (
                  <Tabs
                    value={searchTab}
                    onValueChange={(v) => setSearchTab(v as any)}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="posts" className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Posts
                      </TabsTrigger>
                      <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Users
                      </TabsTrigger>
                      <TabsTrigger value="hashtags" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Tags
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>

              {!debouncedSearch ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Search for posts, users, or hashtags
                  </p>
                </div>
              ) : (
                <>
                  {searchTab === "posts" &&
                    renderPosts(
                      getSearchPosts(),
                      searchPostsQuery.isLoading,
                      searchPostsQuery.isFetchingNextPage,
                      false
                    )}

                  {searchTab === "users" && (
                    <Card>
                      {searchUsersQuery.isLoading ? (
                        <div className="p-4 space-y-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="w-12 h-12 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                              </div>
                              <Skeleton className="h-9 w-20" />
                            </div>
                          ))}
                        </div>
                      ) : getSearchUsers().length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                          <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">No users found</p>
                        </div>
                      ) : (
                        <div>
                          {getSearchUsers().map((user) => (
                            <UserCard
                              key={user.id}
                              user={user}
                              onFollow={handleFollow}
                              onProfileClick={handleAuthorClick}
                            />
                          ))}
                          {searchUsersQuery.isFetchingNextPage && (
                            <div className="flex justify-center p-4">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          <div ref={loadMoreRef} className="h-1" />
                        </div>
                      )}
                    </Card>
                  )}

                  {searchTab === "hashtags" && (
                    <Card>
                      <CardContent className="p-0">
                        {getHashtags()
                          .filter((h) =>
                            h.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                          )
                          .map((hashtag, index) => (
                            <button
                              key={hashtag.id}
                              onClick={() => router.push(`/explore?hashtag=${hashtag.name}`)}
                              className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold">#{hashtag.name}</span>
                                  <p className="text-sm text-muted-foreground">
                                    {hashtag.postCount.toLocaleString()} posts
                                  </p>
                                </div>
                                <Hash className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </button>
                          ))}
                        {getHashtags().filter((h) =>
                          h.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Hash className="w-12 h-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No hashtags found</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* Discover Tab */}
          {activeTab === "discover" && (
            <>
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Posts you might like
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Discover content from people you don&apos;t follow yet
                  </p>
                </CardContent>
              </Card>
              {renderPosts(
                getDiscoverPosts(),
                discoverFeedQuery.isLoading,
                discoverFeedQuery.isFetchingNextPage,
                false
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Trending Hashtags */}
          <TrendingHashtags
            hashtags={getHashtags().map((h) => ({
              id: h.id,
              name: h.name,
              postCount: h.postCount,
            }))}
          />

          {/* Suggested Users */}
          {getSuggestedUsers().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Who to follow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {getSuggestedUsers().map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => handleAuthorClick(user.id)}
                      >
                        <Avatar className="w-10 h-10">
                          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-medium">
                            {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                          </div>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {user.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.email.split("@")[0]}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(user.id);
                        }}
                      >
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <ComposePost
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) setReplyToPost(null);
        }}
        onSubmit={handleComposePost}
        parentPostId={replyToPost?.id}
        parentPostContent={replyToPost?.content}
      />

      {/* Auth Required Dialog */}
      <AuthRequiredDialog
        open={showAuthRequired}
        onOpenChange={setShowAuthRequired}
      />
    </div>
  );
}
