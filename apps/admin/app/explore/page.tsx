"use client";

import { useState, useEffect } from "react";
import { TweetCard } from "../components/tweet-card";
import { ComposeTweet } from "../components/compose-tweet";
import { AuthRequiredDialog } from "../components/auth-required-dialog";
import { TrendingHashtags } from "../components/trending-hashtags";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Feather, TrendingUp, Clock, Flame } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
  engagementScore?: number;
}

interface Hashtag {
  id: string;
  name: string;
  tweetCount: number;
}

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [replyToTweet, setReplyToTweet] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const hashtagParam = searchParams?.get("hashtag");

  useEffect(() => {
    if (hashtagParam) {
      loadHashtagTweets(hashtagParam);
    } else {
      loadTrendingContent();
    }
  }, [timeframe, hashtagParam]);

  const loadTrendingContent = async () => {
    setIsLoading(true);
    try {
      const [tweetsResponse, hashtagsResponse] = await Promise.all([
        fetch("/api/rpc/trending.tweets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 30, timeframe }),
        }),
        fetch("/api/rpc/trending.hashtags", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 10 }),
        }),
      ]);

      if (!tweetsResponse.ok || !hashtagsResponse.ok) {
        throw new Error("Failed to load trending content");
      }

      const tweetsData = await tweetsResponse.json();
      const hashtagsData = await hashtagsResponse.json();

      setTweets(
        tweetsData.tweets.map((tweet: any) => ({
          ...tweet,
          createdAt: new Date(tweet.createdAt),
        }))
      );
      setHashtags(hashtagsData.hashtags);
    } catch (error) {
      console.error("Failed to load trending content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHashtagTweets = async (hashtag: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/rpc/trending.tweetsByHashtag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hashtag, limit: 50 }),
      });

      if (!response.ok) {
        throw new Error("Failed to load hashtag tweets");
      }

      const data = await response.json();
      setTweets(
        data.tweets.map((tweet: any) => ({
          ...tweet,
          createdAt: new Date(tweet.createdAt),
        }))
      );
    } catch (error) {
      console.error("Failed to load hashtag tweets:", error);
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

      if (hashtagParam) {
        await loadHashtagTweets(hashtagParam);
      } else {
        await loadTrendingContent();
      }
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
          <Button size="sm" className="gap-2" onClick={handleTweetClick}>
            <Feather className="w-4 h-4" />
            Tweet
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
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Spinner />
            </div>
          ) : tweets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {hashtagParam
                  ? `No tweets found for #${hashtagParam}`
                  : "No trending tweets yet"}
              </p>
              <Button onClick={handleTweetClick}>Post the first tweet</Button>
            </div>
          ) : (
            <div className="space-y-0">
              {tweets.map((tweet, index) => (
                <div key={tweet.id} className="relative">
                  {tweet.engagementScore !== undefined && (
                    <div className="absolute left-0 top-4 bg-orange-500 text-white px-2 py-1 rounded-r-md text-xs font-bold flex items-center gap-1 z-10">
                      <Flame className="w-3 h-3" />
                      #{index + 1}
                    </div>
                  )}
                  <TweetCard
                    tweet={tweet}
                    onLike={handleLike}
                    onRetweet={handleRetweet}
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
