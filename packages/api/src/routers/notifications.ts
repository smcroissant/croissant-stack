import { os } from '@orpc/server'
import * as z from 'zod'
import { authorized } from '../middleware/auth'
import { schema } from '@repo/db'
import { db } from '@repo/db'
import { eq, desc, and, sql, count, inArray } from 'drizzle-orm'

const { notifications, posts, user } = schema

// Schemas
const PaginationSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

const NotificationIdSchema = z.object({
  notificationId: z.string(),
})

const CreateNotificationSchema = z.object({
  userId: z.string(), // The user receiving the notification
  type: z.enum(['like', 'repost', 'reply', 'follow']),
  postId: z.string().optional(), // Optional for follow notifications
})

// Get notifications for the current user
export const getNotifications = authorized
  .input(PaginationSchema)
  .handler(async ({ input, context }) => {
    const { limit, cursor } = input
    const userId = context.user.id

    const notificationsQuery = db
      .select({
        id: notifications.id,
        type: notifications.type,
        actorId: notifications.actorId,
        postId: notifications.postId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actorName: user.name,
        actorEmail: user.email,
        actorImage: user.image,
      })
      .from(notifications)
      .innerJoin(user, eq(notifications.actorId, user.id))
      .where(
        cursor
          ? and(
              eq(notifications.userId, userId),
              sql`${notifications.createdAt} < ${new Date(cursor)}`
            )
          : eq(notifications.userId, userId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1)

    const notificationResults = await notificationsQuery

    const hasMore = notificationResults.length > limit
    const notificationsToReturn = hasMore ? notificationResults.slice(0, -1) : notificationResults
    const nextCursor = hasMore ? notificationsToReturn[notificationsToReturn.length - 1]?.createdAt.toISOString() : undefined

    if (notificationsToReturn.length === 0) {
      return { notifications: [], nextCursor: undefined }
    }

    // Get post content for notifications that have a postId
    const postIds = notificationsToReturn
      .filter((n) => n.postId)
      .map((n) => n.postId as string)

    let postContentMap = new Map<string, string>()

    if (postIds.length > 0) {
      const postContents = await db
        .select({
          id: posts.id,
          content: posts.content,
        })
        .from(posts)
        .where(inArray(posts.id, postIds))

      postContentMap = new Map(postContents.map((p) => [p.id, p.content]))
    }

    const enrichedNotifications = notificationsToReturn.map((notification) => ({
      ...notification,
      postContent: notification.postId ? postContentMap.get(notification.postId) ?? null : null,
    }))

    return { notifications: enrichedNotifications, nextCursor }
  })

// Get unread notifications count
export const getUnreadCount = authorized
  .handler(async ({ context }) => {
    const userId = context.user.id

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return { count: result?.count ?? 0 }
  })

// Mark a notification as read
export const markAsRead = authorized
  .input(NotificationIdSchema)
  .handler(async ({ input, context }) => {
    const { notificationId } = input
    const userId = context.user.id

    // Verify the notification belongs to the user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1)

    if (!notification) {
      return { success: false }
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))

    return { success: true }
  })

// Mark all notifications as read
export const markAllAsRead = authorized
  .handler(async ({ context }) => {
    const userId = context.user.id

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return { success: true }
  })

// Create a notification (internal use - called when likes/reposts/follows/replies happen)
export const createNotification = authorized
  .input(CreateNotificationSchema)
  .handler(async ({ input, context }) => {
    const actorId = context.user.id
    const { userId, type, postId } = input

    // Don't create notification if user is notifying themselves
    if (userId === actorId) {
      return { success: false, reason: 'Cannot notify yourself' }
    }

    const newNotification = await db
      .insert(notifications)
      .values({
        id: crypto.randomUUID(),
        userId,
        type,
        actorId,
        postId: postId ?? null,
      })
      .returning()

    return { success: true, notification: newNotification[0] }
  })

// Delete a notification
export const deleteNotification = authorized
  .input(NotificationIdSchema)
  .handler(async ({ input, context }) => {
    const { notificationId } = input
    const userId = context.user.id

    // Verify the notification belongs to the user
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))

    return { success: true }
  })

// Clear all notifications for the user
export const clearAllNotifications = authorized
  .handler(async ({ context }) => {
    const userId = context.user.id

    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId))

    return { success: true }
  })

export const notificationsRouter = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  clearAllNotifications,
}

