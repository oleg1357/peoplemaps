import { redirect } from "next/navigation";

// /profile was merged into the unified /dashboard experience. Redirect keeps
// old bookmarks and links working.
export default function ProfileRedirect() {
  redirect("/dashboard");
}
