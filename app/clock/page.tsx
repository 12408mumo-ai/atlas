import { redirect } from "next/navigation";

// Existing clock bookmarks lead to the new entry screen.
export default function ClockPage() {
  redirect("/");
}
