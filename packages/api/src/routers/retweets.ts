import { z } from "zod";
import { db } from "@repo/db";
import { retweets } from "@repo/db/schema";
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
      // Unretweet
      await db
        .delete(retweets)
        .where(
          and(eq(retweets.userId, userId), eq(retweets.tweetId, tweetId))
        );
      return { retweeted: false };
    } else {
      // Retweet
      const id = crypto.randomUUID();
      await db.insert(retweets).values({
        id,
        userId,
        tweetId,
      });
      return { retweeted: true };
    }
  });

export const retweetsRouter = {
  toggle: toggleRetweet,
};
