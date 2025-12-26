"use client";

import { useState } from "react";
import { PostCard } from "../components/post-card";
import { ComposePost } from "../components/compose-post";
import { AuthRequiredDialog } from "../components/auth-required-dialog";
import { Button } from "@repo/ui/components/button";
import { Feather } from "lucide-react";
import { useRouter } from "next/navigation";
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
}

// Fake posts data
const FAKE_POSTS: Post[] = [
  {
    id: "post-1",
    content: "Just shipped a new feature! Really excited about this one.",
    authorId: "user-1",
    authorName: "John Doe",
    authorEmail: "john@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
    likesCount: 5,
    repostsCount: 2,
    repliesCount: 1,
    isLiked: false,
    isReposted: false,
  },
  {
    id: "post-2",
    content: "Working on something exciting today! Can't wait to share more details soon.",
    authorId: "user-2",
    authorName: "Jane Smith",
    authorEmail: "jane@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    likesCount: 12,
    repostsCount: 3,
    repliesCount: 4,
    isLiked: true,
    isReposted: false,
  },
  {
    id: "post-3",
    content: "Great article about TypeScript best practices! Learned a lot from this.",
    authorId: "user-3",
    authorName: "Bob Johnson",
    authorEmail: "bob@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    likesCount: 8,
    repostsCount: 5,
    repliesCount: 2,
    isLiked: false,
    isReposted: true,
  },
  {
    id: "post-4",
    content: "The weather today is amazing! Perfect day for a walk in the park.",
    authorId: "user-4",
    authorName: "Alice Williams",
    authorEmail: "alice@example.com",
    parentPostId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    likesCount: 3,
    repostsCount: 0,
    repliesCount: 1,
    isLiked: false,
    isReposted: false,
  },
];

export default function FeedPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>(FAKE_POSTS);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [replyToPost, setReplyToPost] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const handleComposePost = async (
    content: string,
    parentPostId?: string
  ) => {
    // Simulate creating a post
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Home</h1>
          <Button size="sm" className="gap-2" onClick={handlePostClick}>
            <Feather className="w-4 h-4" />
            Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Your feed is empty. Follow some users to see their posts here.
          </p>
          <Button onClick={handlePostClick}>Create your first post</Button>
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
              onAuthorClick={handleAuthorClick}
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

      <AuthRequiredDialog
        open={showAuthRequired}
        onOpenChange={setShowAuthRequired}
      />
    </div>
  );
}
