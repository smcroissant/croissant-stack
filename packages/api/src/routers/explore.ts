import * as z from 'zod'
import { authorized } from '../middleware/auth'
import { schema } from '@repo/db'
import { db } from '@repo/db'
import { eq, desc, inArray, and, sql, count, notInArray, isNull, gt, ilike, or } from 'drizzle-orm'

const { posts, likes, reposts, follows, user, hashtags, postHashtags } = schema

// Helper: Get set of private user IDs that the viewer can see (follows + self)
async function getVisiblePrivateUserIds(viewerId: string): Promise<Set<string>> {
  const following = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerId))
  
  const visibleIds = new Set(following.map(f => f.followingId))
  visibleIds.add(viewerId)
  return visibleIds
}

// Helper: Enrich posts with counts and user interaction status
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

  return postsToEnrich.map(post => {
    const likesCount = likeCountMap.get(post.id) ?? 0
    const repostsCount = repostCountMap.get(post.id) ?? 0
    return {
      ...post,
      likesCount,
      repostsCount,
      repliesCount: replyCountMap.get(post.id) ?? 0,
      isLiked: userLikedSet.has(post.id),
      isReposted: userRepostedSet.has(post.id),
      engagementScore: likesCount + repostsCount * 2, // Reposts worth double
    }
  })
}

// Get time boundary based on timeframe
function getTimeframeBoundary(timeframe: '24h' | '7d' | '30d'): Date {
  const now = new Date()
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

// ============================================
// Trending Posts
// ============================================
export const getTrendingPosts = authorized
  .input(z.object({
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
    timeframe: z.enum(['24h', '7d', '30d']).default('24h'),
  }))
  .handler(async ({ input, context }) => {
    const { limit, cursor, timeframe } = input
    const userId = context.user.id

    const timeBoundary = getTimeframeBoundary(timeframe)
    const visiblePrivateUserIds = await getVisiblePrivateUserIds(userId)

    // Get posts with engagement data
    // Using a subquery approach to calculate engagement and sort
    const rawPosts = await db
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
        and(
          gt(posts.createdAt, timeBoundary),
          isNull(posts.parentPostId) // Only top-level posts for trending
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(200) // Fetch more to filter and sort by engagement

    // Filter by visibility
    const visiblePosts = rawPosts.filter(post =>
      !post.authorIsPrivate || visiblePrivateUserIds.has(post.authorId)
    )

    if (visiblePosts.length === 0) {
      return { posts: [], nextCursor: undefined }
    }

    // Enrich with engagement data
    const enrichedPosts = await enrichPosts(visiblePosts, userId)

    // Sort by engagement score
    enrichedPosts.sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))

    // Apply cursor-based pagination on engagement score
    let startIndex = 0
    if (cursor) {
      const cursorScore = parseInt(cursor, 10)
      startIndex = enrichedPosts.findIndex(p => (p.engagementScore ?? 0) < cursorScore)
      if (startIndex === -1) startIndex = enrichedPosts.length
    }

    const paginatedPosts = enrichedPosts.slice(startIndex, startIndex + limit + 1)
    const hasMore = paginatedPosts.length > limit
    const postsToReturn = hasMore ? paginatedPosts.slice(0, -1) : paginatedPosts
    const nextCursor = hasMore ? String(postsToReturn[postsToReturn.length - 1]?.engagementScore ?? 0) : undefined

    return { posts: postsToReturn, nextCursor }
  })

// ============================================
// Trending Hashtags
// ============================================
export const getTrendingHashtags = authorized
  .input(z.object({
    limit: z.number().min(1).max(20).default(10),
  }))
  .handler(async ({ input }) => {
    const { limit } = input

    // Get hashtags ordered by post count (most popular first)
    const trendingHashtags = await db
      .select({
        id: hashtags.id,
        name: hashtags.name,
        postCount: hashtags.postCount,
        createdAt: hashtags.createdAt,
      })
      .from(hashtags)
      .orderBy(desc(sql`CAST(${hashtags.postCount} AS INTEGER)`))
      .limit(limit)

    return {
      hashtags: trendingHashtags.map(h => ({
        ...h,
        postCount: parseInt(h.postCount, 10),
      })),
    }
  })

