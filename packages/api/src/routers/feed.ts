import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { authorized, base } from '../middleware/auth'
import { schema } from '@repo/db'
import { db } from '@repo/db'
import { eq, desc, inArray, and, sql, count, or } from 'drizzle-orm'

const { posts, likes, reposts, follows, user } = schema

// Helper: Check if current user can view a private user's content
// Returns true if: user is public, OR viewer is the author, OR viewer follows the author
async function canViewUserContent(authorId: string, viewerId: string, authorIsPrivate: boolean): Promise<boolean> {
  // Public users are always viewable
  if (!authorIsPrivate) return true
  
  // Users can always see their own content
  if (authorId === viewerId) return true
  
  // Check if viewer follows the private author
  const [followRecord] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, authorId)))
    .limit(1)
  
  return !!followRecord
}

// Helper: Get set of private user IDs that the viewer can see (follows + self)
async function getVisiblePrivateUserIds(viewerId: string): Promise<Set<string>> {
  const following = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerId))
  
  const visibleIds = new Set(following.map(f => f.followingId))
  visibleIds.add(viewerId) // User can always see their own content
  return visibleIds
}

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
    // Note: getFeed already correctly handles privacy since it only fetches from followed users + self
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
        authorIsPrivate: user.isPrivate,
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
    const userId = context.user.id

    // If this is a reply, check if user can view the parent post
    if (input.parentPostId) {
      const [parentPost] = await db
        .select({
          authorId: posts.authorId,
          authorIsPrivate: user.isPrivate,
        })
        .from(posts)
        .innerJoin(user, eq(posts.authorId, user.id))
        .where(eq(posts.id, input.parentPostId))
        .limit(1)

      if (!parentPost) {
        throw new ORPCError('NOT_FOUND', { message: 'Parent post not found' })
      }

      // Check if user can view the parent post (private profile check)
      const canView = await canViewUserContent(parentPost.authorId, userId, parentPost.authorIsPrivate)
      if (!canView) {
        throw new ORPCError('FORBIDDEN', { message: 'Cannot reply to posts from private accounts you don\'t follow' })
      }
    }

    const newPost = await db.insert(posts).values({
      id: crypto.randomUUID(),
      content: input.content,
      authorId: userId,
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

    // Get the post and check visibility
    const [post] = await db
      .select({
        authorId: posts.authorId,
        authorIsPrivate: user.isPrivate,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      throw new ORPCError('NOT_FOUND', { message: 'Post not found' })
    }

    // Check if user can view this post (private profile check)
    const canView = await canViewUserContent(post.authorId, userId, post.authorIsPrivate)
    if (!canView) {
      throw new ORPCError('FORBIDDEN', { message: 'Cannot interact with posts from private accounts you don\'t follow' })
    }

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

    // Get the post and check visibility
    const [post] = await db
      .select({
        authorId: posts.authorId,
        authorIsPrivate: user.isPrivate,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      throw new ORPCError('NOT_FOUND', { message: 'Post not found' })
    }

    // Check if user can view this post (private profile check)
    const canView = await canViewUserContent(post.authorId, userId, post.authorIsPrivate)
    if (!canView) {
      throw new ORPCError('FORBIDDEN', { message: 'Cannot interact with posts from private accounts you don\'t follow' })
    }

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
        authorIsPrivate: user.isPrivate,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      throw new ORPCError('NOT_FOUND', { message: 'Post not found' })
    }

    // Check visibility: private profiles only visible to followers
    const canView = await canViewUserContent(post.authorId, userId, post.authorIsPrivate)
    if (!canView) {
      throw new ORPCError('FORBIDDEN', { message: 'This post is from a private account' })
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

// Type for recursive nested replies
export type NestedReply = {
  id: string
  content: string
  authorId: string
  parentPostId: string | null
  createdAt: Date
  authorName: string | null
  authorEmail: string
  authorImage: string | null
  authorIsPrivate: boolean
  likesCount: number
  repostsCount: number
  repliesCount: number
  isLiked: boolean
  isReposted: boolean
  nestedReplies: NestedReply[]
}

// Get replies for a post with ALL nested replies (recursive)
export const getPostReplies = authorized
  .input(z.object({
    postId: z.string(),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { postId, limit, cursor } = input
    const userId = context.user.id

    // Get the set of private user IDs that this user can view
    const visiblePrivateUserIds = await getVisiblePrivateUserIds(userId)

    // Fetch direct replies first (only from public users or followed private users)
    const directRepliesQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
        authorIsPrivate: user.isPrivate,
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

    const directRepliesRaw = await directRepliesQuery
    
    // Filter out private users that the viewer doesn't follow
    const directReplies = directRepliesRaw.filter(reply => 
      !reply.authorIsPrivate || visiblePrivateUserIds.has(reply.authorId)
    )

    const hasMore = directReplies.length > limit
    const repliesToReturn = hasMore ? directReplies.slice(0, -1) : directReplies
    const nextCursor = hasMore ? repliesToReturn[repliesToReturn.length - 1]?.createdAt.toISOString() : undefined

    if (repliesToReturn.length === 0) {
      return { replies: [], nextCursor: undefined }
    }

    // Recursive function to fetch all descendants (filtered by visibility)
    async function fetchAllDescendants(parentIds: string[]): Promise<typeof directReplies> {
      if (parentIds.length === 0) return []
      
      const childrenRaw = await db
        .select({
          id: posts.id,
          content: posts.content,
          authorId: posts.authorId,
          parentPostId: posts.parentPostId,
          createdAt: posts.createdAt,
          authorName: user.name,
          authorEmail: user.email,
          authorImage: user.image,
          authorIsPrivate: user.isPrivate,
        })
        .from(posts)
        .innerJoin(user, eq(posts.authorId, user.id))
        .where(inArray(posts.parentPostId, parentIds))
        .orderBy(desc(posts.createdAt))
      
      // Filter out private users that the viewer doesn't follow
      const children = childrenRaw.filter(child => 
        !child.authorIsPrivate || visiblePrivateUserIds.has(child.authorId)
      )
      
      if (children.length === 0) return []
      
      const childIds = children.map(c => c.id)
      const grandchildren = await fetchAllDescendants(childIds)
      
      return [...children, ...grandchildren]
    }

    // Fetch all nested replies recursively
    const directReplyIds = repliesToReturn.map(r => r.id)
    const allNestedReplies = await fetchAllDescendants(directReplyIds)
    
    // Combine all posts for stats lookup
    const allPosts = [...repliesToReturn, ...allNestedReplies]
    const allPostIds = allPosts.map(p => p.id)

    // Get counts for all posts at once
    const [likeCounts, repostCounts, replyCounts] = await Promise.all([
      db
        .select({ postId: likes.postId, count: count() })
        .from(likes)
        .where(inArray(likes.postId, allPostIds))
        .groupBy(likes.postId),
      db
        .select({ postId: reposts.postId, count: count() })
        .from(reposts)
        .where(inArray(reposts.postId, allPostIds))
        .groupBy(reposts.postId),
      db
        .select({ parentPostId: posts.parentPostId, count: count() })
        .from(posts)
        .where(inArray(posts.parentPostId, allPostIds))
        .groupBy(posts.parentPostId),
    ])

    // Check user interactions for all posts
    const [userLikes, userReposts] = await Promise.all([
      db
        .select({ postId: likes.postId })
        .from(likes)
        .where(and(eq(likes.userId, userId), inArray(likes.postId, allPostIds))),
      db
        .select({ postId: reposts.postId })
        .from(reposts)
        .where(and(eq(reposts.userId, userId), inArray(reposts.postId, allPostIds))),
    ])

    const likeCountMap = new Map(likeCounts.map(l => [l.postId, l.count]))
    const repostCountMap = new Map(repostCounts.map(r => [r.postId, r.count]))
    const replyCountMap = new Map(replyCounts.map(r => [r.parentPostId, r.count]))
    const userLikedSet = new Set(userLikes.map(l => l.postId))
    const userRepostedSet = new Set(userReposts.map(r => r.postId))

    // Build a map of all enriched posts
    const enrichedPostsMap = new Map<string, NestedReply>()
    
    for (const post of allPosts) {
      enrichedPostsMap.set(post.id, {
        ...post,
        authorIsPrivate: post.authorIsPrivate,
        likesCount: likeCountMap.get(post.id) ?? 0,
        repostsCount: repostCountMap.get(post.id) ?? 0,
        repliesCount: replyCountMap.get(post.id) ?? 0,
        isLiked: userLikedSet.has(post.id),
        isReposted: userRepostedSet.has(post.id),
        nestedReplies: [],
      })
    }

    // Build the tree structure
    for (const post of allNestedReplies) {
      if (post.parentPostId && enrichedPostsMap.has(post.parentPostId)) {
        const parent = enrichedPostsMap.get(post.parentPostId)!
        const child = enrichedPostsMap.get(post.id)!
        parent.nestedReplies.push(child)
      }
    }

    // Sort nested replies by createdAt (newest first)
    for (const post of enrichedPostsMap.values()) {
      post.nestedReplies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    // Get top-level replies with their nested tree
    const enrichedReplies = repliesToReturn.map(reply => enrichedPostsMap.get(reply.id)!)

    return { replies: enrichedReplies, nextCursor }
  })

// Get parent thread (all ancestors of a post)
export const getPostThread = authorized
  .input(PostIdSchema)
  .handler(async ({ input, context }) => {
    const { postId } = input
    const userId = context.user.id

    // Get the set of private user IDs that this user can view
    const visiblePrivateUserIds = await getVisiblePrivateUserIds(userId)

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
      authorIsPrivate: boolean
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
          authorIsPrivate: user.isPrivate,
        })
        .from(posts)
        .innerJoin(user, eq(posts.authorId, user.id))
        .where(eq(posts.id, currentPostId))
        .limit(1)

      if (!parent) break

      // Skip private users that the viewer doesn't follow (but continue chain)
      if (!parent.authorIsPrivate || visiblePrivateUserIds.has(parent.authorId)) {
        ancestors.unshift(parent) // Add to beginning to maintain chronological order
      }
      
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
      authorIsPrivate: post.authorIsPrivate,
      likesCount: likeCountMap.get(post.id) ?? 0,
      repostsCount: repostCountMap.get(post.id) ?? 0,
      repliesCount: replyCountMap.get(post.id) ?? 0,
      isLiked: userLikedSet.has(post.id),
      isReposted: userRepostedSet.has(post.id),
    }))

    return { thread: enrichedThread }
  })

// Get user profile
export const getProfile = authorized
  .input(UserIdSchema)
  .handler(async ({ input, context }) => {
    const { userId: profileUserId } = input
    const viewerId = context.user.id

    const [profileUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, profileUserId))
      .limit(1)

    if (!profileUser) {
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })
    }

    // Get follower/following counts
    const [[followersCount], [followingCount], [postsCount]] = await Promise.all([
      db.select({ count: count() }).from(follows).where(eq(follows.followingId, profileUserId)),
      db.select({ count: count() }).from(follows).where(eq(follows.followerId, profileUserId)),
      db.select({ count: count() }).from(posts).where(eq(posts.authorId, profileUserId)),
    ])

    // Check if viewer follows this user
    const [isFollowingRecord] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, profileUserId)))
      .limit(1)

    const isOwnProfile = viewerId === profileUserId
    const isFollowing = !!isFollowingRecord

    return {
      ...profileUser,
      followersCount: followersCount?.count ?? 0,
      followingCount: followingCount?.count ?? 0,
      postsCount: postsCount?.count ?? 0,
      isOwnProfile,
      isFollowing,
      canViewContent: !profileUser.isPrivate || isOwnProfile || isFollowing,
    }
  })

