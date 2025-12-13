import { auth } from '@repo/auth'
import { ORPCError } from '@orpc/server'

import { os } from '@orpc/server'

export const base = os.$context<{ headers: Headers }>()

export const authMiddleware = base.middleware(async ({ context, next }) => {
  const sessionData = await auth.api.getSession({
    headers: context.headers, // or reqHeaders if you're using the plugin
  })

  if (!sessionData?.session || !sessionData?.user) {
    throw new ORPCError('UNAUTHORIZED')
  }

  // Adds session and user to the context
  return next({
    context: {
      session: sessionData.session,
      user: sessionData.user
    },
  })
})

export const authorized = base.use(authMiddleware)