// ============================================
// Posts by Hashtag
// ============================================
export const getPostsByHashtag = authorized
  .input(z.object({
    hashtag: z.string().min(1),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { hashtag: hashtagName, limit, cursor } = input
    const userId = context.user.id

    const visiblePrivateUserIds = await getVisiblePrivateUserIds(userId)

    // Find the hashtag
    const [foundHashtag] = await db
      .select()
      .from(hashtags)
      .where(ilike(hashtags.name, hashtagName))
      .limit(1)

    if (!foundHashtag) {
      return { posts: [], nextCursor: undefined, hashtag: null }
    }

    // Get posts with this hashtag
    const rawPosts = await db
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
      .from(postHashtags)
      .innerJoin(posts, eq(postHashtags.postId, posts.id))
      .innerJoin(user, eq(posts.authorId, user.id))
      .where(
        cursor
          ? and(
              eq(postHashtags.hashtagId, foundHashtag.id),
              sql`${posts.createdAt} < ${new Date(cursor)}`
            )
          : eq(postHashtags.hashtagId, foundHashtag.id)
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    // Filter by visibility
    const visiblePosts = rawPosts.filter(post =>
      !post.authorIsPrivate || visiblePrivateUserIds.has(post.authorId)
    )

    const hasMore = visiblePosts.length > limit
    const postsToReturn = hasMore ? visiblePosts.slice(0, -1) : visiblePosts
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.createdAt.toISOString() : undefined

    const enrichedPosts = await enrichPosts(postsToReturn, userId)

    return {
      posts: enrichedPosts,
      nextCursor,
      hashtag: {
        ...foundHashtag,
        postCount: parseInt(foundHashtag.postCount, 10),
      },
    }
  })

// ============================================
// Search Posts
// ============================================
export const searchPosts = authorized
  .input(z.object({
    query: z.string().min(1).max(100),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { query, limit, cursor } = input
    const userId = context.user.id

    const visiblePrivateUserIds = await getVisiblePrivateUserIds(userId)

    // Search posts by content
    const rawPosts = await db
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
              ilike(posts.content, `%${query}%`),
              sql`${posts.createdAt} < ${new Date(cursor)}`
            )
          : ilike(posts.content, `%${query}%`)
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    // Filter by visibility
    const visiblePosts = rawPosts.filter(post =>
      !post.authorIsPrivate || visiblePrivateUserIds.has(post.authorId)
    )

    const hasMore = visiblePosts.length > limit
    const postsToReturn = hasMore ? visiblePosts.slice(0, -1) : visiblePosts
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.createdAt.toISOString() : undefined

    const enrichedPosts = await enrichPosts(postsToReturn, userId)

    return { posts: enrichedPosts, nextCursor }
  })

// ============================================
// Search Users
// ============================================
export const searchUsers = authorized
  .input(z.object({
    query: z.string().min(1).max(100),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { query, limit, cursor } = input
    const viewerId = context.user.id

    // Search users by name or email
    const rawUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(
        cursor
          ? and(
              or(
                ilike(user.name, `%${query}%`),
                ilike(user.email, `%${query}%`)
              ),
              sql`${user.createdAt} < ${new Date(cursor)}`
            )
          : or(
              ilike(user.name, `%${query}%`),
              ilike(user.email, `%${query}%`)
            )
      )
      .orderBy(desc(user.createdAt))
      .limit(limit + 1)

    const hasMore = rawUsers.length > limit
    const usersToReturn = hasMore ? rawUsers.slice(0, -1) : rawUsers
    const nextCursor = hasMore ? usersToReturn[usersToReturn.length - 1]?.createdAt.toISOString() : undefined

    // Get follow status and stats for each user
    const userIds = usersToReturn.map(u => u.id)

    const [followingStatuses, followerCounts, followingCounts, postCounts] = await Promise.all([
      db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, userIds))),
      db
        .select({ userId: follows.followingId, count: count() })
        .from(follows)
        .where(inArray(follows.followingId, userIds))
        .groupBy(follows.followingId),
      db
        .select({ userId: follows.followerId, count: count() })
        .from(follows)
        .where(inArray(follows.followerId, userIds))
        .groupBy(follows.followerId),
      db
        .select({ userId: posts.authorId, count: count() })
        .from(posts)
        .where(inArray(posts.authorId, userIds))
        .groupBy(posts.authorId),
    ])

    const followingSet = new Set(followingStatuses.map(f => f.followingId))
    const followerCountMap = new Map(followerCounts.map(f => [f.userId, f.count]))
    const followingCountMap = new Map(followingCounts.map(f => [f.userId, f.count]))
    const postCountMap = new Map(postCounts.map(p => [p.userId, p.count]))

    const enrichedUsers = usersToReturn.map(u => ({
      ...u,
      isFollowing: followingSet.has(u.id),
      isOwnProfile: u.id === viewerId,
      followersCount: followerCountMap.get(u.id) ?? 0,
      followingCount: followingCountMap.get(u.id) ?? 0,
      postsCount: postCountMap.get(u.id) ?? 0,
    }))

    return { users: enrichedUsers, nextCursor }
  })

