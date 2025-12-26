import { user, account, verification, session, sessionRelations, accountRelations, userRelations} from "./auth-schema";
import { pgTable, text, timestamp, index, boolean } from "drizzle-orm/pg-core";
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
}, (table) => [
  index("tweets_author_idx").on(table.authorId),
  index("tweets_parent_idx").on(table.parentTweetId),
  index("tweets_created_at_idx").on(table.createdAt),
]);

// Likes table
export const likes = pgTable("likes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("likes_user_tweet_idx").on(table.userId, table.tweetId),
  index("likes_tweet_idx").on(table.tweetId),
]);

// Retweets table
export const retweets = pgTable("retweets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("retweets_user_tweet_idx").on(table.userId, table.tweetId),
  index("retweets_tweet_idx").on(table.tweetId),
]);

// Follows table
export const follows = pgTable("follows", {
  id: text("id").primaryKey(),
  followerId: text("follower_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("follows_follower_following_idx").on(table.followerId, table.followingId),
  index("follows_following_idx").on(table.followingId),
]);

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

// Notifications table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'retweet', 'reply', 'follow'
  actorId: text("actor_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tweetId: text("tweet_id").references(() => tweets.id, { onDelete: "cascade" }), // nullable for follow notifications
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_idx").on(table.userId),
  index("notifications_user_read_idx").on(table.userId, table.isRead),
  index("notifications_created_at_idx").on(table.createdAt),
]);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
    relationName: "notifications",
  }),
  actor: one(user, {
    fields: [notifications.actorId],
    references: [user.id],
    relationName: "notificationActor",
  }),
  tweet: one(tweets, {
    fields: [notifications.tweetId],
    references: [tweets.id],
  }),
}));

// Hashtags table
export const hashtags = pgTable("hashtags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  tweetCount: text("tweet_count").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hashtags_name_idx").on(table.name),
]);

// Tweet hashtags junction table
export const tweetHashtags = pgTable("tweet_hashtags", {
  id: text("id").primaryKey(),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  hashtagId: text("hashtag_id").notNull().references(() => hashtags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tweet_hashtags_tweet_hashtag_idx").on(table.tweetId, table.hashtagId),
  index("tweet_hashtags_hashtag_idx").on(table.hashtagId),
]);

export const hashtagsRelations = relations(hashtags, ({ many }) => ({
  tweetHashtags: many(tweetHashtags),
}));

export const tweetHashtagsRelations = relations(tweetHashtags, ({ one }) => ({
  tweet: one(tweets, {
    fields: [tweetHashtags.tweetId],
    references: [tweets.id],
  }),
  hashtag: one(hashtags, {
    fields: [tweetHashtags.hashtagId],
    references: [hashtags.id],
  }),
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
  notifications,
  notificationsRelations,
  hashtags,
  hashtagsRelations,
  tweetHashtags,
  tweetHashtagsRelations,
}