// Get current user's own profile
export const getMyProfile = authorized
  .handler(async ({ context }) => {
    const userId = context.user.id

    const [profileUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    if (!profileUser) {
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })
    }

    // Get follower/following counts
    const [[followersCount], [followingCount], [postsCount]] = await Promise.all([
      db.select({ count: count() }).from(follows).where(eq(follows.followingId, userId)),
      db.select({ count: count() }).from(follows).where(eq(follows.followerId, userId)),
      db.select({ count: count() }).from(posts).where(eq(posts.authorId, userId)),
    ])

    return {
      ...profileUser,
      followersCount: followersCount?.count ?? 0,
      followingCount: followingCount?.count ?? 0,
      postsCount: postsCount?.count ?? 0,
    }
  })

// Update privacy setting
export const updatePrivacy = authorized
  .input(z.object({ isPrivate: z.boolean() }))
  .handler(async ({ input, context }) => {
    const userId = context.user.id

    await db
      .update(user)
      .set({ isPrivate: input.isPrivate })
      .where(eq(user.id, userId))

    return { isPrivate: input.isPrivate }
  })

// Helper function to enrich posts with counts and user interaction status
async function enrichPosts(
  postsToEnrich: Array<{
    id: string
    content: string
    authorId: string
    parentPostId: string | null
    createdAt: Date
    authorName: string | null
    authorEmail: string
    authorImage: string | null
    authorIsPrivate: boolean
  }>,
  viewerId: string
) {
  if (postsToEnrich.length === 0) return []

  const postIds = postsToEnrich.map(p => p.id)

  const [likeCounts, repostCounts, replyCounts, userLikes, userReposts] = await Promise.all([
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
    db
      .select({ postId: likes.postId })
      .from(likes)
      .where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds))),
    db
      .select({ postId: reposts.postId })
      .from(reposts)
      .where(and(eq(reposts.userId, viewerId), inArray(reposts.postId, postIds))),
  ])

  const likeCountMap = new Map(likeCounts.map(l => [l.postId, l.count]))
  const repostCountMap = new Map(repostCounts.map(r => [r.postId, r.count]))
  const replyCountMap = new Map(replyCounts.map(r => [r.parentPostId, r.count]))
  const userLikedSet = new Set(userLikes.map(l => l.postId))
  const userRepostedSet = new Set(userReposts.map(r => r.postId))

  return postsToEnrich.map(post => ({
    ...post,
    likesCount: likeCountMap.get(post.id) ?? 0,
    repostsCount: repostCountMap.get(post.id) ?? 0,
    repliesCount: replyCountMap.get(post.id) ?? 0,
    isLiked: userLikedSet.has(post.id),
    isReposted: userRepostedSet.has(post.id),
  }))
}

