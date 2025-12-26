import { os, ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@repo/db";
import { tweets, likes, retweets, follows, notifications } from "@repo/db/schema";
import { user } from "@repo/db/auth-schema";
import { eq, and, desc, inArray, sql, isNull } from "drizzle-orm";
import { authorized, base } from "../middleware/auth";

export const listTweets = base
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      userId: z.string().optional(),
      includeReplies: z.boolean().default(true),
    })
  )
  .handler(async ({ input, context }) => {
    const { limit, cursor, userId, includeReplies } = input;

    const conditions = [];
    if (userId) {
      conditions.push(eq(tweets.authorId, userId));
    }
    if (!includeReplies) {
      conditions.push(isNull(tweets.parentTweetId));
    }
    if (cursor) {
      conditions.push(sql`${tweets.createdAt} < ${new Date(cursor)}`);
    }

    const result = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tweets.createdAt))
      .limit(limit + 1);

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, -1) : result;
    const nextCursor = hasMore
      ? items[items.length - 1]?.createdAt.toISOString()
      : undefined;

    // Get counts for each tweet
    const tweetIds = items.map((t) => t.id);
    const [likesData, retweetsData, repliesData] = await Promise.all([
      db
        .select({ tweetId: likes.tweetId, count: sql<number>`COUNT(*)` })
        .from(likes)
        .where(inArray(likes.tweetId, tweetIds))
        .groupBy(likes.tweetId),
      db
        .select({ tweetId: retweets.tweetId, count: sql<number>`COUNT(*)` })
        .from(retweets)
        .where(inArray(retweets.tweetId, tweetIds))
        .groupBy(retweets.tweetId),
      db
        .select({
          parentId: tweets.parentTweetId,
          count: sql<number>`COUNT(*)`,
        })
        .from(tweets)
        .where(inArray(tweets.parentTweetId!, tweetIds))
        .groupBy(tweets.parentTweetId),
    ]);

    const likesMap = new Map(likesData.map((l) => [l.tweetId, Number(l.count)]));
    const retweetsMap = new Map(retweetsData.map((r) => [r.tweetId, Number(r.count)]));
    const repliesMap = new Map(repliesData.map((r) => [r.parentId, Number(r.count)]));

    const tweetsWithCounts = items.map((tweet) => ({
      ...tweet,
      likesCount: likesMap.get(tweet.id) || 0,
      retweetsCount: retweetsMap.get(tweet.id) || 0,
      repliesCount: repliesMap.get(tweet.id) || 0,
      isLiked: false,
      isRetweeted: false,
    }));

    return {
      tweets: tweetsWithCounts,
      nextCursor,
    };
  });

export const feedTweets = authorized
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const { limit, cursor } = input;
    const userId = context.user.id;

    // Get list of users the current user follows
    const followingUsers = await db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followingIds = followingUsers.map((f) => f.id);

    if (followingIds.length === 0) {
      return { tweets: [], nextCursor: undefined };
    }

    const conditions = [inArray(tweets.authorId, followingIds)];
    if (cursor) {
      conditions.push(sql`${tweets.createdAt} < ${new Date(cursor)}`);
    }

    const result = await db
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
      .where(and(...conditions))
      .orderBy(desc(tweets.createdAt))
      .limit(limit + 1);

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, -1) : result;
    const nextCursor = hasMore
      ? items[items.length - 1]?.createdAt.toISOString()
      : undefined;

    // Get counts for each tweet
    const tweetIds = items.map((t) => t.id);
    const [likesData, retweetsData, repliesData, userLikes, userRetweets] =
      await Promise.all([
        db
          .select({ tweetId: likes.tweetId, count: sql<number>`COUNT(*)` })
          .from(likes)
          .where(inArray(likes.tweetId, tweetIds))
          .groupBy(likes.tweetId),
        db
          .select({ tweetId: retweets.tweetId, count: sql<number>`COUNT(*)` })
          .from(retweets)
          .where(inArray(retweets.tweetId, tweetIds))
          .groupBy(retweets.tweetId),
        db
          .select({
            parentId: tweets.parentTweetId,
            count: sql<number>`COUNT(*)`,
          })
          .from(tweets)
          .where(inArray(tweets.parentTweetId!, tweetIds))
          .groupBy(tweets.parentTweetId),
        db
          .select({ tweetId: likes.tweetId })
          .from(likes)
          .where(and(eq(likes.userId, userId), inArray(likes.tweetId, tweetIds))),
        db
          .select({ tweetId: retweets.tweetId })
          .from(retweets)
          .where(
            and(eq(retweets.userId, userId), inArray(retweets.tweetId, tweetIds))
          ),
      ]);

    const likesMap = new Map(likesData.map((l) => [l.tweetId, Number(l.count)]));
    const retweetsMap = new Map(retweetsData.map((r) => [r.tweetId, Number(r.count)]));
    const repliesMap = new Map(repliesData.map((r) => [r.parentId, Number(r.count)]));
    const userLikesSet = new Set(userLikes.map((l) => l.tweetId));
    const userRetweetsSet = new Set(userRetweets.map((r) => r.tweetId));

    const tweetsWithCounts = items.map((tweet) => ({
      ...tweet,
      likesCount: likesMap.get(tweet.id) || 0,
      retweetsCount: retweetsMap.get(tweet.id) || 0,
      repliesCount: repliesMap.get(tweet.id) || 0,
      isLiked: userLikesSet.has(tweet.id),
      isRetweeted: userRetweetsSet.has(tweet.id),
    }));

    return {
      tweets: tweetsWithCounts,
      nextCursor,
    };
  });

