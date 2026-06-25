import { MainLayout } from "@/components/layout/main-layout";
import { useListGroups, useGetGroup, useGetGroupPosts } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";

export default function GroupsPage() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <GroupDetail id={Number(id)} />;
  }

  return <GroupList />;
}

function GroupList() {
  const { data: groups, isLoading } = useListGroups();

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Groups</h1>
          <Button>Create Group</Button>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : groups?.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No groups found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups?.map(group => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="border border-border rounded-xl p-4 flex gap-4 hover:bg-muted/50 transition-colors group cursor-pointer">
                  <div className="w-20 h-20 rounded-xl bg-muted shrink-0 overflow-hidden">
                    {group.avatarUrl ? (
                      <img src={group.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <Users className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{group.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2 truncate">{group.description || "No description"}</p>
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {group.memberCount} members
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function GroupDetail({ id }: { id: number }) {
  const { data: group, isLoading: groupLoading } = useGetGroup(id);
  const { data: posts, isLoading: postsLoading } = useGetGroupPosts(id);

  if (groupLoading) {
    return <MainLayout><div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!group) {
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Group not found</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 animate-in fade-in">
        <div className="h-48 bg-muted relative">
          {group.coverUrl ? (
            <img src={group.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
          )}
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-extrabold">{group.name}</h1>
              <div className="text-muted-foreground flex items-center gap-2 mt-1 font-medium">
                <Users className="w-4 h-4" /> {group.privacy} group • {group.memberCount} members
              </div>
            </div>
            <Button variant={group.viewerIsMember ? "secondary" : "default"}>
              {group.viewerIsMember ? "Joined" : "Join Group"}
            </Button>
          </div>
          <p className="text-[15px]">{group.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2">Discussion</h2>
        {postsLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : posts?.length === 0 ? (
          <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">No posts yet. Start the discussion!</div>
        ) : (
          posts?.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </MainLayout>
  );
}