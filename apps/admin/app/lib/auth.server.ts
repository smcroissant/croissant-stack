import "server-only";

import { headers } from "next/headers";
import { auth, type Session } from "@repo/auth";

export async function getServerSession(): Promise<Session | null> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session;
}

