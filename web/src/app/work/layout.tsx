import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { WorkConsoleShell } from "@/components/work-console-shell";
import { getWorkShellBadges, listWorkspaceSummariesForUser } from "@/lib/work-console";

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work");
  }

  const [workspaces, badges] = await Promise.all([
    listWorkspaceSummariesForUser(session.userId),
    getWorkShellBadges(session.userId),
  ]);

  return <WorkConsoleShell workspaces={workspaces} badges={badges}>{children}</WorkConsoleShell>;
}
