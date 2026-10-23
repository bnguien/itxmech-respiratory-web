import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/db/schema/app-access";
import { authorizeApp } from "@/lib/app-api/server";
import { withAppErrors } from "@/lib/app-api/http";

export const POST = withAppErrors("auth/logout", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  await db
    .update(appSessions)
    .set({ revokedAt: new Date().toISOString(), isBleGateway: false })
    .where(eq(appSessions.id, auth.sessionId));
  return new Response(null, { status: 204 });
});
