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

// Posts table
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  parentPostId: text("parent_post_id"), // For replies
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("posts_author_idx").on(table.authorId),
  index("posts_parent_idx").on(table.parentPostId),
  index("posts_created_at_idx").on(table.createdAt),
]);

// Likes table
export const likes = pgTable("likes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("likes_user_post_idx").on(table.userId, table.postId),
  index("likes_post_idx").on(table.postId),
]);

// Reposts table
export const reposts = pgTable("reposts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("reposts_user_post_idx").on(table.userId, table.postId),
  index("reposts_post_idx").on(table.postId),
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
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(user, {
    fields: [posts.authorId],
    references: [user.id],
  }),
  parentPost: one(posts, {
    fields: [posts.parentPostId],
    references: [posts.id],
    relationName: "replies",
  }),
  replies: many(posts, {
    relationName: "replies",
  }),
  likes: many(likes),
  reposts: many(reposts),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(user, {
    fields: [likes.userId],
    references: [user.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const repostsRelations = relations(reposts, ({ one }) => ({
  user: one(user, {
    fields: [reposts.userId],
    references: [user.id],
  }),
  post: one(posts, {
    fields: [reposts.postId],
    references: [posts.id],
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
  posts: many(posts),
  likes: many(likes),
  reposts: many(reposts),
  followers: many(follows, { relationName: "followers" }),
  following: many(follows, { relationName: "following" }),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'repost', 'reply', 'follow'
  actorId: text("actor_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }), // nullable for follow notifications
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
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
}));

// Hashtags table
export const hashtags = pgTable("hashtags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  postCount: text("post_count").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hashtags_name_idx").on(table.name),
]);

// Post hashtags junction table
export const postHashtags = pgTable("post_hashtags", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  hashtagId: text("hashtag_id").notNull().references(() => hashtags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("post_hashtags_post_hashtag_idx").on(table.postId, table.hashtagId),
  index("post_hashtags_hashtag_idx").on(table.hashtagId),
]);

export const hashtagsRelations = relations(hashtags, ({ many }) => ({
  postHashtags: many(postHashtags),
}));

export const postHashtagsRelations = relations(postHashtags, ({ one }) => ({
  post: one(posts, {
    fields: [postHashtags.postId],
    references: [posts.id],
  }),
  hashtag: one(hashtags, {
    fields: [postHashtags.hashtagId],
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
  planets,
  posts,
  postsRelations,
  likes,
  likesRelations,
  reposts,
  repostsRelations,
  follows,
  followsRelations,
  extendedUserRelations,
  notifications,
  notificationsRelations,
  hashtags,
  hashtagsRelations,
  postHashtags,
  postHashtagsRelations,
}
