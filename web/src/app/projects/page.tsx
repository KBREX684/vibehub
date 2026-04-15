import { redirect } from "next/navigation";

/**
 * P1-FE-4: Project list index — canonical discovery surface is `/discover`.
 */
export default function ProjectsIndexPage() {
  redirect("/discover");
}