// Get user's posts
export const getUserPosts = authorized
  .input(z.object({
    userId: z.string(),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { userId: profileUserId, limit, cursor } = input
    const viewerId = context.user.id

    // Check if viewer can view this user's content
    const [profileUser] = await db
      .select({ isPrivate: user.isPrivate })
      .from(user)
      .where(eq(user.id, profileUserId))
      .limit(1)

    if (!profileUser) {
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })
    }

    const canView = await canViewUserContent(profileUserId, viewerId, profileUser.isPrivate)
    if (!canView) {
      throw new ORPCError('FORBIDDEN', { message: 'This account is private' })
    }

    // Get user's posts
    const userPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
        authorIsPrivate: user.isPrivate,
      })
      .from(posts)
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(
        cursor
          ? and(eq(posts.authorId, profileUserId), sql`${posts.createdAt} < ${new Date(cursor)}`)
          : eq(posts.authorId, profileUserId)
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const hasMore = userPosts.length > limit
    const postsToReturn = hasMore ? userPosts.slice(0, -1) : userPosts
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.createdAt.toISOString() : undefined

    const enrichedPosts = await enrichPosts(postsToReturn, viewerId)

    return { posts: enrichedPosts, nextCursor }
  })

// Get user's reposts
export const getUserReposts = authorized
  .input(z.object({
    userId: z.string(),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { userId: profileUserId, limit, cursor } = input
    const viewerId = context.user.id

    // Check if viewer can view this user's content
    const [profileUser] = await db
      .select({ isPrivate: user.isPrivate })
      .from(user)
      .where(eq(user.id, profileUserId))
      .limit(1)

    if (!profileUser) {
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })
    }

    const canView = await canViewUserContent(profileUserId, viewerId, profileUser.isPrivate)
    if (!canView) {
      throw new ORPCError('FORBIDDEN', { message: 'This account is private' })
    }

    // Get posts that the user reposted
    const userReposts = await db
      .select({
        repostId: reposts.id,
        repostCreatedAt: reposts.createdAt,
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
        authorIsPrivate: user.isPrivate,
      })
      .from(reposts)
      .innerJoin(posts, eq(reposts.postId, posts.id))
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(
        cursor
          ? and(eq(reposts.userId, profileUserId), sql`${reposts.createdAt} < ${new Date(cursor)}`)
          : eq(reposts.userId, profileUserId)
      )
      .orderBy(desc(reposts.createdAt))
      .limit(limit + 1)

    const hasMore = userReposts.length > limit
    const repostsToReturn = hasMore ? userReposts.slice(0, -1) : userReposts
    const nextCursor = hasMore ? repostsToReturn[repostsToReturn.length - 1]?.repostCreatedAt.toISOString() : undefined

    // Filter out reposts of private users' posts that the viewer can't see
    const visiblePrivateUserIds = await getVisiblePrivateUserIds(viewerId)
    const filteredReposts = repostsToReturn.filter(r => 
      !r.authorIsPrivate || visiblePrivateUserIds.has(r.authorId)
    )

    const postsForEnrichment = filteredReposts.map(r => ({
      id: r.id,
      content: r.content,
      authorId: r.authorId,
      parentPostId: r.parentPostId,
      createdAt: r.createdAt,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorImage: r.authorImage,
      authorIsPrivate: r.authorIsPrivate,
    }))

    const enrichedPosts = await enrichPosts(postsForEnrichment, viewerId)

    // Add repost metadata
    const postsWithRepostInfo = enrichedPosts.map((post, index) => ({
      ...post,
      repostedAt: filteredReposts[index]?.repostCreatedAt,
    }))

    return { posts: postsWithRepostInfo, nextCursor }
  })

