# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**croissant-stack** is a full-stack TypeScript monorepo built with Turborepo and pnpm. It contains web and mobile applications sharing common packages for authentication, database, API, and UI components.

## Tech Stack

- **Runtime**: Node.js ≥18
- **Package Manager**: pnpm 9.0.0
- **Monorepo**: Turborepo
- **Language**: TypeScript 5.9
- **Frontend**: React 19, Next.js (admin), Expo/React Native (mobile)
- **Backend**: oRPC for type-safe API
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth
- **Validation**: Zod
- **UI**: Custom component library (`@repo/ui`) based on shadcn/ui patterns

## Repository Structure

```
apps/
├── admin/          # Next.js admin dashboard
├── mobile/         # Expo React Native app
└── storybook/      # Component documentation

packages/
├── api/            # oRPC routers and API logic
├── auth/           # Better Auth configuration
├── contract/       # Shared API contracts/types
├── db/             # Drizzle ORM schema and database client
├── ui/             # Shared React components
├── eslint-config/  # Shared ESLint configurations
└── typescript-config/  # Shared tsconfig files
```

## Common Commands

```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm dev

# Build all packages and apps
pnpm build

# Lint the codebase
pnpm lint

# Type-check the codebase
pnpm check-types

# Format code with Prettier
pnpm format

# Generate auth schema for database
pnpm generate:auth-schema

# Run Turbo for a specific app/package
pnpm turbo dev --filter=admin
pnpm turbo build --filter=@repo/ui
```

## Database Commands

```bash
# Generate migrations (from packages/db)
cd packages/db && npx drizzle-kit generate

# Push schema changes to database
cd packages/db && npx drizzle-kit push

# Open Drizzle Studio
cd packages/db && npx drizzle-kit studio
```

## Code Architecture Guidelines

### Package Imports
- Internal packages use `@repo/` prefix: `@repo/ui`, `@repo/db`, `@repo/auth`, `@repo/api`
- UI components: `import { Button } from "@repo/ui/components/button"`
- Global styles: `import "@repo/ui/globals.css"`

### Database Schema
- Schema definitions live in `packages/db/src/schema.ts`
- Auth schema is auto-generated in `packages/db/src/auth-schema.ts` via Better Auth CLI
- Use Drizzle ORM patterns for queries

### API Layer (oRPC)
- Routers are defined in `packages/api/src/routers/`
- Main router aggregation in `packages/api/src/index.ts`
- Use Zod for input/output validation

### Authentication
- Better Auth configured in `packages/auth/src/lib/auth.ts`
- Client-side auth in `apps/admin/app/lib/auth-client.ts`
- Auth API routes at `apps/admin/app/api/auth/[...all]/route.ts`

### UI Components
- Components follow shadcn/ui patterns
- Located in `packages/ui/src/components/`
- Use Tailwind CSS for styling
- Import hooks from `@repo/ui/hooks/`

## Environment Variables

Create `.env` files in the root or specific app directories. Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret for auth encryption

## Development Workflow

1. Changes to shared packages (`@repo/ui`, `@repo/db`, etc.) are automatically rebuilt
2. Use Turbo filters to run commands on specific packages
3. TypeScript paths are configured for monorepo imports
4. ESLint and Prettier are configured at root level

## Testing

Run tests from the root:
```bash
pnpm test           # Run all tests
pnpm test --filter=admin  # Run tests for specific app
```

## Key Patterns

- **Type Safety**: End-to-end type safety via TypeScript, oRPC contracts, and Zod
- **Shared UI**: All UI components centralized in `@repo/ui` for consistency
- **Drizzle Relations**: Define relations in schema files for type-safe joins
- **Auth Middleware**: Use `@repo/api/middleware/auth` for protected routes

