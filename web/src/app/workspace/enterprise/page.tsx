import { redirect } from "next/navigation";

/**
 * v7 P0-2: Enterprise "workspace" hub removed — enterprise is certification-only.
 * Old links land on the verification flow for the badge.
 */
export default function EnterpriseWorkspaceDeprecatedPage() {
  redirect("/enterprise/verify");
}
