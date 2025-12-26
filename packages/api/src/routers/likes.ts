import { z } from "zod";
import { db } from "@repo/db";
import { likes, tweets, notifications } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { authorized } from "../middleware/auth";

export const toggleLike = authorized
  .input(
    z.object({
      tweetId: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }) => {
    const { tweetId } = input;
    const userId = context.user.id;

    // Check if already liked
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.tweetId, tweetId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike - remove notification
      await Promise.all([
        db
          .delete(likes)
          .where(and(eq(likes.userId, userId), eq(likes.tweetId, tweetId))),
        db
          .delete(notifications)
          .where(
            and(
              eq(notifications.actorId, userId),
              eq(notifications.tweetId, tweetId),
              eq(notifications.type, "like")
            )
          ),
      ]);
      return { liked: false };
    } else {
      // Like - create notification
      const id = crypto.randomUUID();

      // Get tweet author to create notification
      const [tweet] = await db
        .select({ authorId: tweets.authorId })
        .from(tweets)
        .where(eq(tweets.id, tweetId))
        .limit(1);

      await db.insert(likes).values({
        id,
        userId,
        tweetId,
      });

      // Create notification if not liking own tweet
      if (tweet && tweet.authorId !== userId) {
        const notificationId = crypto.randomUUID();
        await db.insert(notifications).values({
          id: notificationId,
          userId: tweet.authorId,
          type: "like",
          actorId: userId,
          tweetId,
          isRead: false,
        });
      }

      return { liked: true };
    }
  });

export const likesRouter = {
  toggle: toggleLike,
};
