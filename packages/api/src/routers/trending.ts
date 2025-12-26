import { os } from "@orpc/server";
import { z } from "zod";
import { db } from "@repo/db";
import { tweets, likes, retweets, hashtags, tweetHashtags } from "@repo/db/schema";
import { user } from "@repo/db/auth-schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { base } from "../middleware/auth";

export const getTrendingTweets = base
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
      timeframe: z.enum(["24h", "7d", "30d"]).default("24h"),
    })
  )
  .handler(async ({ input }) => {
    const { limit, timeframe } = input;

    // Calculate time threshold
    const now = new Date();
    const timeThresholds = {
      "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };
    const timeThreshold = timeThresholds[timeframe];

    // Get trending tweets based on engagement (likes + retweets)
    const trendingTweets = await db
      .select({
        id: tweets.id,
        content: tweets.content,
        authorId: tweets.authorId,
        authorName: user.name,
        authorEmail: user.email,
        parentTweetId: tweets.parentTweetId,
        createdAt: tweets.createdAt,
        updatedAt: tweets.updatedAt,
        likesCount: sql<number>`COUNT(DISTINCT ${likes.id})`,
        retweetsCount: sql<number>`COUNT(DISTINCT ${retweets.id})`,
        engagementScore: sql<number>`(COUNT(DISTINCT ${likes.id}) * 1 + COUNT(DISTINCT ${retweets.id}) * 2)`,
      })
      .from(tweets)
      .innerJoin(user, eq(tweets.authorId, user.id))
      .leftJoin(likes, eq(tweets.id, likes.tweetId))
      .leftJoin(retweets, eq(tweets.id, retweets.tweetId))
      .where(gte(tweets.createdAt, timeThreshold))
      .groupBy(tweets.id, user.id, user.name, user.email)
      .orderBy(desc(sql`(COUNT(DISTINCT ${likes.id}) * 1 + COUNT(DISTINCT ${retweets.id}) * 2)`))
      .limit(limit);

    // Get reply counts for each tweet
    const tweetIds = trendingTweets.map((t) => t.id);
    const replyCounts = tweetIds.length > 0
      ? await db
          .select({
            parentId: tweets.parentTweetId,
            count: sql<number>`COUNT(*)`,
          })
          .from(tweets)
          .where(sql`${tweets.parentTweetId} IN (${sql.join(tweetIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(tweets.parentTweetId)
      : [];

    const replyCountsMap = new Map(
      replyCounts.map((r) => [r.parentId, Number(r.count)])
    );

    return {
      tweets: trendingTweets.map((tweet) => ({
        ...tweet,
        likesCount: Number(tweet.likesCount),
        retweetsCount: Number(tweet.retweetsCount),
        repliesCount: replyCountsMap.get(tweet.id) || 0,
        engagementScore: Number(tweet.engagementScore),
        isLiked: false,
        isRetweeted: false,
      })),
    };
  });

export const getTrendingHashtags = base
  .input(
    z.object({
      limit: z.number().min(1).max(20).default(10),
    })
  )
  .handler(async ({ input }) => {
    const { limit } = input;

    const trendingHashtags = await db
      .select({
        id: hashtags.id,
        name: hashtags.name,
        tweetCount: hashtags.tweetCount,
      })
      .from(hashtags)
      .orderBy(desc(hashtags.tweetCount))
      .limit(limit);

    return {
      hashtags: trendingHashtags.map((tag) => ({
        ...tag,
        tweetCount: Number(tag.tweetCount),
      })),
    };
  });

export const getTweetsByHashtag = base
  .input(
    z.object({
      hashtag: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    })
  )
  .handler(async ({ input }) => {
    const { hashtag, limit } = input;

    // Remove # if present
    const cleanHashtag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;

    const tweetsWithHashtag = await db
      .select({
        id: tweets.id,
        content: tweets.content,
        authorId: tweets.authorId,
        authorName: user.name,
        authorEmail: user.email,
        parentTweetId: tweets.parentTweetId,
        createdAt: tweets.createdAt,
        updatedAt: tweets.updatedAt,
      })
      .from(tweets)
      .innerJoin(user, eq(tweets.authorId, user.id))
      .innerJoin(tweetHashtags, eq(tweets.id, tweetHashtags.tweetId))
      .innerJoin(hashtags, eq(tweetHashtags.hashtagId, hashtags.id))
      .where(eq(hashtags.name, cleanHashtag))
      .orderBy(desc(tweets.createdAt))
      .limit(limit);

    // Get counts for each tweet
    const tweetIds = tweetsWithHashtag.map((t) => t.id);
    const [likesData, retweetsData, repliesData] = await Promise.all([
      tweetIds.length > 0
        ? db
            .select({ tweetId: likes.tweetId, count: sql<number>`COUNT(*)` })
            .from(likes)
            .where(sql`${likes.tweetId} IN (${sql.join(tweetIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(likes.tweetId)
        : Promise.resolve([]),
      tweetIds.length > 0
        ? db
            .select({
              tweetId: retweets.tweetId,
              count: sql<number>`COUNT(*)`,
            })
            .from(retweets)
            .where(sql`${retweets.tweetId} IN (${sql.join(tweetIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(retweets.tweetId)
        : Promise.resolve([]),
      tweetIds.length > 0
        ? db
            .select({
              parentId: tweets.parentTweetId,
              count: sql<number>`COUNT(*)`,
            })
            .from(tweets)
            .where(sql`${tweets.parentTweetId} IN (${sql.join(tweetIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(tweets.parentTweetId)
        : Promise.resolve([]),
    ]);

    const likesMap = new Map(likesData.map((l: any) => [l.tweetId, Number(l.count)]));
    const retweetsMap = new Map(retweetsData.map((r: any) => [r.tweetId, Number(r.count)]));
    const repliesMap = new Map(repliesData.map((r: any) => [r.parentId, Number(r.count)]));

    return {
      tweets: tweetsWithHashtag.map((tweet) => ({
        ...tweet,
        likesCount: likesMap.get(tweet.id) || 0,
        retweetsCount: retweetsMap.get(tweet.id) || 0,
        repliesCount: repliesMap.get(tweet.id) || 0,
        isLiked: false,
        isRetweeted: false,
      })),
    };
  });

export const trendingRouter = {
  tweets: getTrendingTweets,
  hashtags: getTrendingHashtags,
  tweetsByHashtag: getTweetsByHashtag,
};
