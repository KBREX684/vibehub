import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockUsers } from "@/lib/data/mock-data";
import type { SessionUser } from "@/lib/types";

/**
 * P0-BE-1: Reject browser sessions whose embedded `sessionVersion` does not
 * match `User.sessionVersion` in the database (or mock store).
 */
export async function verifySessionVersionMatches(user: SessionUser): Promise<boolean> {
  const expected = user.sessionVersion ?? 0;
  if (isMockDataEnabled()) {
    const row = mockUsers.find((u) => u.id === user.userId);
    if (!row) return false;
    const v = row.sessionVersion ?? 0;
    return v === expected;
  }
  const row = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { sessionVersion: true },
  });
  if (!row) return false;
  return row.sessionVersion === expected;
}

/** Increments sessionVersion for a user — all existing cookies become invalid. */
export async function bumpUserSessionVersion(userId: string): Promise<void> {
  if (isMockDataEnabled()) {
    const u = mockUsers.find((x) => x.id === userId);
    if (u) {
      u.sessionVersion = (u.sessionVersion ?? 0) + 1;
    }
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