// Get user's likes
export const getUserLikes = authorized
  .input(z.object({
    userId: z.string(),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { userId: profileUserId, limit, cursor } = input
    const viewerId = context.user.id

    // Check if viewer can view this user's content
    const [profileUser] = await db
      .select({ isPrivate: user.isPrivate })
      .from(user)
      .where(eq(user.id, profileUserId))
      .limit(1)

    if (!profileUser) {
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })
    }

    const canView = await canViewUserContent(profileUserId, viewerId, profileUser.isPrivate)
    if (!canView) {
      throw new ORPCError('FORBIDDEN', { message: 'This account is private' })
    }

    // Get posts that the user liked
    const userLikes = await db
      .select({
        likeId: likes.id,
        likeCreatedAt: likes.createdAt,
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        parentPostId: posts.parentPostId,
        createdAt: posts.createdAt,
        authorName: user.name,
        authorEmail: user.email,
        authorImage: user.image,
        authorIsPrivate: user.isPrivate,
      })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(
        cursor
          ? and(eq(likes.userId, profileUserId), sql`${likes.createdAt} < ${new Date(cursor)}`)
          : eq(likes.userId, profileUserId)
      )
      .orderBy(desc(likes.createdAt))
      .limit(limit + 1)

    const hasMore = userLikes.length > limit
    const likesToReturn = hasMore ? userLikes.slice(0, -1) : userLikes
    const nextCursor = hasMore ? likesToReturn[likesToReturn.length - 1]?.likeCreatedAt.toISOString() : undefined

    // Filter out likes of private users' posts that the viewer can't see
    const visiblePrivateUserIds = await getVisiblePrivateUserIds(viewerId)
    const filteredLikes = likesToReturn.filter(l => 
      !l.authorIsPrivate || visiblePrivateUserIds.has(l.authorId)
    )

    const postsForEnrichment = filteredLikes.map(l => ({
      id: l.id,
      content: l.content,
      authorId: l.authorId,
      parentPostId: l.parentPostId,
      createdAt: l.createdAt,
      authorName: l.authorName,
      authorEmail: l.authorEmail,
      authorImage: l.authorImage,
      authorIsPrivate: l.authorIsPrivate,
    }))

    const enrichedPosts = await enrichPosts(postsForEnrichment, viewerId)

    // Add like metadata
    const postsWithLikeInfo = enrichedPosts.map((post, index) => ({
      ...post,
      likedAt: filteredLikes[index]?.likeCreatedAt,
    }))

    return { posts: postsWithLikeInfo, nextCursor }
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
  getProfile,
  getMyProfile,
  updatePrivacy,
  getUserPosts,
  getUserReposts,
  getUserLikes,
}

