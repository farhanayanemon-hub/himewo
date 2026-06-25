import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/lib/auth";
import { useGetUserPosts, getGetUserPostsQueryKey } from "@workspace/api-client-react";
import { PostCard } from "@/components/post-card";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function MePage() {
  const { user } = useAuth();
  
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(user!.id, {}, { query: { enabled: !!user, queryKey: getGetUserPostsQueryKey(user!.id) } });

  if (!user) return null;

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="h-48 bg-muted relative group">
          {user.coverUrl ? (
            <img src={user.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
          )}
          <Link href="/settings">
            <Button variant="secondary" size="sm" className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              Edit Cover
            </Button>
          </Link>
        </div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end mb-4">
            <div className="relative group">
              <img 
                src={user.avatarUrl || ""} 
                className="w-32 h-32 rounded-full border-4 border-card object-cover -mt-16 bg-muted relative z-10" 
                alt="Avatar" 
              />
            </div>
            <Link href="/settings">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <p className="text-muted-foreground text-sm mb-2">@{user.username}</p>
            {user.bio && <p className="text-[15px] mb-4">{user.bio}</p>}
            <div className="flex gap-4 text-sm text-muted-foreground font-medium">
              <span>{user.friendCount || 0} Friends</span>
              <span>{user.followerCount || 0} Followers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2">My Posts</h2>
        {postsLoading ? (
          <div className="py-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-xl text-muted-foreground">You haven't posted anything yet.</div>
        ) : (
          posts?.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </MainLayout>
  );
}