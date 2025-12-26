import { user, account, verification, session, sessionRelations, accountRelations, userRelations} from "./auth-schema";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planets = pgTable("planets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Tweets table
export const tweets = pgTable("tweets", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  parentTweetId: text("parent_tweet_id"), // For replies
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  authorIdx: index("tweets_author_idx").on(table.authorId),
  parentIdx: index("tweets_parent_idx").on(table.parentTweetId),
  createdAtIdx: index("tweets_created_at_idx").on(table.createdAt),
}));

// Likes table
export const likes = pgTable("likes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userTweetIdx: index("likes_user_tweet_idx").on(table.userId, table.tweetId),
  tweetIdx: index("likes_tweet_idx").on(table.tweetId),
}));

// Retweets table
export const retweets = pgTable("retweets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userTweetIdx: index("retweets_user_tweet_idx").on(table.userId, table.tweetId),
  tweetIdx: index("retweets_tweet_idx").on(table.tweetId),
}));

// Follows table
export const follows = pgTable("follows", {
  id: text("id").primaryKey(),
  followerId: text("follower_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  followerFollowingIdx: index("follows_follower_following_idx").on(table.followerId, table.followingId),
  followingIdx: index("follows_following_idx").on(table.followingId),
}));

// Relations
export const tweetsRelations = relations(tweets, ({ one, many }) => ({
  author: one(user, {
    fields: [tweets.authorId],
    references: [user.id],
  }),
  parentTweet: one(tweets, {
    fields: [tweets.parentTweetId],
    references: [tweets.id],
    relationName: "replies",
  }),
  replies: many(tweets, {
    relationName: "replies",
  }),
  likes: many(likes),
  retweets: many(retweets),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(user, {
    fields: [likes.userId],
    references: [user.id],
  }),
  tweet: one(tweets, {
    fields: [likes.tweetId],
    references: [tweets.id],
  }),
}));

export const retweetsRelations = relations(retweets, ({ one }) => ({
  user: one(user, {
    fields: [retweets.userId],
    references: [user.id],
  }),
  tweet: one(tweets, {
    fields: [retweets.tweetId],
    references: [tweets.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(user, {
    fields: [follows.followerId],
    references: [user.id],
    relationName: "following",
  }),
  following: one(user, {
    fields: [follows.followingId],
    references: [user.id],
    relationName: "followers",
  }),
}));

export const extendedUserRelations = relations(user, ({ many }) => ({
  tweets: many(tweets),
  likes: many(likes),
  retweets: many(retweets),
  followers: many(follows, { relationName: "followers" }),
  following: many(follows, { relationName: "following" }),
}));

export const schema = {
  user,
  account,
  verification,
  session,
  sessionRelations,
  accountRelations,
  userRelations,
  tweets,
  tweetsRelations,
  likes,
  likesRelations,
  retweets,
  retweetsRelations,
  follows,
  followsRelations,
  extendedUserRelations,
}