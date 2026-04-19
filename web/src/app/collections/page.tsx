import { redirect } from "next/navigation";

export default async function CollectionsIndexPage() {
  redirect("/discover");
}
