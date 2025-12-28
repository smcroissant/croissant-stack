import type { Metadata } from "next";
import { PostDetailClient, type PostDetailInitialData } from "./post-detail-client";

// Import server-side oRPC client - this sets up globalThis.$client
import "../../lib/orpc.server";
// Import type declaration for $client
import "../../lib/orpc";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

// Fetch public post data for SSR (only public posts)
async function getPublicPostData(postId: string): Promise<PostDetailInitialData | null> {
  if (!$client) return null;
  
  try {
    // Fetch post, thread, and replies in parallel using the server client
    const [post, threadData, repliesData] = await Promise.all([
      $client.feed.getPublicPost({ postId }),
      $client.feed.getPublicPostThread({ postId }).catch(() => ({ thread: [] })),
      $client.feed.getPublicPostReplies({ postId, limit: 20 }).catch(() => ({ replies: [], nextCursor: undefined })),
    ]);

    return {
      post,
      thread: threadData.thread,
      replies: repliesData,
    };
  } catch (error) {
    // Return null for private posts or not found
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "FORBIDDEN" || errorCode === "NOT_FOUND") {
      return null;
    }
    // For other errors, return null and let client handle
    console.error("Error fetching public post:", error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { postId } = await params;

  if (!$client) {
    return {
      title: "Post | Croissant",
      description: "View this post on Croissant",
    };
  }

  try {
    const post = await $client.feed.getPublicPost({ postId });

    const authorName = post.authorName || "Unknown";
    const contentPreview = post.content.length > 160 
      ? post.content.substring(0, 157) + "..." 
      : post.content;

    return {
      title: `${authorName} on Croissant: "${contentPreview}"`,
      description: post.content,
      openGraph: {
        title: `${authorName} on Croissant`,
        description: contentPreview,
        type: "article",
        authors: [authorName],
      },
      twitter: {
        card: "summary",
        title: `${authorName} on Croissant`,
        description: contentPreview,
      },
    };
  } catch {
    // For private posts or errors, return generic metadata
    return {
      title: "Post | Croissant",
      description: "View this post on Croissant",
    };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;

  // Fetch public post data for SSR
  const initialData = await getPublicPostData(postId);

  // If no public data available (private post), render without initial data
  // The client component will handle auth and fetching
  return <PostDetailClient postId={postId} initialData={initialData ?? undefined} />;
}
