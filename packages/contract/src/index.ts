import { oc } from "@orpc/contract";
import { z } from "zod";

// Base contract with shared configuration
export const contract = oc;

// ============================================
// Shared Schemas
// ============================================

export const postSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  authorName: z.string().nullable(),
  authorEmail: z.string(),
  parentPostId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  likesCount: z.number(),
  repostsCount: z.number(),
  repliesCount: z.number(),
  isLiked: z.boolean(),
  isReposted: z.boolean(),
});

export const postWithEngagementSchema = postSchema.extend({
  engagementScore: z.number().optional(),
});

export const hashtagSchema = z.object({
  id: z.string(),
  name: z.string(),
  postCount: z.number(),
});

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  actorId: z.string(),
  actorName: z.string().nullable(),
  actorEmail: z.string(),
  postId: z.string().nullable(),
  postContent: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.coerce.date(),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  createdAt: z.coerce.date(),
});

// ============================================
// Posts Contract
// ============================================

export const postsContract = contract.router({
  list: contract
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        userId: z.string().optional(),
        includeReplies: z.boolean().default(true),
      })
    )
    .output(
      z.object({
        posts: z.array(postSchema),
        nextCursor: z.string().optional(),
      })
    ),

  feed: contract
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .output(
      z.object({
        posts: z.array(postSchema),
        nextCursor: z.string().optional(),
      })
    ),

  find: contract
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .output(
      postSchema.extend({
        replies: z.array(postSchema),
      })
    ),

  create: contract
    .input(
      z.object({
        content: z.string().min(1).max(280),
        parentPostId: z.string().uuid().optional(),
      })
    )
    .output(z.any()),

  delete: contract
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .output(z.object({ success: z.boolean() })),
});

// ============================================
// Likes Contract
// ============================================

export const likesContract = contract.router({
  toggle: contract
    .input(
      z.object({
        postId: z.string().uuid(),
      })
    )
    .output(z.object({ liked: z.boolean() })),
});

// ============================================
// Reposts Contract
// ============================================

export const repostsContract = contract.router({
  toggle: contract
    .input(
      z.object({
        postId: z.string().uuid(),
      })
    )
    .output(z.object({ reposted: z.boolean() })),
});

// ============================================
// Follows Contract
// ============================================

export const followsContract = contract.router({
  toggle: contract
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .output(z.object({ following: z.boolean() })),

  isFollowing: contract
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .output(z.object({ following: z.boolean() })),

  followers: contract
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .output(
      z.object({
        users: z.array(userSchema),
        nextCursor: z.string().optional(),
      })
    ),

  following: contract
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .output(
      z.object({
        users: z.array(userSchema),
        nextCursor: z.string().optional(),
      })
    ),

  stats: contract
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .output(
      z.object({
        followersCount: z.number(),
        followingCount: z.number(),
      })
    ),
});

// ============================================
// Trending Contract
// ============================================

export const trendingContract = contract.router({
  posts: contract
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        timeframe: z.enum(["24h", "7d", "30d"]).default("24h"),
      })
    )
    .output(
      z.object({
        posts: z.array(postWithEngagementSchema),
      })
    ),

  hashtags: contract
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .output(
      z.object({
        hashtags: z.array(hashtagSchema),
      })
    ),

  postsByHashtag: contract
    .input(
      z.object({
        hashtag: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .output(
      z.object({
        posts: z.array(postSchema),
      })
    ),
});

// ============================================
// Notifications Contract
// ============================================

export const notificationsContract = contract.router({
  list: contract
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        unreadOnly: z.boolean().optional().default(false),
      })
    )
    .output(
      z.object({
        notifications: z.array(notificationSchema),
      })
    ),

  unreadCount: contract.output(
    z.object({
      count: z.number(),
    })
  ),

  markAsRead: contract
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .output(z.object({ success: z.boolean() })),

  markAllAsRead: contract.output(z.object({ success: z.boolean() })),
});

// ============================================
// Planets Contract (kept for compatibility)
// ============================================

export const planetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  diameter: z.number().int().nullable(),
  mass: z.string().nullable(),
  distanceFromSun: z.string().nullable(),
  orbitalPeriod: z.string().nullable(),
  temperature: z.number().int().nullable(),
  moons: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const planetsContract = contract.router({
  list: contract.output(z.array(planetSchema)),
  find: contract
    .input(z.object({ id: z.string().uuid() }))
    .output(planetSchema.nullable()),
  create: contract
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        diameter: z.number().int().optional(),
        mass: z.string().optional(),
        distanceFromSun: z.string().optional(),
        orbitalPeriod: z.string().optional(),
        temperature: z.number().int().optional(),
        moons: z.number().int().optional(),
      })
    )
    .output(planetSchema),
});

// ============================================
// Main API Contract
// ============================================

export const apiContract = contract.router({
  planets: planetsContract,
  posts: postsContract,
  likes: likesContract,
  reposts: repostsContract,
  follows: followsContract,
  trending: trendingContract,
  notifications: notificationsContract,
});

// Export contract type for use in server and client
export type ApiContract = typeof apiContract;
