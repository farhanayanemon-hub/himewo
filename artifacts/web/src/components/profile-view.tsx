import { useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { Link } from "wouter";
import {
  useGetUserFriends,
  getGetUserFriendsQueryKey,
  getGetUserPostsQueryKey,
  useGetUserAlbums,
  getGetUserAlbumsQueryKey,
  useUpdateMyProfile,
  getGetUserQueryKey,
  type Profile,
  type Post,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PhotoActionMenu, usePhotoEditor } from "@/components/photo-editor";
import { PostCard } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { PostComposer } from "@/components/post-composer";
import { CreateAlbumDialog } from "@/components/create-album-dialog";
import { MediaLightbox } from "@/components/media-grid";
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
  Lock,
  Images,
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
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState<number | null>(null);

  const afterPhotoSave = async (data: { avatarUrl?: string; coverUrl?: string }) => {
    await updateProfile.mutateAsync({ data });
    await refreshUser();
    queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
  };

  const avatarEditor = usePhotoEditor({
    kind: "avatar",
    photoUrl: profile.avatarUrl,
    onSaved: (url) => afterPhotoSave({ avatarUrl: url }),
  });
  const coverEditor = usePhotoEditor({
    kind: "cover",
    photoUrl: profile.coverUrl,
    onSaved: (url) => afterPhotoSave({ coverUrl: url }),
  });
  const isLocked = Boolean(profile.isLocked);
  const showLocked = isLocked && !isOwnProfile && !profile.viewerIsFriend;

  const { data: friends } = useGetUserFriends(
    userId,
    undefined,
    {
      query: {
        enabled: !!userId && !showLocked,
        queryKey: getGetUserFriendsQueryKey(userId),
      },
    },
  );

  const { data: albums } = useGetUserAlbums(userId, {
    query: {
      enabled: !!userId && !showLocked,
      queryKey: getGetUserAlbumsQueryKey(userId),
    },
  });

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
      <div className="aurora-glass-card rounded-2xl overflow-hidden mb-4">
        <PhotoActionMenu
          photoUrl={profile.coverUrl}
          kind="cover"
          canChange={isOwnProfile}
          onView={coverEditor.onView}
          onPickFile={coverEditor.onPickFile}
        >
          <div className="h-48 md:h-64 bg-muted relative">
            {profile.coverUrl ? (
              <img src={profile.coverUrl} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-teal-400/50 via-purple-400/50 to-pink-400/50" />
            )}
          </div>
        </PhotoActionMenu>
        <div className="px-6 pb-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
            <div className="relative z-10 w-32 shrink-0">
              <PhotoActionMenu
                photoUrl={profile.avatarUrl}
                kind="avatar"
                canChange={isOwnProfile}
                onView={avatarEditor.onView}
                onPickFile={avatarEditor.onPickFile}
              >
                <img
                  src={avatarSrc(profile.avatarUrl)}
                  className="w-32 h-32 rounded-full border-4 border-card object-cover bg-muted"
                  alt="Avatar"
                />
              </PhotoActionMenu>
            </div>
            <div className="flex-1 sm:pb-2">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {profile.displayName}
                {profile.isVerified && <VerifiedBadge className="w-6 h-6" />}
                {isLocked && (
                  <Lock className="w-5 h-5 text-muted-foreground" aria-label="Locked profile" />
                )}
              </h1>
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

      {showLocked ? (
        <div className="aurora-glass-card rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="font-bold text-lg mb-1">This profile is locked</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Only {profile.displayName}'s friends can see their posts, photos and details.
          </p>
        </div>
      ) : (
      /* Two-column: Intro + Friends + Photos | Posts */
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Intro */}
          <div className="aurora-glass-card rounded-2xl p-4">
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
          <div className="aurora-glass-card rounded-2xl p-4">
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
                        src={avatarSrc(f.avatarUrl)}
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

          {/* Groups */}
          {isOwnProfile && (
            <div className="aurora-glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Groups</h2>
                <Link href="/groups?create=1">
                  <span className="text-primary text-sm hover:underline cursor-pointer">Create group</span>
                </Link>
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Start a group to connect with people who share your interests.
              </p>
            </div>
          )}

          {/* Photos */}
          <div className="aurora-glass-card rounded-2xl p-4">
            <h2 className="font-bold text-lg mb-3">Photos</h2>
            {photoUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url, i) => (
                  <button key={i} onClick={() => setPhotoOpen(i)}>
                    <img
                      src={url}
                      className="w-full aspect-square rounded-lg object-cover bg-muted hover:opacity-90 transition-opacity"
                      alt="Photo"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No photos yet.</p>
            )}
            {photoOpen != null && (
              <MediaLightbox
                items={photoUrls.map((url) => ({ url, type: "image" }))}
                index={photoOpen}
                onClose={() => setPhotoOpen(null)}
                onIndexChange={setPhotoOpen}
              />
            )}
          </div>

          {/* Albums */}
          <div className="aurora-glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Albums</h2>
              {isOwnProfile && (
                <button
                  onClick={() => setCreateAlbumOpen(true)}
                  className="text-primary text-sm hover:underline"
                >
                  Create album
                </button>
              )}
            </div>
            {albums && albums.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {albums.map((a) => (
                  <Link key={a.id} href={`/albums/${a.id}`}>
                    <div className="cursor-pointer group">
                      {a.coverUrl ? (
                        <img
                          src={a.coverUrl}
                          className="w-full aspect-square rounded-lg object-cover bg-muted group-hover:opacity-90 transition-opacity"
                          alt={a.name}
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                          <Images className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm font-medium mt-1 truncate group-hover:underline">
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.photoCount} photo{a.photoCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isOwnProfile
                  ? "Create your first album to organize photos."
                  : "No albums yet."}
              </p>
            )}
          </div>
          {isOwnProfile && (
            <CreateAlbumDialog
              open={createAlbumOpen}
              onOpenChange={setCreateAlbumOpen}
              userId={userId}
            />
          )}
        </div>

        {/* Posts */}
        <div className="lg:col-span-3 space-y-4">
          {isOwnProfile && (
            <PostComposer
              onPosted={() =>
                queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) })
              }
            />
          )}
          <h2 className="font-bold text-lg px-2">Posts</h2>
          {postsLoading ? (
            <div className="py-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-10 aurora-glass-card rounded-2xl text-muted-foreground">
              {isOwnProfile ? "You haven't posted anything yet." : "No posts yet"}
            </div>
          ) : (
            posts?.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
      )}
      {avatarEditor.dialogs}
      {coverEditor.dialogs}
    </>
  );
}
