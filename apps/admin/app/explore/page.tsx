"use client";

import { useState, useEffect } from "react";
import { TweetCard } from "../components/tweet-card";
import { ComposeTweet } from "../components/compose-tweet";
import { AuthRequiredDialog } from "../components/auth-required-dialog";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Feather } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

interface Tweet {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  parentTweetId: string | null;
  createdAt: Date;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
  isLiked: boolean;
  isRetweeted: boolean;
}

export default function ExplorePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [replyToTweet, setReplyToTweet] = useState<{
    id: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    loadTweets();
  }, []);

  const loadTweets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/rpc/tweets.list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 50, includeReplies: false }),
      });

      if (!response.ok) {
        throw new Error("Failed to load tweets");
      }

      const data = await response.json();
      setTweets(
        data.tweets.map((tweet: any) => ({
          ...tweet,
          createdAt: new Date(tweet.createdAt),
        }))
      );
    } catch (error) {
      console.error("Failed to load tweets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComposeTweet = async (
    content: string,
    parentTweetId?: string
  ) => {
    try {
      const response = await fetch("/api/rpc/tweets.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, parentTweetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create tweet");
      }

      await loadTweets();
      setReplyToTweet(null);
    } catch (error) {
      console.error("Failed to create tweet:", error);
      throw error;
    }
  };

  const handleLike = async (tweetId: string) => {
    try {
      const response = await fetch("/api/rpc/likes.toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      throw error;
    }
  };

  const handleRetweet = async (tweetId: string) => {
    try {
      const response = await fetch("/api/rpc/retweets.toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle retweet");
      }
    } catch (error) {
      console.error("Failed to toggle retweet:", error);
      throw error;
    }
  };

  const handleReply = (tweetId: string) => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    const tweet = tweets.find((t) => t.id === tweetId);
    if (tweet) {
      setReplyToTweet({ id: tweet.id, content: tweet.content });
      setIsComposeOpen(true);
    }
  };

  const handleTweetClick = () => {
    if (!session) {
      setShowAuthRequired(true);
      return;
    }
    setReplyToTweet(null);
    setIsComposeOpen(true);
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/profile/${authorId}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Explore</h1>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleTweetClick}
          >
            <Feather className="w-4 h-4" />
            Tweet
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      ) : tweets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground mb-4">No tweets yet</p>
          <Button onClick={handleTweetClick}>
            Post the first tweet
          </Button>
        </div>
      ) : (
        <div>
          {tweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              onLike={handleLike}
              onRetweet={handleRetweet}
              onReply={handleReply}
              onAuthorClick={handleAuthorClick}
            />
          ))}
        </div>
      )}

      <ComposeTweet
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) {
            setReplyToTweet(null);
          }
        }}
        onSubmit={handleComposeTweet}
        parentTweetId={replyToTweet?.id}
        parentTweetContent={replyToTweet?.content}
      />

      <AuthRequiredDialog
        open={showAuthRequired}
        onOpenChange={setShowAuthRequired}
      />
    </div>
  );
}
