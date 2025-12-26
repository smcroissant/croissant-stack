"use client";

import { useState, use } from "react";
import { PostCard } from "../../components/post-card";
import { ComposePost } from "../../components/compose-post";
import { Button } from "@repo/ui/components/button";
import { Avatar } from "@repo/ui/components/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Switch } from "@repo/ui/components/switch";
import { Label } from "@repo/ui/components/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, Lock, Globe, Settings, Repeat2, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../providers/auth-provider";
import {
  useProfile,
  useUserPosts,
  useUserReposts,
  useUserLikes,
  useFollowUser,
  useLikePost,
  useRepostPost,
  useUpdatePrivacy,
} from "../../hooks";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;

  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { data: postsData, fetchNextPage: fetchMorePosts, hasNextPage: hasMorePosts, isFetchingNextPage: isFetchingPosts } = useUserPosts(userId);
  const { data: repostsData, fetchNextPage: fetchMoreReposts, hasNextPage: hasMoreReposts, isFetchingNextPage: isFetchingReposts } = useUserReposts(userId);
  const { data: likesData, fetchNextPage: fetchMoreLikes, hasNextPage: hasMoreLikes, isFetchingNextPage: isFetchingLikes } = useUserLikes(userId);

  const followMutation = useFollowUser();
  const likeMutation = useLikePost();
  const repostMutation = useRepostPost();
  const updatePrivacyMutation = useUpdatePrivacy();

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<{ id: string; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [showSettings, setShowSettings] = useState(false);

  const isOwnProfile = session?.user?.id === userId;

  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];
  const reposts = repostsData?.pages.flatMap((page) => page.posts) ?? [];
  const likedPosts = likesData?.pages.flatMap((page) => page.posts) ?? [];

  const handleFollowToggle = async () => {
    if (!profile) return;
    await followMutation.mutateAsync(userId);
  };

  const handleLike = async (postId: string) => {
    await likeMutation.mutateAsync(postId);
  };

  const handleRepost = async (postId: string) => {
    await repostMutation.mutateAsync(postId);
  };

  const handleReply = (postId: string) => {
    const post = posts.find((p) => p.id === postId) ?? 
                 reposts.find((p) => p.id === postId) ?? 
                 likedPosts.find((p) => p.id === postId);
    if (post) {
      setReplyToPost({ id: post.id, content: post.content });
      setIsComposeOpen(true);
    }
  };

  const handlePrivacyToggle = async (checked: boolean) => {
    await updatePrivacyMutation.mutateAsync(checked);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  // Check if content is viewable
  if (!profile.canViewContent && !isOwnProfile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{profile.name}</h1>
            </div>
          </div>
        </div>

        <div className="p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <Avatar className="w-20 h-20">
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-medium">
                {profile.name?.[0]?.toUpperCase() || "?"}
              </div>
            </Avatar>
            <Button
              variant={profile.isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleFollowToggle}
              disabled={followMutation.isPending}
            >
              {profile.isFollowing ? "Unfollow" : "Follow"}
            </Button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              @{profile.email?.split("@")[0] || "unknown"}
            </p>
          </div>

          <div className="flex gap-6 mt-4">
            <div>
              <span className="font-bold">{profile.followingCount}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold">{profile.followersCount}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">This account is private</h3>
          <p className="text-muted-foreground">
            Follow this account to see their posts, reposts, and likes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <p className="text-sm text-muted-foreground">
                {profile.postsCount} posts
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {isOwnProfile && showSettings && (
        <Card className="m-4 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Privacy Settings</CardTitle>
            <CardDescription>
              Control who can see your activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profile.isPrivate ? (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Globe className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="private-mode" className="font-medium">
                    Private Account
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.isPrivate
                      ? "Only followers can see your posts"
                      : "Anyone can see your posts"}
                  </p>
                </div>
              </div>
              <Switch
                id="private-mode"
                checked={profile.isPrivate}
                onCheckedChange={handlePrivacyToggle}
                disabled={updatePrivacyMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between mb-4">
          <Avatar className="w-20 h-20">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-medium">
              {profile.name?.[0]?.toUpperCase() || "?"}
            </div>
          </Avatar>
          {!isOwnProfile && (
            <Button
              variant={profile.isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleFollowToggle}
              disabled={followMutation.isPending}
            >
              {profile.isFollowing ? "Unfollow" : "Follow"}
            </Button>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{profile.name}</h2>
            {profile.isPrivate && <Lock className="w-4 h-4 text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground">
            @{profile.email?.split("@")[0] || "unknown"}
          </p>
        </div>

        <div className="flex gap-6 mt-4">
          <button className="hover:underline">
            <span className="font-bold">{profile.followingCount}</span>
            <span className="text-muted-foreground ml-1">Following</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold">{profile.followersCount}</span>
            <span className="text-muted-foreground ml-1">Followers</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="reposts"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            <Repeat2 className="w-4 h-4 mr-2" />
            Reposts
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            <Heart className="w-4 h-4 mr-2" />
            Likes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    ...post,
                    authorName: post.authorName ?? "Unknown",
                  }}
                  onLike={handleLike}
                  onRepost={handleRepost}
                  onReply={handleReply}
                  onAuthorClick={(authorId) => router.push(`/profile/${authorId}`)}
                  onPostClick={(postId) => router.push(`/feed/${postId}`)}
                />
              ))}
              {hasMorePosts && (
                <div className="flex justify-center p-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchMorePosts()}
                    disabled={isFetchingPosts}
                  >
                    {isFetchingPosts ? <Spinner className="w-4 h-4" /> : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reposts" className="mt-0">
          {reposts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">No reposts yet</p>
            </div>
          ) : (
            <div>
              {reposts.map((post) => (
                <div key={`repost-${post.id}`}>
                  <div className="px-4 pt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Repeat2 className="w-4 h-4" />
                    <span>{isOwnProfile ? "You" : profile.name} reposted</span>
                  </div>
                  <PostCard
                    post={{
                      ...post,
                      authorName: post.authorName ?? "Unknown",
                    }}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onReply={handleReply}
                    onAuthorClick={(authorId) => router.push(`/profile/${authorId}`)}
                    onPostClick={(postId) => router.push(`/feed/${postId}`)}
                  />
                </div>
              ))}
              {hasMoreReposts && (
                <div className="flex justify-center p-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchMoreReposts()}
                    disabled={isFetchingReposts}
                  >
                    {isFetchingReposts ? <Spinner className="w-4 h-4" /> : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="likes" className="mt-0">
          {likedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">No liked posts yet</p>
            </div>
          ) : (
            <div>
              {likedPosts.map((post) => (
                <div key={`like-${post.id}`}>
                  <div className="px-4 pt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span>{isOwnProfile ? "You" : profile.name} liked</span>
                  </div>
                  <PostCard
                    post={{
                      ...post,
                      authorName: post.authorName ?? "Unknown",
                    }}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onReply={handleReply}
                    onAuthorClick={(authorId) => router.push(`/profile/${authorId}`)}
                    onPostClick={(postId) => router.push(`/feed/${postId}`)}
                  />
                </div>
              ))}
              {hasMoreLikes && (
                <div className="flex justify-center p-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchMoreLikes()}
                    disabled={isFetchingLikes}
                  >
                    {isFetchingLikes ? <Spinner className="w-4 h-4" /> : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ComposePost
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) {
            setReplyToPost(null);
          }
        }}
        onSubmit={async () => {}}
        parentPostId={replyToPost?.id}
        parentPostContent={replyToPost?.content}
      />
    </div>
  );
}
