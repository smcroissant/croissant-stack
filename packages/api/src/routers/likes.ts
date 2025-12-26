import { z } from "zod";
import { db } from "@repo/db";
import { likes } from "@repo/db/schema";
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
      // Unlike
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.tweetId, tweetId)));
      return { liked: false };
    } else {
      // Like
      const id = crypto.randomUUID();
      await db.insert(likes).values({
        id,
        userId,
        tweetId,
      });
      return { liked: true };
    }
  });

export const likesRouter = {
  toggle: toggleLike,
};
