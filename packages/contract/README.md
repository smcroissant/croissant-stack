# @repo/contract

Shared oRPC API contract for the monorepo.

## Usage

### In Server (API Routes)

```typescript
import { apiContract } from "@repo/contract";
import { os } from "@orpc/server";

// Implement the contract
const router = os.router(apiContract, {
  users: {
    list: async () => {
      // Implementation
      return [];
    },
    getById: async (input) => {
      // Implementation
      return user;
    },
    // ... other implementations
  },
});

export { router };
```

### In Client

```typescript
import { apiContract } from "@repo/contract";
import { createORPCClient } from "@orpc/client";

const client = createORPCClient(apiContract, {
  baseURL: "http://localhost:3000",
});

// Use the client with full type safety
const users = await client.users.list();
const user = await client.users.getById({ id: "123" });
```

## Structure

- `src/index.ts` - Main contract definition
- Export all route contracts from the main `apiContract`

## Adding New Routes

1. Define your schemas using Zod
2. Create a new contract using `oc.prefix("/api/your-route")`
3. Add your contract to the main `apiContract` router