// ============================================
// Suggested Users (Who to Follow)
// ============================================
export const getSuggestedUsers = authorized
  .input(z.object({
    limit: z.number().min(1).max(20).default(5),
  }))
  .handler(async ({ input, context }) => {
    const { limit } = input
    const viewerId = context.user.id

    // Get users the viewer already follows
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, viewerId))

    const alreadyFollowingIds = following.map(f => f.followingId)
    alreadyFollowingIds.push(viewerId) // Exclude self

    // Find popular users (by follower count) that the viewer doesn't follow
    // Only suggest public accounts or accounts with some activity
    const popularUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isPrivate: user.isPrivate,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(
        alreadyFollowingIds.length > 0
          ? and(
              notInArray(user.id, alreadyFollowingIds),
              eq(user.isPrivate, false)
            )
          : eq(user.isPrivate, false)
      )
      .limit(50) // Get more to sort by popularity

    if (popularUsers.length === 0) {
      return { users: [] }
    }

    const userIds = popularUsers.map(u => u.id)

    // Get follower counts for ranking
    const [followerCounts, followingCounts, postCounts] = await Promise.all([
      db
        .select({ userId: follows.followingId, count: count() })
        .from(follows)
        .where(inArray(follows.followingId, userIds))
        .groupBy(follows.followingId),
      db
        .select({ userId: follows.followerId, count: count() })
        .from(follows)
        .where(inArray(follows.followerId, userIds))
        .groupBy(follows.followerId),
      db
        .select({ userId: posts.authorId, count: count() })
        .from(posts)
        .where(inArray(posts.authorId, userIds))
        .groupBy(posts.authorId),
    ])

    const followerCountMap = new Map(followerCounts.map(f => [f.userId, f.count]))
    const followingCountMap = new Map(followingCounts.map(f => [f.userId, f.count]))
    const postCountMap = new Map(postCounts.map(p => [p.userId, p.count]))

    // Score and sort users by popularity (followers + posts)
    const scoredUsers = popularUsers.map(u => ({
      ...u,
      isFollowing: false,
      isOwnProfile: false,
      followersCount: followerCountMap.get(u.id) ?? 0,
      followingCount: followingCountMap.get(u.id) ?? 0,
      postsCount: postCountMap.get(u.id) ?? 0,
      score: (followerCountMap.get(u.id) ?? 0) + (postCountMap.get(u.id) ?? 0),
    }))

    // Sort by score and take top N
    scoredUsers.sort((a, b) => b.score - a.score)
    const topUsers = scoredUsers.slice(0, limit)

    // Remove score from final result
    return {
      users: topUsers.map(({ score, ...rest }) => rest),
    }
  })

// ============================================
// Recent Searches (could be stored in localStorage on client, but we provide structure)
// ============================================
export const getRecentSearches = authorized
  .handler(async ({ context }) => {
    // This could be extended to store recent searches in DB
    // For now, return empty array (client will use localStorage)
    return { searches: [] as string[] }
  })

// ============================================
// Discover Feed (mix of trending + suggested content)
// ============================================
export const getDiscoverFeed = authorized
  .input(z.object({
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    const { limit, cursor } = input
    const userId = context.user.id

    const visiblePrivateUserIds = await getVisiblePrivateUserIds(userId)

    // Get users the viewer follows
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId))

    const followingIds = new Set(following.map(f => f.followingId))

    // Get posts from users the viewer DOESN'T follow (discovery)
    // Prioritize engaging content
    const rawPosts = await db
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
        and(
          cursor
            ? sql`${posts.createdAt} < ${new Date(cursor)}`
            : undefined,
          isNull(posts.parentPostId), // Only top-level posts
          eq(user.isPrivate, false) // Only public users for discovery
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(100)

    // Filter to posts from users we don't follow
    const discoveryPosts = rawPosts.filter(post =>
      !followingIds.has(post.authorId) && post.authorId !== userId
    )

    if (discoveryPosts.length === 0) {
      return { posts: [], nextCursor: undefined }
    }

    // Enrich and sort by engagement
    const enrichedPosts = await enrichPosts(discoveryPosts.slice(0, 50), userId)
    enrichedPosts.sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))

    const postsToReturn = enrichedPosts.slice(0, limit)
    const hasMore = enrichedPosts.length > limit
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.createdAt.toISOString() : undefined

    return { posts: postsToReturn, nextCursor }
  })

// ============================================
// Export Router
// ============================================
export const exploreRouter = {
  getTrendingPosts,
  getTrendingHashtags,
  getPostsByHashtag,
  searchPosts,
  searchUsers,
  getSuggestedUsers,
  getRecentSearches,
  getDiscoverFeed,
}

