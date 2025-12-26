import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@repo/db";
import { follows, notifications } from "@repo/db/schema";
import { user } from "@repo/db/auth-schema";
import { eq, and, sql } from "drizzle-orm";
import { authorized, base } from "../middleware/auth";

export const toggleFollow = authorized
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ input, context }) => {
    const { userId: targetUserId } = input;
    const currentUserId = context.user.id;

    if (currentUserId === targetUserId) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot follow yourself" });
    }

    // Check if already following
    const existingFollow = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, currentUserId),
          eq(follows.followingId, targetUserId)
        )
      )
      .limit(1);

    if (existingFollow.length > 0) {
      // Unfollow - remove notification
      await Promise.all([
        db
          .delete(follows)
          .where(
            and(
              eq(follows.followerId, currentUserId),
              eq(follows.followingId, targetUserId)
            )
          ),
        db
          .delete(notifications)
          .where(
            and(
              eq(notifications.actorId, currentUserId),
              eq(notifications.userId, targetUserId),
              eq(notifications.type, "follow")
            )
          ),
      ]);
      return { following: false };
    } else {
      // Follow - create notification
      const id = crypto.randomUUID();
      await db.insert(follows).values({
        id,
        followerId: currentUserId,
        followingId: targetUserId,
      });

      // Create notification
      const notificationId = crypto.randomUUID();
      await db.insert(notifications).values({
        id: notificationId,
        userId: targetUserId,
        type: "follow",
        actorId: currentUserId,
        tweetId: null,
        isRead: false,
      });

      return { following: true };
    }
  });

export const isFollowing = authorized
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ input, context }) => {
    const { userId: targetUserId } = input;
    const currentUserId = context.user.id;

    const existingFollow = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, currentUserId),
          eq(follows.followingId, targetUserId)
        )
      )
      .limit(1);

    return { following: existingFollow.length > 0 };
  });

export const getFollowers = base
  .input(
    z.object({
      userId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    const { userId, limit, cursor } = input;

    const conditions = [eq(follows.followingId, userId)];
    if (cursor) {
      conditions.push(sql`${follows.createdAt} < ${new Date(cursor)}`);
    }

    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(user, eq(user.id, follows.followerId))
      .where(and(...conditions))
      .orderBy(sql`${follows.createdAt} DESC`)
      .limit(limit + 1);

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, -1) : result;
    const nextCursor = hasMore
      ? items[items.length - 1]?.createdAt.toISOString()
      : undefined;

    return {
      users: items,
      nextCursor,
    };
  });

export const getFollowing = base
  .input(
    z.object({
      userId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    const { userId, limit, cursor } = input;

    const conditions = [eq(follows.followerId, userId)];
    if (cursor) {
      conditions.push(sql`${follows.createdAt} < ${new Date(cursor)}`);
    }

    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(user, eq(user.id, follows.followingId))
      .where(and(...conditions))
      .orderBy(sql`${follows.createdAt} DESC`)
      .limit(limit + 1);

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, -1) : result;
    const nextCursor = hasMore
      ? items[items.length - 1]?.createdAt.toISOString()
      : undefined;

    return {
      users: items,
      nextCursor,
    };
  });

export const getStats = base
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const { userId } = input;

    const [followersCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const [followingCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return {
      followersCount: Number(followersCount?.count || 0),
      followingCount: Number(followingCount?.count || 0),
    };
  });

export const followsRouter = {
  toggle: toggleFollow,
  isFollowing: isFollowing,
  followers: getFollowers,
  following: getFollowing,
  stats: getStats,
};
