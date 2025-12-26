import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { authorized } from '../middleware/auth'
import { schema } from '@repo/db'
import { db } from '@repo/db'
import { eq } from 'drizzle-orm'

const { planets } = schema

const CreatePlanetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
})

const FindPlanetSchema = z.object({
  id: z.string().uuid(),
})

export const listPlanet = os
  .handler(async () => {
    const allPlanets = await db.select().from(planets)
    return allPlanets
  })

export const findPlanet = os
  .input(FindPlanetSchema.pick({ id: true }))
  .handler(async ({ input }) => {
    // your find code here
    const [planet] = await db.select().from(planets).where(eq(planets.id, input.id)).limit(1)
    if (!planet) {
      throw new ORPCError('NOT_FOUND', { message: 'Planet not found' })
    }
    return planet
  })

export const createPlanet = authorized.input(CreatePlanetSchema).handler(async ({ input }) => {
  // your create code here
  const planet = await db.insert(planets).values({
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
  }).returning()
  return planet[0]
})


export const planetsRouter = {
  list: listPlanet,
  find: findPlanet,
  create: createPlanet,
}