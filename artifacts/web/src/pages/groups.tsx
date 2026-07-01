import { MainLayout } from "@/components/layout/main-layout";
import {
  useListGroups,
  useGetGroup,
  useGetGroupPosts,
  useCreateGroup,
  useJoinGroup,
  useLeaveGroup,
  getListGroupsQueryKey,
  getGetGroupQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function GroupsPage() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <GroupDetail id={Number(id)} />;
  }

  return <GroupList />;
}

function GroupList() {
  const { data: groups, isLoading } = useListGroups();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createGroup = useCreateGroup();

  const handleCreate = () => {
    if (!name.trim()) return;
    createGroup.mutate(
      { data: { name: name.trim(), description: description.trim() || undefined } },
      {
        onSuccess: (group) => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setOpen(false);
          setName("");
          setDescription("");
          navigate(`/groups/${group.id}`);
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Groups</h1>
          <Button onClick={() => setOpen(true)}>Create Group</Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createGroup.isPending}>
              {createGroup.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function GroupDetail({ id }: { id: number }) {
  const { data: group, isLoading: groupLoading } = useGetGroup(id);
  const { data: posts, isLoading: postsLoading } = useGetGroupPosts(id);
  const queryClient = useQueryClient();

  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id) });
  };

  if (groupLoading) {
    return <MainLayout><div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!group) {
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Group not found</div></MainLayout>;
  }

  const handleMembership = () => {
    if (group.viewerIsMember) {
      leaveGroup.mutate({ id }, { onSuccess: invalidate });
    } else {
      joinGroup.mutate({ id }, { onSuccess: invalidate });
    }
  };

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
            <Button
              variant={group.viewerIsMember ? "secondary" : "default"}
              onClick={handleMembership}
              disabled={joinGroup.isPending || leaveGroup.isPending}
            >
              {(joinGroup.isPending || leaveGroup.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {group.viewerIsMember ? "Joined" : "Join Group"}
            </Button>
          </div>
          <p className="text-[15px]">{group.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2">Discussion</h2>
        {group.viewerIsMember ? (
          <PostComposer groupId={id} />
        ) : (
          <div className="py-4 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
            Join this group to post.
          </div>
        )}
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
