import { Link } from "wouter";
import {
  useGetUserFriends,
  getGetUserFriendsQueryKey,
  type Profile,
  type Post,
} from "@workspace/api-client-react";
import { PostCard } from "@/components/post-card";
import {
  Loader2,
  Briefcase,
  GraduationCap,
  MapPin,
  Home,
  Heart,
  Sparkles,
  Globe,
  Mail,
  Phone,
} from "lucide-react";

function IntroRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[15px]">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

export function ProfileView({
  profile,
  userId,
  isOwnProfile,
  posts,
  postsLoading,
  headerActions,
}: {
  profile: Profile;
  userId: string;
  isOwnProfile: boolean;
  posts: Post[] | undefined;
  postsLoading: boolean;
  headerActions: React.ReactNode;
}) {
  const { data: friends } = useGetUserFriends(
    userId,
    undefined,
    { query: { enabled: !!userId, queryKey: getGetUserFriendsQueryKey(userId) } },
  );

  const photoUrls = (posts ?? [])
    .flatMap((p) => p.media ?? [])
    .filter((m) => m.type === "image")
    .map((m) => m.url)
    .slice(0, 9);

  const hasIntro =
    profile.bio ||
    profile.work ||
    profile.education ||
    profile.location ||
    profile.hometown ||
    profile.hobbies ||
    profile.interests ||
    profile.website ||
    profile.email ||
    profile.phone;

  return (
    <>
      {/* Cover + header */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="h-48 md:h-64 bg-muted relative">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
          )}
        </div>
        <div className="px-6 pb-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
            <img
              src={profile.avatarUrl || ""}
              className="w-32 h-32 rounded-full border-4 border-card object-cover bg-muted relative z-10"
              alt="Avatar"
            />
            <div className="flex-1 sm:pb-2">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
              <div className="flex gap-4 text-sm text-muted-foreground font-medium mt-1">
                <span>{profile.friendCount || 0} Friends</span>
                <span>{profile.followerCount || 0} Followers</span>
              </div>
            </div>
            <div className="flex gap-2 sm:pb-2">{headerActions}</div>
          </div>
        </div>
      </div>

      {/* Two-column: Intro + Friends + Photos | Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Intro */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h2 className="font-bold text-lg mb-3">Intro</h2>
            {profile.bio && <p className="text-[15px] mb-3 whitespace-pre-wrap">{profile.bio}</p>}
            {hasIntro ? (
              <div className="space-y-2.5">
                {profile.work && <IntroRow icon={<Briefcase className="w-5 h-5" />}>Works at <b>{profile.work}</b></IntroRow>}
                {profile.education && <IntroRow icon={<GraduationCap className="w-5 h-5" />}>Studied at <b>{profile.education}</b></IntroRow>}
                {profile.location && <IntroRow icon={<MapPin className="w-5 h-5" />}>Lives in <b>{profile.location}</b></IntroRow>}
                {profile.hometown && <IntroRow icon={<Home className="w-5 h-5" />}>From <b>{profile.hometown}</b></IntroRow>}
                {profile.hobbies && <IntroRow icon={<Heart className="w-5 h-5" />}>Hobbies: {profile.hobbies}</IntroRow>}
                {profile.interests && <IntroRow icon={<Sparkles className="w-5 h-5" />}>Interests: {profile.interests}</IntroRow>}
                {profile.website && (
                  <IntroRow icon={<Globe className="w-5 h-5" />}>
                    <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{profile.website}</a>
                  </IntroRow>
                )}
                {profile.email && <IntroRow icon={<Mail className="w-5 h-5" />}>{profile.email}</IntroRow>}
                {profile.phone && <IntroRow icon={<Phone className="w-5 h-5" />}>{profile.phone}</IntroRow>}
              </div>
            ) : (
              !profile.bio && (
                <p className="text-muted-foreground text-sm">
                  {isOwnProfile ? "Add details about yourself." : "No details yet."}
                </p>
              )
            )}
          </div>

          {/* Friends */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Friends</h2>
              <Link href="/friends">
                <span className="text-primary text-sm hover:underline cursor-pointer">See all friends</span>
              </Link>
            </div>
            {profile.friendCount != null && (
              <p className="text-muted-foreground text-sm mb-3">{profile.friendCount} friends</p>
            )}
            {friends && friends.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {friends.slice(0, 9).map((f) => (
                  <Link key={f.id} href={`/profile/${f.id}`}>
                    <div className="cursor-pointer">
                      <img
                        src={f.avatarUrl || ""}
                        className="w-full aspect-square rounded-lg object-cover bg-muted"
                        alt={f.displayName}
                      />
                      <p className="text-xs font-medium mt-1 truncate">{f.displayName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No friends to show yet.</p>
            )}
          </div>

          {/* Photos */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h2 className="font-bold text-lg mb-3">Photos</h2>
            {photoUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    className="w-full aspect-square rounded-lg object-cover bg-muted"
                    alt="Photo"
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No photos yet.</p>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-bold text-lg px-2">Posts</h2>
          {postsLoading ? (
            <div className="py-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-10 bg-card border border-border rounded-xl text-muted-foreground">
              {isOwnProfile ? "You haven't posted anything yet." : "No posts yet"}
            </div>
          ) : (
            posts?.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </>
  );
}
