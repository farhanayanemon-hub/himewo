import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListGroups,
  useGetGroup,
  useGetGroupPosts,
  useCreateGroup,
  useJoinGroup,
  useLeaveGroup,
  useUpdateGroup,
  useListGroupMembers,
  useListGroupRequests,
  useApproveGroupRequest,
  useDeclineGroupRequest,
  useSetGroupMemberRole,
  useBanGroupMember,
  useMuteGroupMember,
  useRemoveGroupMember,
  useListPendingGroupPosts,
  useApproveGroupPost,
  useRejectGroupPost,
  useInviteToGroup,
  useListGroupInvites,
  useDeclineGroupInvite,
  useListFriends,
  getListGroupsQueryKey,
  getGetGroupQueryKey,
  getListGroupMembersQueryKey,
  getListGroupRequestsQueryKey,
  getListPendingGroupPostsQueryKey,
  getGetGroupPostsQueryKey,
  getListGroupInvitesQueryKey,
  getListFriendsQueryKey,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Lock, EyeOff, Globe, Pin, Shield, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

type Privacy = "public" | "private" | "hidden";

function privacyIcon(privacy: string) {
  if (privacy === "hidden") return <EyeOff className="w-4 h-4" />;
  if (privacy === "private" || privacy === "friends")
    return <Lock className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
}

export default function GroupsPage() {
  const { id } = useParams<{ id: string }>();
  if (id) return <GroupDetail id={Number(id)} />;
  return <GroupList />;
}

