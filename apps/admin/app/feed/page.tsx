import { redirect } from "next/navigation";
import { getServerSession } from "../lib/auth.server";
import { FeedPosts } from "../components/feed-posts";

export default async function FeedPage() {
  const session = await getServerSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <FeedPosts isAuthenticated={!!session} />
    </div>
  );
}
