import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetUserByUsername } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

export default function UsernameProfilePage() {
  const params = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const username = (params.username || "").toLowerCase();

  const { data: profile, isLoading, isError } = useGetUserByUsername(username);

  useEffect(() => {
    if (profile?.id) {
      navigate(`/profile/${profile.id}`, { replace: true });
    }
  }, [profile?.id, navigate]);

  if (isError) return <NotFound />;

  if (isLoading || profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <NotFound />;
}
