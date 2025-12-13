import { oc } from "@orpc/contract";
import { z } from "zod";

// Base contract with shared configuration
export const contract = oc;

// User-related schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
});

// Planet-related schemas
export const planetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  diameter: z.number().int().nullable(), // in kilometers
  mass: z.string().nullable(), // in kg (scientific notation)
  distanceFromSun: z.string().nullable(), // in million km
  orbitalPeriod: z.string().nullable(), // in Earth days
  temperature: z.number().int().nullable(), // average temperature in Celsius
  moons: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Example contract: User routes
export const userContract = contract.prefix("/api/users").router({
  // Get all users
  list: contract
    .route({
      method: "GET",
      path: "/",
    })
    .output(z.array(userSchema)),

  // Get user by ID
  getById: contract
    .route({
      method: "GET",
      path: "/:id",
    })
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .output(userSchema),

  // Create user
  create: contract
    .route({
      method: "POST",
      path: "/",
    })
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .output(userSchema),

  // Update user
  update: contract
    .route({
      method: "PUT",
      path: "/:id",
    })
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.string().email().optional(),
        name: z.string().optional(),
      })
    )
    .output(userSchema),

  // Delete user
  delete: contract
    .route({
      method: "DELETE",
      path: "/:id",
    })
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .output(z.object({ success: z.boolean() })),
});

// Planet routes
export const planetContract = contract.prefix("/api/planets").router({
  // Get all planets
  list: contract
    .route({
      method: "GET",
      path: "/",
    })
    .output(z.array(planetSchema)),

  // Get planet by ID
  getById: contract
    .route({
      method: "GET",
      path: "/:id",
    })
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .output(planetSchema),

  // Create planet
  create: contract
    .route({
      method: "POST",
      path: "/",
    })
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

  // Update planet
  update: contract
    .route({
      method: "PUT",
      path: "/:id",
    })
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
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

  // Delete planet
  delete: contract
    .route({
      method: "DELETE",
      path: "/:id",
    })
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .output(z.object({ success: z.boolean() })),
});

// Main API contract - compose all route contracts here
export const apiContract = contract.router({
  users: userContract,
  planets: planetContract,
});

// Export contract type for use in server and client
export type ApiContract = typeof apiContract;
