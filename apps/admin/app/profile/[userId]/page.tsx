"use client";

import { useState, useEffect } from "react";
import { TweetCard } from "../../components/tweet-card";
import { ComposeTweet } from "../../components/compose-tweet";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Avatar } from "@repo/ui/components/avatar";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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

interface ProfileStats {
  followersCount: number;
  followingCount: number;
}

export default function ProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const router = useRouter();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    followersCount: 0,
    followingCount: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToTweet, setReplyToTweet] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const userId = params.userId;

  useEffect(() => {
    loadProfile();
    checkFollowStatus();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [tweetsResponse, statsResponse] = await Promise.all([
        fetch("/api/rpc/tweets.list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, limit: 20, includeReplies: true }),
        }),
        fetch("/api/rpc/follows.stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }),
      ]);

      if (!tweetsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to load profile");
      }

      const tweetsData = await tweetsResponse.json();
      const statsData = await statsResponse.json();

      setTweets(
        tweetsData.tweets.map((tweet: any) => ({
          ...tweet,
          createdAt: new Date(tweet.createdAt),
        }))
      );
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch("/api/rpc/follows.isFollowing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following);
      }
    } catch (error) {
      console.error("Failed to check follow status:", error);
    }
  };

  const handleFollowToggle = async () => {
    setIsFollowLoading(true);
    try {
      const response = await fetch("/api/rpc/follows.toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle follow");
      }

      const data = await response.json();
      setIsFollowing(data.following);
      setStats((prev) => ({
        ...prev,
        followersCount: data.following
          ? prev.followersCount + 1
          : prev.followersCount - 1,
      }));
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setIsFollowLoading(false);
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

      await loadProfile();
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
    const tweet = tweets.find((t) => t.id === tweetId);
    if (tweet) {
      setReplyToTweet({ id: tweet.id, content: tweet.content });
      setIsComposeOpen(true);
    }
  };

  const userName = tweets[0]?.authorName || "Unknown User";
  const userEmail = tweets[0]?.authorEmail || "";

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
            <h1 className="text-xl font-bold">{userName}</h1>
            <p className="text-sm text-muted-foreground">
              {tweets.length} tweets
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="p-6 border-b">
            <div className="flex items-start justify-between mb-4">
              <Avatar className="w-20 h-20">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-medium">
                  {userName[0]?.toUpperCase() || "?"}
                </div>
              </Avatar>
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
              >
                {isFollowLoading
                  ? "Loading..."
                  : isFollowing
                  ? "Unfollow"
                  : "Follow"}
              </Button>
            </div>

            <div>
              <h2 className="text-xl font-bold">{userName}</h2>
              <p className="text-muted-foreground">
                @{userEmail.split("@")[0] || "unknown"}
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

          {tweets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">No tweets yet</p>
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
                  onAuthorClick={(authorId) =>
                    router.push(`/profile/${authorId}`)
                  }
                />
              ))}
            </div>
          )}
        </>
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
    </div>
  );
}
