import { z } from "zod";
import { db } from "@repo/db";
import { notifications, tweets } from "@repo/db/schema";
import { user } from "@repo/db/auth-schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authorized } from "../middleware/auth";

export const listNotifications = authorized
  .input(
    z.object({
      limit: z.number().min(1).max(100).optional().default(50),
      unreadOnly: z.boolean().optional().default(false),
    })
  )
  .handler(async ({ input, context }) => {
    const { limit, unreadOnly } = input;
    const userId = context.user.id;

    const whereClause = unreadOnly
      ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      : eq(notifications.userId, userId);

    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        actorId: notifications.actorId,
        actorName: user.name,
        actorEmail: user.email,
        tweetId: notifications.tweetId,
        tweetContent: tweets.content,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .innerJoin(user, eq(notifications.actorId, user.id))
      .leftJoin(tweets, eq(notifications.tweetId, tweets.id))
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return {
      notifications: userNotifications,
    };
  });

export const getUnreadCount = authorized.handler(async ({ context }) => {
  const userId = context.user.id;

  const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return {
    count: Number(result[0]?.count || 0),
  };
});

export const markAsRead = authorized
  .input(
    z.object({
      notificationId: z.string(),
    })
  )
  .handler(async ({ input, context }) => {
    const { notificationId } = input;
    const userId = context.user.id;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );

    return { success: true };
  });

export const markAllAsRead = authorized.handler(async ({ context }) => {
  const userId = context.user.id;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return { success: true };
});

export const notificationsRouter = {
  list: listNotifications,
  unreadCount: getUnreadCount,
  markAsRead: markAsRead,
  markAllAsRead: markAllAsRead,
};
