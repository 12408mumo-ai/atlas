import { redirect } from "next/navigation";

// Old assistant bookmarks return to the home page until a replacement is ready.
export default function AtlasPage() {
  redirect("/hub");
}