function GroupInviteRow({
  group,
}: {
  group: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    memberCount: number;
    privacy: string;
  };
}) {
  const queryClient = useQueryClient();
  const joinGroup = useJoinGroup();
  const declineInvite = useDeclineGroupInvite();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) });
  };

  return (
    <div className="flex items-center gap-3 border border-border rounded-xl p-3">
      <Link href={`/groups/${group.id}`} className="shrink-0">
        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden">
          {group.avatarUrl ? (
            <img src={avatarSrc(group.avatarUrl)} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/groups/${group.id}`} className="font-semibold truncate hover:underline block">
          {group.name}
        </Link>
        <div className="text-xs text-muted-foreground flex items-center gap-2 capitalize">
          {privacyIcon(group.privacy)} {group.privacy} • {group.memberCount} members
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => joinGroup.mutate({ id: group.id, data: {} }, { onSuccess: invalidate })}
          disabled={joinGroup.isPending || declineInvite.isPending}
        >
          {joinGroup.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Join
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => declineInvite.mutate({ id: group.id }, { onSuccess: invalidate })}
          disabled={joinGroup.isPending || declineInvite.isPending}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

function InviteGroupFriendsDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: friends, isLoading } = useListFriends({
    query: { enabled: open, queryKey: getListFriendsQueryKey() },
  });
  const inviteToGroup = useInviteToGroup();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleInvite = () => {
    if (selected.length === 0) return;
    inviteToGroup.mutate(
      { id: groupId, data: { userIds: selected } },
      {
        onSuccess: () => {
          setSelected([]);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelected([]);
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : friends?.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">No friends to invite.</div>
          ) : (
            <div className="space-y-1">
              {friends?.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Checkbox checked={selected.includes(f.id)} className="pointer-events-none" />
                  <img src={avatarSrc(f.avatarUrl)} className="w-10 h-10 rounded-full object-cover bg-muted shrink-0" alt="" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.displayName || f.username}</div>
                    {f.username && <div className="text-xs text-muted-foreground truncate">@{f.username}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={selected.length === 0 || inviteToGroup.isPending}>
            {inviteToGroup.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Send{selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupList() {
  const { data: groups, isLoading } = useListGroups();
  const { data: invites } = useListGroupInvites();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      setOpen(true);
      window.history.replaceState({}, "", "/groups");
    }
  }, []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [rules, setRules] = useState("");
  const [requirePostApproval, setRequirePostApproval] = useState(false);
  const [questions, setQuestions] = useState("");

  const createGroup = useCreateGroup();

  const handleCreate = () => {
    if (!name.trim()) return;
    const joinQuestions = questions
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
    createGroup.mutate(
      {
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          privacy,
          rules: rules.trim() || undefined,
          requirePostApproval,
          joinQuestions: joinQuestions.length ? joinQuestions : undefined,
        },
      },
      {
        onSuccess: (group) => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setOpen(false);
          setName("");
          setDescription("");
          setPrivacy("public");
          setRules("");
          setRequirePostApproval(false);
          setQuestions("");
          navigate(`/groups/${group.id}`);
        },
      },
    );
  };

  return (
    <MainLayout>
      {invites && invites.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-4 animate-in fade-in">
          <h2 className="text-lg font-bold mb-3">Group invites</h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <GroupInviteRow key={invite.id} group={invite} />
            ))}
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Groups</h1>
          <Button onClick={() => setOpen(true)}>Create Group</Button>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : groups?.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No groups found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups?.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="border border-border rounded-xl p-4 flex gap-4 hover:bg-muted/50 transition-colors group cursor-pointer">
                  <div className="w-20 h-20 rounded-xl bg-muted shrink-0 overflow-hidden">
                    {group.avatarUrl ? (
                      <img
                        src={avatarSrc(group.avatarUrl)}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <Users className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 truncate">
                      {group.description || "No description"}
                    </p>
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center gap-1 capitalize">
                        {privacyIcon(group.privacy)} {group.privacy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {group.memberCount}
                      </span>
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
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select
                value={privacy}
                onValueChange={(v) => setPrivacy(v as Privacy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — anyone can join</SelectItem>
                  <SelectItem value="private">
                    Private — admin approves requests
                  </SelectItem>
                  <SelectItem value="hidden">
                    Hidden — private and unlisted
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-rules">Rules (optional)</Label>
              <Textarea
                id="group-rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Group rules members should follow"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-questions">
                Join questions (optional, one per line)
              </Label>
              <Textarea
                id="group-questions"
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder={"Why do you want to join?\nWhere are you from?"}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="approval">Require post approval</Label>
              <Switch
                id="approval"
                checked={requirePostApproval}
                onCheckedChange={setRequirePostApproval}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createGroup.isPending}
            >
              {createGroup.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
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
  const { user } = useAuth();

  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();

  const [joinOpen, setJoinOpen] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const isMod = group?.viewerRole === "admin" || group?.viewerRole === "moderator";
  const isAdmin = group?.viewerRole === "admin";

  const invalidateGroup = () => {
    queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id) });
  };

  if (groupLoading) {
    return (
      <MainLayout>
        <div className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!group) {
    return (
      <MainLayout>
        <div className="py-10 text-center text-muted-foreground">
          Group not found
        </div>
      </MainLayout>
    );
  }

  const hasQuestions =
    (group.joinQuestions?.length ?? 0) > 0 && group.privacy !== "public";

  const doJoin = (submitAnswers?: string[]) => {
    joinGroup.mutate(
      { id, data: submitAnswers ? { answers: submitAnswers } : {} },
      {
        onSuccess: () => {
          invalidateGroup();
          setJoinOpen(false);
        },
      },
    );
  };

  const handleJoinClick = () => {
    if (hasQuestions) {
      setAnswers(new Array(group.joinQuestions!.length).fill(""));
      setJoinOpen(true);
    } else {
      doJoin();
    }
  };

  const handleLeave = () => {
    leaveGroup.mutate({ id }, { onSuccess: invalidateGroup });
  };

  const membershipButton = () => {
    if (group.viewerStatus === "banned") {
      return (
        <Badge variant="destructive" className="h-9 px-3">
          You are banned
        </Badge>
      );
    }
    if (group.viewerStatus === "pending") {
      return (
        <Button variant="secondary" disabled>
          Request sent
        </Button>
      );
    }
    if (group.viewerIsMember) {
      return (
        <Button
          variant="secondary"
          onClick={handleLeave}
          disabled={leaveGroup.isPending}
        >
          {leaveGroup.isPending && (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          )}
          Leave
        </Button>
      );
    }
    return (
      <Button onClick={handleJoinClick} disabled={joinGroup.isPending}>
        {joinGroup.isPending && (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        )}
        {group.privacy === "public" ? "Join Group" : "Request to Join"}
      </Button>
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 animate-in fade-in">
        <div className="h-48 bg-muted relative">
          {group.coverUrl ? (
            <img
              src={group.coverUrl}
              className="w-full h-full object-cover"
              alt="Cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
          )}
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold">{group.name}</h1>
              <div className="text-muted-foreground flex items-center gap-2 mt-1 font-medium capitalize">
                {privacyIcon(group.privacy)} {group.privacy} group •{" "}
                {group.memberCount} members
                {group.viewerRole && group.viewerRole !== "member" && (
                  <Badge variant="secondary" className="capitalize ml-1">
                    <Shield className="w-3 h-3 mr-1" />
                    {group.viewerRole}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {group.viewerIsMember && (
                <Button variant="secondary" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              )}
              {membershipButton()}
            </div>
          </div>
          {group.description && (
            <p className="text-[15px]">{group.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="discussion">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isMod && (
            <TabsTrigger value="requests">Requests</TabsTrigger>
          )}
          {isMod && group.requirePostApproval && (
            <TabsTrigger value="pending">Pending posts</TabsTrigger>
          )}
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="discussion" className="space-y-4">
          {group.viewerIsMember ? (
            group.viewerIsMuted ? (
              <div className="py-4 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
                You are muted in this group and cannot post.
              </div>
            ) : (
              <PostComposer groupId={id} />
            )
          ) : (
            <div className="py-4 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
              Join this group to post.
            </div>
          )}
          {postsLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : posts?.length === 0 ? (
            <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">
              No posts yet. Start the discussion!
            </div>
          ) : (
            posts?.map((post) => (
              <div key={post.id} className="space-y-1">
                {post.id === group.pinnedPostId && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary px-2">
                    <Pin className="w-3 h-3" /> Pinned post
                  </div>
                )}
                {isMod && (
                  <div className="flex justify-end">
                    <PinButton
                      groupId={id}
                      postId={post.id}
                      pinned={post.id === group.pinnedPostId}
                      onDone={invalidateGroup}
                    />
                  </div>
                )}
                <PostCard post={post} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="about">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground">
                {group.description || "No description."}
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-1">Rules</h3>
              {group.rules ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {group.rules}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No rules set.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <MembersTab
            groupId={id}
            canManage={isMod}
            isAdmin={isAdmin}
            viewerId={user?.id}
          />
        </TabsContent>

        {isMod && (
          <TabsContent value="requests">
            <RequestsTab groupId={id} />
          </TabsContent>
        )}

        {isMod && group.requirePostApproval && (
          <TabsContent value="pending">
            <PendingPostsTab groupId={id} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings">
            <SettingsTab group={group} onSaved={invalidateGroup} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Answer to join</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {group.joinQuestions?.map((q, i) => (
              <div key={i} className="space-y-2">
                <Label>{q}</Label>
                <Textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => doJoin(answers)}
              disabled={joinGroup.isPending}
            >
              {joinGroup.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteGroupFriendsDialog groupId={id} open={inviteOpen} onOpenChange={setInviteOpen} />
    </MainLayout>
  );
}

function PinButton({
  groupId,
  postId,
  pinned,
  onDone,
}: {
  groupId: number;
  postId: number;
  pinned: boolean;
  onDone: () => void;
}) {
  const updateGroup = useUpdateGroup();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      disabled={updateGroup.isPending}
      onClick={() =>
        updateGroup.mutate(
          { id: groupId, data: { pinnedPostId: pinned ? null : postId } },
          { onSuccess: onDone },
        )
      }
    >
      <Pin className="w-3 h-3 mr-1" />
      {pinned ? "Unpin" : "Pin"}
    </Button>
  );
}

function MemberRow({
  groupId,
  member,
  canManage,
  isAdmin,
  isOwnerRow,
  viewerId,
}: {
  groupId: number;
  member: {
    user: { id: string; displayName?: string | null; username: string; avatarUrl?: string | null };
    role: string;
    isMuted: boolean;
  };
  canManage: boolean;
  isAdmin: boolean;
  isOwnerRow: boolean;
  viewerId?: string;
}) {
  const queryClient = useQueryClient();
  const setRole = useSetGroupMemberRole();
  const banMember = useBanGroupMember();
  const muteMember = useMuteGroupMember();
  const removeMember = useRemoveGroupMember();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getListGroupMembersQueryKey(groupId),
    });
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
  };

  const isSelf = viewerId === member.user.id;
  const showControls = canManage && !isOwnerRow && !isSelf;
  const targetIsAdmin = member.role === "admin";
  const canActOnTarget = isAdmin || !targetIsAdmin;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <Avatar className="w-10 h-10">
        <AvatarImage src={member.user.avatarUrl ?? undefined} />
        <AvatarFallback>
          {(member.user.displayName || member.user.username)
            .charAt(0)
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {member.user.displayName || member.user.username}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="capitalize">{member.role}</span>
          {member.isMuted && <Badge variant="secondary">Muted</Badge>}
        </div>
      </div>
      {showControls && canActOnTarget && (
        <div className="flex items-center gap-2">
          {isAdmin && member.role !== "admin" && (
            <Select
              value={member.role}
              onValueChange={(role) =>
                setRole.mutate(
                  { id: groupId, userId: member.user.id, data: { role: role as "moderator" | "member" } },
                  { onSuccess: invalidate },
                )
              }
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() =>
              muteMember.mutate(
                {
                  id: groupId,
                  userId: member.user.id,
                  data: { muted: !member.isMuted },
                },
                { onSuccess: invalidate },
              )
            }
          >
            {member.isMuted ? "Unmute" : "Mute"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() =>
              removeMember.mutate(
                { id: groupId, userId: member.user.id },
                { onSuccess: invalidate },
              )
            }
          >
            Remove
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive"
            onClick={() =>
              banMember.mutate(
                { id: groupId, userId: member.user.id },
                { onSuccess: invalidate },
              )
            }
          >
            Ban
          </Button>
        </div>
      )}
    </div>
  );
}

function MembersTab({
  groupId,
  canManage,
  isAdmin,
  viewerId,
}: {
  groupId: number;
  canManage: boolean;
  isAdmin: boolean;
  viewerId?: string;
}) {
  const { data: members, isLoading } = useListGroupMembers(groupId);

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!members || members.length === 0) {
    return (
      <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">
        No members.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {members.map((m) => (
        <MemberRow
          key={m.user.id}
          groupId={groupId}
          member={m}
          canManage={canManage}
          isAdmin={isAdmin}
          isOwnerRow={m.role === "admin"}
          viewerId={viewerId}
        />
      ))}
    </div>
  );
}

function RequestsTab({ groupId }: { groupId: number }) {
  const { data: requests, isLoading } = useListGroupRequests(groupId);
  const queryClient = useQueryClient();
  const approve = useApproveGroupRequest();
  const decline = useDeclineGroupRequest();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getListGroupRequestsQueryKey(groupId),
    });
    queryClient.invalidateQueries({
      queryKey: getListGroupMembersQueryKey(groupId),
    });
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
  };

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!requests || requests.length === 0) {
    return (
      <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">
        No pending requests.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {requests.map((r) => (
        <div
          key={r.user.id}
          className="border-b border-border last:border-0 pb-4 last:pb-0"
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={r.user.avatarUrl ?? undefined} />
              <AvatarFallback>
                {(r.user.displayName || r.user.username)
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 font-medium truncate">
              {r.user.displayName || r.user.username}
            </div>
            <Button
              size="sm"
              onClick={() =>
                approve.mutate(
                  { id: groupId, userId: r.user.id },
                  { onSuccess: invalidate },
                )
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                decline.mutate(
                  { id: groupId, userId: r.user.id },
                  { onSuccess: invalidate },
                )
              }
            >
              Decline
            </Button>
          </div>
          {r.answers && r.answers.length > 0 && (
            <div className="mt-2 pl-13 space-y-1 text-sm text-muted-foreground">
              {r.answers.map((a, i) => (
                <p key={i}>• {a}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PendingPostsTab({ groupId }: { groupId: number }) {
  const { data: posts, isLoading } = useListPendingGroupPosts(groupId);
  const queryClient = useQueryClient();
  const approve = useApproveGroupPost();
  const reject = useRejectGroupPost();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getListPendingGroupPostsQueryKey(groupId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetGroupPostsQueryKey(groupId),
    });
  };

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!posts || posts.length === 0) {
    return (
      <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">
        No posts awaiting approval.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="space-y-2">
          <PostCard post={post} />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              onClick={() =>
                approve.mutate(
                  { id: groupId, postId: post.id },
                  { onSuccess: invalidate },
                )
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                reject.mutate(
                  { id: groupId, postId: post.id },
                  { onSuccess: invalidate },
                )
              }
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({
  group,
  onSaved,
}: {
  group: {
    id: number;
    name: string;
    description?: string | null;
    privacy: string;
    rules?: string | null;
    requirePostApproval: boolean;
    joinQuestions?: string[] | null;
  };
  onSaved: () => void;
}) {
  const updateGroup = useUpdateGroup();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [privacy, setPrivacy] = useState<Privacy>(
    (group.privacy === "friends" ? "private" : group.privacy) as Privacy,
  );
  const [rules, setRules] = useState(group.rules ?? "");
  const [requirePostApproval, setRequirePostApproval] = useState(
    group.requirePostApproval,
  );
  const [questions, setQuestions] = useState(
    (group.joinQuestions ?? []).join("\n"),
  );

  const handleSave = () => {
    const joinQuestions = questions
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
    updateGroup.mutate(
      {
        id: group.id,
        data: {
          name: name.trim() || undefined,
          description: description.trim() || null,
          privacy,
          rules: rules.trim() || null,
          requirePostApproval,
          joinQuestions,
        },
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Privacy</Label>
        <Select value={privacy} onValueChange={(v) => setPrivacy(v as Privacy)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Rules</Label>
        <Textarea value={rules} onChange={(e) => setRules(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Join questions (one per line)</Label>
        <Textarea
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="settings-approval">Require post approval</Label>
        <Switch
          id="settings-approval"
          checked={requirePostApproval}
          onCheckedChange={setRequirePostApproval}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateGroup.isPending}>
          {updateGroup.isPending && (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
