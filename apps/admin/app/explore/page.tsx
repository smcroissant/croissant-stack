"use client";

import { useState } from "react";
import { PostCard } from "../components/post-card";
import { ComposePost } from "../components/compose-post";
import { AuthRequiredDialog } from "../components/auth-required-dialog";
import { TrendingHashtags } from "../components/trending-hashtags";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Feather, TrendingUp, Clock, Flame } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

interface Post {
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
  engagementScore?: number;
}

interface Hashtag {
  id: string;
  name: string;
  postCount: number;
}

// Fake trending posts
const FAKE_TRENDING_POSTS: Post[] = [
  {
    id: "trending-1",
    content: "This new framework is absolutely amazing! #webdev #javascript",
    authorId: "user-1",
    authorName: "John Doe",
    authorEmail: "john@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    likesCount: 42,
    repostsCount: 18,
    repliesCount: 5,
    isLiked: false,
    isReposted: false,
    engagementScore: 78, // 42*1 + 18*2
  },
  {
    id: "trending-2",
    content: "Just launched our new product! Check it out #startup #tech",
    authorId: "user-2",
    authorName: "Jane Smith",
    authorEmail: "jane@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    likesCount: 38,
    repostsCount: 15,
    repliesCount: 8,
    isLiked: true,
    isReposted: false,
    engagementScore: 68,
  },
  {
    id: "trending-3",
    content: "Great tips for improving React performance #react #optimization",
    authorId: "user-3",
    authorName: "Bob Johnson",
    authorEmail: "bob@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    likesCount: 35,
    repostsCount: 12,
    repliesCount: 6,
    isLiked: false,
    isReposted: true,
    engagementScore: 59,
  },
  {
    id: "trending-4",
    content: "Beautiful sunset today! Nature never disappoints #photography",
    authorId: "user-4",
    authorName: "Alice Williams",
    authorEmail: "alice@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
    likesCount: 28,
    repostsCount: 10,
    repliesCount: 3,
    isLiked: false,
    isReposted: false,
    engagementScore: 48,
  },
];

// Fake hashtags
const FAKE_HASHTAGS: Hashtag[] = [
  { id: "1", name: "webdev", postCount: 1250 },
  { id: "2", name: "javascript", postCount: 980 },
  { id: "3", name: "react", postCount: 850 },
  { id: "4", name: "typescript", postCount: 720 },
  { id: "5", name: "startup", postCount: 650 },
  { id: "6", name: "tech", postCount: 580 },
  { id: "7", name: "programming", postCount: 520 },
  { id: "8", name: "design", postCount: 450 },
  { id: "9", name: "ai", postCount: 420 },
  { id: "10", name: "nextjs", postCount: 380 },
];

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const [posts, setPosts] = useState<Post[]>(FAKE_TRENDING_POSTS);
  const [hashtags] = useState<Hashtag[]>(FAKE_HASHTAGS);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [replyToPost, setReplyToPost] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const hashtagParam = searchParams?.get("hashtag");

  // Filter posts by hashtag if param exists
  const filteredPosts = hashtagParam
    ? posts.filter((post) =>
        post.content.toLowerCase().includes(`#${hashtagParam.toLowerCase()}`)
      )
    : posts;

  const handleComposePost = async (
    content: string,
    parentPostId?: string
  ) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      content,
      authorId: session?.user.id || "current-user",
      authorName: session?.user.name || "Current User",
      authorEmail: session?.user.email || "user@example.com",
      parentPostId: parentPostId || null,
      createdAt: new Date(),
      likesCount: 0,
      repostsCount: 0,
      repliesCount: 0,
      isLiked: false,
      isReposted: false,
    };

    setPosts([newPost, ...posts]);
    setReplyToPost(null);
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked
                ? post.likesCount - 1
                : post.likesCount + 1,
            }
          : post
      )
    );
  };

  const handleRepost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isReposted: !post.isReposted,
              repostsCount: post.isReposted
                ? post.repostsCount - 1
                : post.repostsCount + 1,
            }
          : post
      )
    );
  };

  const handleReply = (postId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    const post = posts.find((t) => t.id === postId);
    if (post) {
      setReplyToPost({ id: post.id, content: post.content });
      setIsComposeOpen(true);
    }
  };

  const handlePostClick = () => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    setReplyToPost(null);
    setIsComposeOpen(true);
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/profile/${authorId}`);
  };

  const clearHashtagFilter = () => {
    router.push("/explore");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            {hashtagParam ? `#${hashtagParam}` : "Trending"}
          </h1>
          <Button size="sm" className="gap-2" onClick={handlePostClick}>
            <Feather className="w-4 h-4" />
            Post
          </Button>
        </div>

        {!hashtagParam && (
          <div className="px-4 pb-3">
            <Tabs
              value={timeframe}
              onValueChange={(v) => setTimeframe(v as any)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="24h" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  24 Hours
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
        )}

        {hashtagParam && (
          <div className="px-4 pb-3">
            <Button variant="outline" size="sm" onClick={clearHashtagFilter}>
              ← Back to Trending
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="lg:col-span-2">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {hashtagParam
                  ? `No posts found for #${hashtagParam}`
                  : "No trending posts yet"}
              </p>
              <Button onClick={handlePostClick}>Create the first post</Button>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredPosts.map((post, index) => (
                <div key={post.id} className="relative">
                  {post.engagementScore !== undefined && !hashtagParam && (
                    <div className="absolute left-0 top-4 bg-orange-500 text-white px-2 py-1 rounded-r-md text-xs font-bold flex items-center gap-1 z-10">
                      <Flame className="w-3 h-3" />
                      #{index + 1}
                    </div>
                  )}
                  <PostCard
                    post={post}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onReply={handleReply}
                    onAuthorClick={handleAuthorClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {!hashtagParam && (
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <TrendingHashtags hashtags={hashtags} />
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
