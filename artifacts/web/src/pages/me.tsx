import { useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/lib/auth";
import { useGetUserPosts, getGetUserPostsQueryKey } from "@workspace/api-client-react";
import { ProfileView } from "@/components/profile-view";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function MePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user?.username) {
      navigate(`/${user.username}`, { replace: true });
    }
  }, [user?.username, navigate]);

  const { data: posts, isLoading: postsLoading } = useGetUserPosts(user!.id, {}, { query: { enabled: !!user, queryKey: getGetUserPostsQueryKey(user!.id) } });

  if (!user) return null;

  const headerActions = (
    <Link href="/edit-profile">
      <Button variant="outline">Edit profile</Button>
    </Link>
  );

  return (
    <MainLayout>
      <ProfileView
        profile={user}
        userId={user.id}
        isOwnProfile
        posts={posts}
        postsLoading={postsLoading}
        headerActions={headerActions}
      />
    </MainLayout>
  );
}
