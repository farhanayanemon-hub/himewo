import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdAccountMembers,
  useAddAdAccountMember,
  useUpdateAdAccountMember,
  useRemoveAdAccountMember,
  getListAdAccountMembersQueryKey,
  type AdAccountMemberInput,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatDay } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";

type Role = AdAccountMemberInput["role"];
const ROLES: Role[] = ["admin", "advertiser", "analyst"];

export default function TeamPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId } = useAccount();
  const accountId = selectedAccountId ?? 0;

  const { data: members, isLoading } = useListAdAccountMembers(accountId, {
    query: {
      enabled: selectedAccountId != null,
      queryKey: getListAdAccountMembersQueryKey(accountId),
    },
  });
  const add = useAddAdAccountMember();
  const update = useUpdateAdAccountMember();
  const remove = useRemoveAdAccountMember();

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("advertiser");

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: getListAdAccountMembersQueryKey(accountId),
    });

  if (selectedAccountId == null) return <NoAccount />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdAccountMemberInput = { userId: userId.trim(), role };
    add.mutate(
      { id: accountId, data },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          setUserId("");
          toast({ title: "Member add hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Add hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  const changeRole = (memberId: number, newRole: Role) =>
    update.mutate(
      { id: accountId, memberId, data: { role: newRole } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Role update hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Update hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  const kick = (memberId: number) =>
    remove.mutate(
      { id: accountId, memberId },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Member remove hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Remove hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Ei ad account ke ke access pabe ta thik korun.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-member">
              <Plus className="mr-2 h-4 w-4" /> Add member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>User ID</Label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="User er UUID"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={add.isPending}>
                  {add.isPending ? "Add hocche..." : "Add member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !members || members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Kono team member nei.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback>
                          {(m.profile?.displayName ?? "U")
                            .slice(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {m.profile?.displayName ?? m.userId}
                        </div>
                        {m.profile?.username ? (
                          <div className="text-xs text-muted-foreground">
                            @{m.profile.username}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      onValueChange={(v) => changeRole(m.id, v as Role)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDay(m.createdAt)}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ei member ar access pabe na.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => kick(m.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
