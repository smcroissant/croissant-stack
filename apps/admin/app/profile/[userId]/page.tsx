"use client";

import { useState } from "react";
import { PostCard } from "../../components/post-card";
import { ComposePost } from "../../components/compose-post";
import { Button } from "@repo/ui/components/button";
import { Avatar } from "@repo/ui/components/avatar";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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
}

// Fake user profile data
const FAKE_USER_DATA = {
  "user-1": {
    name: "John Doe",
    email: "john@example.com",
    followersCount: 150,
    followingCount: 89,
    posts: [
      {
        id: "post-1",
        content: "Just shipped a new feature! Really excited about this one.",
        authorId: "user-1",
        authorName: "John Doe",
        authorEmail: "john@example.com",
        parentPostId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 10),
        likesCount: 5,
        repostsCount: 2,
        repliesCount: 1,
        isLiked: false,
        isReposted: false,
      },
      {
        id: "post-5",
        content: "Building something cool with Next.js and TypeScript today!",
        authorId: "user-1",
        authorName: "John Doe",
        authorEmail: "john@example.com",
        parentPostId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        likesCount: 10,
        repostsCount: 3,
        repliesCount: 2,
        isLiked: true,
        isReposted: false,
      },
    ],
  },
  "user-2": {
    name: "Jane Smith",
    email: "jane@example.com",
    followersCount: 320,
    followingCount: 105,
    posts: [
      {
        id: "post-2",
        content: "Working on something exciting today! Can't wait to share more details soon.",
        authorId: "user-2",
        authorName: "Jane Smith",
        authorEmail: "jane@example.com",
        parentPostId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        likesCount: 12,
        repostsCount: 3,
        repliesCount: 4,
        isLiked: true,
        isReposted: false,
      },
    ],
  },
  "user-3": {
    name: "Bob Johnson",
    email: "bob@example.com",
    followersCount: 75,
    followingCount: 52,
    posts: [
      {
        id: "post-3",
        content: "Great article about TypeScript best practices! Learned a lot from this.",
        authorId: "user-3",
        authorName: "Bob Johnson",
        authorEmail: "bob@example.com",
        parentPostId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
        likesCount: 8,
        repostsCount: 5,
        repliesCount: 2,
        isLiked: false,
        isReposted: true,
      },
    ],
  },
};

export default function ProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const router = useRouter();
  const userId = params.userId;

  const userData = FAKE_USER_DATA[userId as keyof typeof FAKE_USER_DATA] || {
    name: "Unknown User",
    email: "unknown@example.com",
    followersCount: 0,
    followingCount: 0,
    posts: [],
  };

  const [posts, setPosts] = useState<Post[]>(userData.posts);
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({
    followersCount: userData.followersCount,
    followingCount: userData.followingCount,
  });
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const handleFollowToggle = async () => {
    setIsFollowing(!isFollowing);
    setStats((prev) => ({
      ...prev,
      followersCount: isFollowing
        ? prev.followersCount - 1
        : prev.followersCount + 1,
    }));
  };

  const handleComposePost = async (
    content: string,
    parentPostId?: string
  ) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      content,
      authorId: userId,
      authorName: userData.name,
      authorEmail: userData.email,
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
    const post = posts.find((t) => t.id === postId);
    if (post) {
      setReplyToPost({ id: post.id, content: post.content });
      setIsComposeOpen(true);
    }
  };

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
            <h1 className="text-xl font-bold">{userData.name}</h1>
            <p className="text-sm text-muted-foreground">
              {posts.length} posts
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 border-b">
        <div className="flex items-start justify-between mb-4">
          <Avatar className="w-20 h-20">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-medium">
              {userData.name[0]?.toUpperCase() || "?"}
            </div>
          </Avatar>
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollowToggle}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </Button>
        </div>

        <div>
          <h2 className="text-xl font-bold">{userData.name}</h2>
          <p className="text-muted-foreground">
            @{userData.email.split("@")[0] || "unknown"}
          </p>
        </div>

        <div className="flex gap-6 mt-4">
          <button className="hover:underline">
            <span className="font-bold">{stats.followingCount}</span>
            <span className="text-muted-foreground ml-1">Following</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold">{stats.followersCount}</span>
            <span className="text-muted-foreground ml-1">Followers</span>
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">No posts yet</p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onRepost={handleRepost}
              onReply={handleReply}
              onAuthorClick={(authorId) => router.push(`/profile/${authorId}`)}
            />
          ))}
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
    </div>
  );
}
