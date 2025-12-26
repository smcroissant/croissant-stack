import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { authorized, base } from '../middleware/auth'
import { schema } from '@repo/db'
import { db } from '@repo/db'
import { eq, desc, inArray, and, sql, count } from 'drizzle-orm'

const { posts, likes, reposts, follows, user } = schema

// Schemas
const CreatePostSchema = z.object({
  content: z.string().min(1).max(280),
  parentPostId: z.string().optional(),
})

const PostIdSchema = z.object({
  postId: z.string(),
})

const UserIdSchema = z.object({
  userId: z.string(),
})

const PaginationSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(), // cursor is the createdAt timestamp
})

// Get feed - posts from users the current user follows
export const getFeed = authorized
  .input(PaginationSchema)
  .handler(async ({ input, context }) => {
    const { limit, cursor } = input
    const userId = context.user.id

    // Get list of users the current user follows
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId))

    const followingIds = following.map(f => f.followingId)
    
    // Include the user's own posts in the feed
    const authorIds = [...followingIds, userId]

    if (authorIds.length === 0) {
      return { posts: [], nextCursor: undefined }
    }

    // Build the query for posts
    let postsQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(
        cursor
          ? and(
              inArray(posts.authorId, authorIds),
              sql`${posts.createdAt} < ${new Date(cursor)}`
            )
          : inArray(posts.authorId, authorIds)
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const feedPosts = await postsQuery

    // Determine if there are more posts
    const hasMore = feedPosts.length > limit
    const postsToReturn = hasMore ? feedPosts.slice(0, -1) : feedPosts
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.createdAt.toISOString() : undefined

    if (postsToReturn.length === 0) {
      return { posts: [], nextCursor: undefined }
    }

    const postIds = postsToReturn.map(p => p.id)

    // Get counts for likes, reposts, and replies
    const [likeCounts, repostCounts, replyCounts] = await Promise.all([
      db
        .select({ postId: likes.postId, count: count() })
        .from(likes)
        .where(inArray(likes.postId, postIds))
        .groupBy(likes.postId),
      db
        .select({ postId: reposts.postId, count: count() })
        .from(reposts)
        .where(inArray(reposts.postId, postIds))
        .groupBy(reposts.postId),
      db
        .select({ parentPostId: posts.parentPostId, count: count() })
        .from(posts)
        .where(inArray(posts.parentPostId, postIds))
        .groupBy(posts.parentPostId),
    ])

    // Check if current user liked/reposted each post
    const [userLikes, userReposts] = await Promise.all([
      db
        .select({ postId: likes.postId })
        .from(likes)
        .where(and(eq(likes.userId, userId), inArray(likes.postId, postIds))),
      db
        .select({ postId: reposts.postId })
        .from(reposts)
        .where(and(eq(reposts.userId, userId), inArray(reposts.postId, postIds))),
    ])

    const likeCountMap = new Map(likeCounts.map(l => [l.postId, l.count]))
    const repostCountMap = new Map(repostCounts.map(r => [r.postId, r.count]))
    const replyCountMap = new Map(replyCounts.map(r => [r.parentPostId, r.count]))
    const userLikedSet = new Set(userLikes.map(l => l.postId))
    const userRepostedSet = new Set(userReposts.map(r => r.postId))

    // Get parent post author info for replies
    const parentPostIds = postsToReturn
      .filter(p => p.parentPostId)
      .map(p => p.parentPostId as string)
    
    let parentAuthorMap = new Map<string, { authorName: string | null; authorEmail: string }>()
    
    if (parentPostIds.length > 0) {
      const parentPosts = await db
        .select({
          id: posts.id,
          authorName: user.name,
          authorEmail: user.email,
        })
        .from(posts)
        .innerJoin(user, eq(posts.authorId, user.id))
        .where(inArray(posts.id, parentPostIds))
      
      parentAuthorMap = new Map(parentPosts.map(p => [p.id, { authorName: p.authorName, authorEmail: p.authorEmail }]))
    }

    const enrichedPosts = postsToReturn.map(post => {
      const parentAuthor = post.parentPostId ? parentAuthorMap.get(post.parentPostId) : null
      return {
        ...post,
        likesCount: likeCountMap.get(post.id) ?? 0,
        repostsCount: repostCountMap.get(post.id) ?? 0,
        repliesCount: replyCountMap.get(post.id) ?? 0,
        isLiked: userLikedSet.has(post.id),
        isReposted: userRepostedSet.has(post.id),
        replyToAuthorName: parentAuthor?.authorName ?? null,
        replyToAuthorEmail: parentAuthor?.authorEmail ?? null,
      }
    })

    return { posts: enrichedPosts, nextCursor }
  })

// Create a new post
export const createPost = authorized
  .input(CreatePostSchema)
  .handler(async ({ input, context }) => {
    const newPost = await db.insert(posts).values({
      id: crypto.randomUUID(),
      content: input.content,
      authorId: context.user.id,
      parentPostId: input.parentPostId,
    }).returning()

    return newPost[0]
  })

