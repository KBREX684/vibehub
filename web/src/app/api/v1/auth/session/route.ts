import { getSessionUserFromCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/response";
import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockUsers } from "@/lib/data/mock-data";

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiSuccess({ session: null, email: null, githubLinked: false });
  }

  let email: string | null = null;
  let githubLinked = false;
  if (isMockDataEnabled()) {
    const u = mockUsers.find((x) => x.id === session.userId);
    email = u?.email ?? null;
    githubLinked = u?.githubId != null;
  } else {
    const row = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, githubId: true },
    });
    email = row?.email ?? null;
    githubLinked = row?.githubId != null;
  }

  return apiSuccess({ session, email, githubLinked });
}
