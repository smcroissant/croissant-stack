import { z } from "zod";
import { db } from "@repo/db";
import { retweets, tweets, notifications } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { authorized } from "../middleware/auth";

export const toggleRetweet = authorized
  .input(
    z.object({
      tweetId: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }) => {
    const { tweetId } = input;
    const userId = context.user.id;

    // Check if already retweeted
    const existingRetweet = await db
      .select()
      .from(retweets)
      .where(and(eq(retweets.userId, userId), eq(retweets.tweetId, tweetId)))
      .limit(1);

    if (existingRetweet.length > 0) {
      // Unretweet - remove notification
      await Promise.all([
        db
          .delete(retweets)
          .where(
            and(eq(retweets.userId, userId), eq(retweets.tweetId, tweetId))
          ),
        db
          .delete(notifications)
          .where(
            and(
              eq(notifications.actorId, userId),
              eq(notifications.tweetId, tweetId),
              eq(notifications.type, "retweet")
            )
          ),
      ]);
      return { retweeted: false };
    } else {
      // Retweet - create notification
      const id = crypto.randomUUID();

      // Get tweet author to create notification
      const [tweet] = await db
        .select({ authorId: tweets.authorId })
        .from(tweets)
        .where(eq(tweets.id, tweetId))
        .limit(1);

      await db.insert(retweets).values({
        id,
        userId,
        tweetId,
      });

      // Create notification if not retweeting own tweet
      if (tweet && tweet.authorId !== userId) {
        const notificationId = crypto.randomUUID();
        await db.insert(notifications).values({
          id: notificationId,
          userId: tweet.authorId,
          type: "retweet",
          actorId: userId,
          tweetId,
          isRead: false,
        });
      }

      return { retweeted: true };
    }
  });

export const retweetsRouter = {
  toggle: toggleRetweet,
};
