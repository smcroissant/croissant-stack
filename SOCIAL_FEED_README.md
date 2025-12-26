# Social Feed - Setup Guide

A full-featured social media application built with the croissant-stack monorepo.

## Features

- **Authentication**: Email/password sign up and login with Better Auth
- **Post Creation**: Create posts up to 280 characters
- **Interactions**: Like, repost, and reply to posts
- **Follow System**: Follow/unfollow users, view followers and following lists
- **User Profiles**: View user profiles with posts and stats
- **Timeline Feeds**:
  - **Home Feed** (`/feed`): Shows posts from users you follow
  - **Explore Feed** (`/explore`): Shows all posts from all users
- **Real-time Updates**: Optimistic UI updates for likes and reposts
- **Protected Routes**: Automatic redirect to login for unauthenticated users

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: oRPC (type-safe API)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **UI Components**: Custom component library based on shadcn/ui

## Setup Instructions

### 1. Prerequisites

- Node.js ≥18
- PostgreSQL database
- pnpm 9.0.0

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database - Replace with your PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/croissant_db

# Authentication - Generate a secure secret (min 32 characters)
BETTER_AUTH_SECRET=your-secret-key-here-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
```

### 4. Set Up the Database

#### Option A: Push Schema Directly (Development)

```bash
cd packages/db
npx drizzle-kit push
```

#### Option B: Generate and Run Migrations (Production)

```bash
cd packages/db
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5. Generate Auth Schema

```bash
pnpm generate:auth-schema
```

### 6. Run the Development Server

```bash
pnpm dev
```

The admin app will be available at [http://localhost:3000](http://localhost:3000)

## Database Schema

### Tables Created

1. **posts**
   - `id` (primary key)
   - `content` (text, max 280 chars)
   - `authorId` (foreign key to user)
   - `parentPostId` (foreign key to posts, for replies)
   - `createdAt`, `updatedAt`

2. **likes**
   - `id` (primary key)
   - `userId` (foreign key to user)
   - `postId` (foreign key to posts)
   - `createdAt`

3. **reposts**
   - `id` (primary key)
   - `userId` (foreign key to user)
   - `postId` (foreign key to posts)
   - `createdAt`

4. **follows**
   - `id` (primary key)
   - `followerId` (foreign key to user)
   - `followingId` (foreign key to user)
   - `createdAt`

All tables have proper indexes for optimal query performance.

## API Endpoints

All API endpoints are available at `/api/rpc/` via oRPC:

### Posts
- `posts.list` - List posts (with optional userId filter)
- `posts.feed` - Get following feed (authenticated)
- `posts.find` - Get single post with replies
- `posts.create` - Create a new post (authenticated)
- `posts.delete` - Delete a post (authenticated)

### Likes
- `likes.toggle` - Toggle like on a post (authenticated)

### Reposts
- `reposts.toggle` - Toggle repost on a post (authenticated)

### Follows
- `follows.toggle` - Follow/unfollow a user (authenticated)
- `follows.isFollowing` - Check if following a user (authenticated)
- `follows.followers` - Get user's followers list
- `follows.following` - Get user's following list
- `follows.stats` - Get follower/following counts

## App Structure

```
apps/admin/
├── app/
│   ├── feed/page.tsx          # Home feed (following timeline)
│   ├── explore/page.tsx       # Explore feed (all posts)
│   ├── profile/[userId]/page.tsx  # User profile page
│   ├── components/
│   │   ├── post-card.tsx      # Post display component
│   │   ├── compose-post.tsx   # Post composer dialog
│   │   └── app-sidebar.tsx    # Navigation sidebar
│   └── api/
│       └── rpc/[...all]/route.ts  # oRPC API handler
│
packages/
├── api/
│   └── src/routers/
│       ├── posts.ts           # Post CRUD operations
│       ├── likes.ts           # Like functionality
│       ├── reposts.ts         # Repost functionality
│       └── follows.ts         # Follow system
├── db/
│   └── src/schema.ts          # Database schema definitions
└── ui/
    └── src/components/        # Shared UI components
```

## Usage

### First Time Setup

1. **Create an Account**:
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You'll be redirected to `/login`
   - Click "Sign up" to create a new account
   - Enter your name, email, and password (min 8 characters)

2. **Explore Posts**: Visit `/explore` to see all posts

3. **Create Your First Post**: Click the "Post" button to compose

4. **Follow Users**: Visit user profiles and click "Follow"

5. **View Your Feed**: Go to `/feed` to see posts from users you follow

6. **Logout**: Click your profile in the sidebar footer and select "Log out"

### Navigation

- **Home** (`/feed`): Your personalized timeline (users you follow)
- **Explore** (`/explore`): Discover all posts
- **Profile** (`/profile/[userId]`): View any user's profile
- **Notifications**: Coming soon
- **Settings**: Coming soon

## Development

### Run Tests

```bash
pnpm test
```

### Type Check

```bash
pnpm check-types
```

### Lint

```bash
pnpm lint
```

### Format Code

```bash
pnpm format
```

## Troubleshooting

### Database Connection Issues

If you see "Please provide required params for Postgres driver":
- Ensure `DATABASE_URL` is set in `.env`
- Verify your PostgreSQL database is running
- Check connection string format

### Authentication Errors

If you encounter auth issues:
- Ensure `BETTER_AUTH_SECRET` is at least 32 characters
- Run `pnpm generate:auth-schema` to regenerate auth tables
- Clear browser cookies and try again

### API Errors

If API calls fail:
- Check browser console for detailed error messages
- Verify you're authenticated for protected endpoints
- Ensure database tables are created via `drizzle-kit push`

## Future Enhancements

- Direct messaging
- Notifications system
- Hashtag support
- Media uploads (images/videos)
- Post search
- Trending topics
- User mentions (@username)
- Bookmarks
- Post analytics

## Contributing

This is a demonstration project for the croissant-stack monorepo. Feel free to extend and customize!

