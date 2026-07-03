import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSavedAudiences,
  useCreateSavedAudience,
  useDeleteSavedAudience,
  getListSavedAudiencesQueryKey,
  type AdTargetingSpec,
  type SavedAudienceInput,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { useToast } from "@/hooks/use-toast";
import { NoAccount } from "@/components/no-account";
import { TargetingForm } from "@/components/targeting-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function specSummary(spec: AdTargetingSpec | undefined): string[] {
  if (!spec) return [];
  const out: string[] = [];
  if (spec.locations?.length) out.push(`Loc: ${spec.locations.join(", ")}`);
  if (spec.ageMin != null || spec.ageMax != null)
    out.push(`Age: ${spec.ageMin ?? 13}-${spec.ageMax ?? 65}`);
  if (spec.genders?.length) out.push(`Gender: ${spec.genders.join(", ")}`);
  if (spec.interests?.length) out.push(`Interests: ${spec.interests.join(", ")}`);
  if (spec.languages?.length) out.push(`Lang: ${spec.languages.join(", ")}`);
  return out;
}

export default function AudiencesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId } = useAccount();
  const accountId = selectedAccountId ?? 0;

  const { data: audiences, isLoading } = useListSavedAudiences(accountId, {
    query: {
      enabled: selectedAccountId != null,
      queryKey: getListSavedAudiencesQueryKey(accountId),
    },
  });
  const create = useCreateSavedAudience();
  const del = useDeleteSavedAudience();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState<AdTargetingSpec>({});

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListSavedAudiencesQueryKey(accountId) });

  if (selectedAccountId == null) return <NoAccount />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: SavedAudienceInput = { name: name.trim(), spec };
    create.mutate(
      { id: accountId, data },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          setName("");
          setSpec({});
          toast({ title: "Audience save hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Save hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  const remove = (id: number) =>
    del.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Audience delete hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Delete hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saved Audiences</h1>
          <p className="text-sm text-muted-foreground">
            Reusable targeting group toiri korun.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-audience">
              <Plus className="mr-2 h-4 w-4" /> New audience
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New saved audience</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <TargetingForm value={spec} onChange={setSpec} />
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Save hocche..." : "Save audience"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !audiences || audiences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Kono saved audience nei.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{a.name}</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete audience?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{a.name}" delete hobe.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(a.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {specSummary(a.spec).length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Broad (no filters)
                  </span>
                ) : (
                  specSummary(a.spec).map((s, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