// Like a post
export const likePost = authorized
  .input(PostIdSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id
    const { postId } = input

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
      .limit(1)

    if (existingLike) {
      // Unlike
      await db.delete(likes).where(eq(likes.id, existingLike.id))
      return { liked: false }
    }

    // Like
    await db.insert(likes).values({
      id: crypto.randomUUID(),
      userId,
      postId,
    })

    return { liked: true }
  })

// Repost a post
export const repostPost = authorized
  .input(PostIdSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id
    const { postId } = input

    // Check if already reposted
    const [existingRepost] = await db
      .select()
      .from(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)))
      .limit(1)

    if (existingRepost) {
      // Un-repost
      await db.delete(reposts).where(eq(reposts.id, existingRepost.id))
      return { reposted: false }
    }

    // Repost
    await db.insert(reposts).values({
      id: crypto.randomUUID(),
      userId,
      postId,
    })

    return { reposted: true }
  })

// Follow a user
export const followUser = authorized
  .input(UserIdSchema)
  .handler(async ({ input, context }) => {
    const followerId = context.user.id
    const { userId: followingId } = input

    if (followerId === followingId) {
      throw new ORPCError('BAD_REQUEST', { message: 'Cannot follow yourself' })
    }

    // Check if already following
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1)

    if (existingFollow) {
      // Unfollow
      await db.delete(follows).where(eq(follows.id, existingFollow.id))
      return { following: false }
    }

    // Follow
    await db.insert(follows).values({
      id: crypto.randomUUID(),
      followerId,
      followingId,
    })

    return { following: true }
  })

// Check if user is following another user
export const isFollowing = authorized
  .input(UserIdSchema)
  .handler(async ({ input, context }) => {
    const followerId = context.user.id
    const { userId: followingId } = input

    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1)

    return { following: !!existingFollow }
  })

// Get a single post by ID with user interaction status
export const getPost = authorized
  .input(PostIdSchema)
  .handler(async ({ input, context }) => {
    const { postId } = input
    const userId = context.user.id

    const [post] = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      throw new ORPCError('NOT_FOUND', { message: 'Post not found' })
    }

    // Get counts and user interaction status
    const [[likeCount], [repostCount], [replyCount], [userLike], [userRepost]] = await Promise.all([
      db.select({ count: count() }).from(likes).where(eq(likes.postId, postId)),
      db.select({ count: count() }).from(reposts).where(eq(reposts.postId, postId)),
      db.select({ count: count() }).from(posts).where(eq(posts.parentPostId, postId)),
      db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId))).limit(1),
      db.select().from(reposts).where(and(eq(reposts.userId, userId), eq(reposts.postId, postId))).limit(1),
    ])

    return {
      ...post,
      likesCount: likeCount?.count ?? 0,
      repostsCount: repostCount?.count ?? 0,
      repliesCount: replyCount?.count ?? 0,
      isLiked: !!userLike,
      isReposted: !!userRepost,
    }
  })

