import { redirect } from "next/navigation";

export default async function DeveloperApiDocsPage() {
  redirect("/settings/developers");
}