export const findTweet = base
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input }) => {
    const { id } = input;

    const [tweet] = await db
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
      .where(eq(tweets.id, id))
      .limit(1);

    if (!tweet) {
      throw new ORPCError("NOT_FOUND", { message: "Tweet not found" });
    }

    // Get counts and replies
    const [[likesCount], [retweetsCount], [repliesCount], repliesData] =
      await Promise.all([
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(likes)
          .where(eq(likes.tweetId, id)),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(retweets)
          .where(eq(retweets.tweetId, id)),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(tweets)
          .where(eq(tweets.parentTweetId, id)),
        db
          .select({
            id: tweets.id,
            content: tweets.content,
            authorId: tweets.authorId,
            authorName: user.name,
            authorEmail: user.email,
            createdAt: tweets.createdAt,
            updatedAt: tweets.updatedAt,
          })
          .from(tweets)
          .innerJoin(user, eq(tweets.authorId, user.id))
          .where(eq(tweets.parentTweetId, id))
          .orderBy(desc(tweets.createdAt)),
      ]);

    // Get counts for replies
    const replyIds = repliesData.map((r) => r.id);
    const [replyLikesData, replyRetweetsData, replyRepliesData] =
      await Promise.all([
        replyIds.length > 0
          ? db
              .select({
                tweetId: likes.tweetId,
                count: sql<number>`COUNT(*)`,
              })
              .from(likes)
              .where(inArray(likes.tweetId, replyIds))
              .groupBy(likes.tweetId)
          : Promise.resolve([]),
        replyIds.length > 0
          ? db
              .select({
                tweetId: retweets.tweetId,
                count: sql<number>`COUNT(*)`,
              })
              .from(retweets)
              .where(inArray(retweets.tweetId, replyIds))
              .groupBy(retweets.tweetId)
          : Promise.resolve([]),
        replyIds.length > 0
          ? db
              .select({
                parentId: tweets.parentTweetId,
                count: sql<number>`COUNT(*)`,
              })
              .from(tweets)
              .where(inArray(tweets.parentTweetId!, replyIds))
              .groupBy(tweets.parentTweetId)
          : Promise.resolve([]),
      ]);

    const replyLikesMap = new Map(
      replyLikesData.map((l: any) => [l.tweetId, Number(l.count)])
    );
    const replyRetweetsMap = new Map(
      replyRetweetsData.map((r: any) => [r.tweetId, Number(r.count)])
    );
    const replyRepliesMap = new Map(
      replyRepliesData.map((r: any) => [r.parentId, Number(r.count)])
    );

    const repliesWithCounts = repliesData.map((reply) => ({
      ...reply,
      likesCount: replyLikesMap.get(reply.id) || 0,
      retweetsCount: replyRetweetsMap.get(reply.id) || 0,
      repliesCount: replyRepliesMap.get(reply.id) || 0,
      isLiked: false,
      isRetweeted: false,
    }));

    return {
      ...tweet,
      likesCount: Number(likesCount?.count || 0),
      retweetsCount: Number(retweetsCount?.count || 0),
      repliesCount: Number(repliesCount?.count || 0),
      isLiked: false,
      isRetweeted: false,
      replies: repliesWithCounts,
    };
  });

export const createTweet = authorized
  .input(
    z.object({
      content: z.string().min(1).max(280),
      parentTweetId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const { content, parentTweetId } = input;
    const userId = context.user.id;

    const id = crypto.randomUUID();

    const [newTweet] = await db
      .insert(tweets)
      .values({
        id,
        content,
        authorId: userId,
        parentTweetId: parentTweetId || null,
      })
      .returning();

    // Create notification for reply
    if (parentTweetId) {
      const [parentTweet] = await db
        .select({ authorId: tweets.authorId })
        .from(tweets)
        .where(eq(tweets.id, parentTweetId))
        .limit(1);

      if (parentTweet && parentTweet.authorId !== userId) {
        const notificationId = crypto.randomUUID();
        await db.insert(notifications).values({
          id: notificationId,
          userId: parentTweet.authorId,
          type: "reply",
          actorId: userId,
          tweetId: id,
          isRead: false,
        });
      }
    }

    return newTweet;
  });

export const deleteTweet = authorized
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }) => {
    const { id } = input;
    const userId = context.user.id;

    // Check if the tweet belongs to the user
    const [tweet] = await db
      .select()
      .from(tweets)
      .where(and(eq(tweets.id, id), eq(tweets.authorId, userId)))
      .limit(1);

    if (!tweet) {
      throw new ORPCError("NOT_FOUND", {
        message: "Tweet not found or unauthorized",
      });
    }

    await db.delete(tweets).where(eq(tweets.id, id));

    return { success: true };
  });

export const tweetsRouter = {
  list: listTweets,
  feed: feedTweets,
  find: findTweet,
  create: createTweet,
  delete: deleteTweet,
};
