import { redirect } from "next/navigation";

export default async function DevelopersPage() {
  redirect("/settings/developers");
}