// Get replies for a post with pagination
export const getPostReplies = authorized
  .input(z.object({
    postId: z.string(),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { postId, limit, cursor } = input
    const userId = context.user.id

    // Fetch replies
    const repliesQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(
        cursor
          ? and(
              eq(posts.parentPostId, postId),
              sql`${posts.createdAt} < ${new Date(cursor)}`
            )
          : eq(posts.parentPostId, postId)
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const replies = await repliesQuery

    const hasMore = replies.length > limit
    const repliesToReturn = hasMore ? replies.slice(0, -1) : replies
    const nextCursor = hasMore ? repliesToReturn[repliesToReturn.length - 1]?.createdAt.toISOString() : undefined

    if (repliesToReturn.length === 0) {
      return { replies: [], nextCursor: undefined }
    }

    const replyIds = repliesToReturn.map(r => r.id)

    // Get counts for likes, reposts, and nested replies
    const [likeCounts, repostCounts, replyCounts] = await Promise.all([
      db
        .select({ postId: likes.postId, count: count() })
        .from(likes)
        .where(inArray(likes.postId, replyIds))
        .groupBy(likes.postId),
      db
        .select({ postId: reposts.postId, count: count() })
        .from(reposts)
        .where(inArray(reposts.postId, replyIds))
        .groupBy(reposts.postId),
      db
        .select({ parentPostId: posts.parentPostId, count: count() })
        .from(posts)
        .where(inArray(posts.parentPostId, replyIds))
        .groupBy(posts.parentPostId),
    ])

    // Check if current user liked/reposted each reply
    const [userLikes, userReposts] = await Promise.all([
      db
        .select({ postId: likes.postId })
        .from(likes)
        .where(and(eq(likes.userId, userId), inArray(likes.postId, replyIds))),
      db
        .select({ postId: reposts.postId })
        .from(reposts)
        .where(and(eq(reposts.userId, userId), inArray(reposts.postId, replyIds))),
    ])

    const likeCountMap = new Map(likeCounts.map(l => [l.postId, l.count]))
    const repostCountMap = new Map(repostCounts.map(r => [r.postId, r.count]))
    const replyCountMap = new Map(replyCounts.map(r => [r.parentPostId, r.count]))
    const userLikedSet = new Set(userLikes.map(l => l.postId))
    const userRepostedSet = new Set(userReposts.map(r => r.postId))

    const enrichedReplies = repliesToReturn.map(reply => ({
      ...reply,
      likesCount: likeCountMap.get(reply.id) ?? 0,
      repostsCount: repostCountMap.get(reply.id) ?? 0,
      repliesCount: replyCountMap.get(reply.id) ?? 0,
      isLiked: userLikedSet.has(reply.id),
      isReposted: userRepostedSet.has(reply.id),
    }))

    return { replies: enrichedReplies, nextCursor }
  })

// Get parent thread (all ancestors of a post)
export const getPostThread = authorized
  .input(PostIdSchema)
  .handler(async ({ input, context }) => {
    const { postId } = input
    const userId = context.user.id

    // Walk up the parent chain to get all ancestors
    const ancestors: Array<{
      id: string
      content: string
      authorId: string
      parentPostId: string | null
      createdAt: Date
      authorName: string | null
      authorEmail: string
      authorImage: string | null
    }> = []

    let currentPostId: string | null = postId
    const maxDepth = 50 // Prevent infinite loops

    // First, get the current post to find its parent
    const [currentPost] = await db
      .select({ parentPostId: posts.parentPostId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!currentPost) {
      throw new ORPCError('NOT_FOUND', { message: 'Post not found' })
    }

    currentPostId = currentPost.parentPostId

    // Walk up the parent chain
    let depth = 0
    while (currentPostId && depth < maxDepth) {
      const [parent] = await db
        .select({
          id: posts.id,
          content: posts.content,
          authorId: posts.authorId,
          parentPostId: posts.parentPostId,
          createdAt: posts.createdAt,
          authorName: user.name,
          authorEmail: user.email,
          authorImage: user.image,
        })
        .from(posts)
        .innerJoin(user, eq(posts.authorId, user.id))
        .where(eq(posts.id, currentPostId))
        .limit(1)

      if (!parent) break

      ancestors.unshift(parent) // Add to beginning to maintain chronological order
      currentPostId = parent.parentPostId
      depth++
    }

    if (ancestors.length === 0) {
      return { thread: [] }
    }

    const ancestorIds = ancestors.map(a => a.id)

    // Get counts for all ancestors
    const [likeCounts, repostCounts, replyCounts] = await Promise.all([
      db
        .select({ postId: likes.postId, count: count() })
        .from(likes)
        .where(inArray(likes.postId, ancestorIds))
        .groupBy(likes.postId),
      db
        .select({ postId: reposts.postId, count: count() })
        .from(reposts)
        .where(inArray(reposts.postId, ancestorIds))
        .groupBy(reposts.postId),
      db
        .select({ parentPostId: posts.parentPostId, count: count() })
        .from(posts)
        .where(inArray(posts.parentPostId, ancestorIds))
        .groupBy(posts.parentPostId),
    ])

    // Check if current user liked/reposted each ancestor
    const [userLikes, userReposts] = await Promise.all([
      db
        .select({ postId: likes.postId })
        .from(likes)
        .where(and(eq(likes.userId, userId), inArray(likes.postId, ancestorIds))),
      db
        .select({ postId: reposts.postId })
        .from(reposts)
        .where(and(eq(reposts.userId, userId), inArray(reposts.postId, ancestorIds))),
    ])

    const likeCountMap = new Map(likeCounts.map(l => [l.postId, l.count]))
    const repostCountMap = new Map(repostCounts.map(r => [r.postId, r.count]))
    const replyCountMap = new Map(replyCounts.map(r => [r.parentPostId, r.count]))
    const userLikedSet = new Set(userLikes.map(l => l.postId))
    const userRepostedSet = new Set(userReposts.map(r => r.postId))

    const enrichedThread = ancestors.map(post => ({
      ...post,
      likesCount: likeCountMap.get(post.id) ?? 0,
      repostsCount: repostCountMap.get(post.id) ?? 0,
      repliesCount: replyCountMap.get(post.id) ?? 0,
      isLiked: userLikedSet.has(post.id),
      isReposted: userRepostedSet.has(post.id),
    }))

    return { thread: enrichedThread }
  })

export const feedRouter = {
  getFeed,
  createPost,
  likePost,
  repostPost,
  followUser,
  isFollowing,
  getPost,
  getPostReplies,
  getPostThread,
}

