import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdCreatives,
  useCreateAdCreative,
  useDeleteAdCreative,
  getListAdCreativesQueryKey,
  type AdCreativeInput,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { useToast } from "@/hooks/use-toast";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, Upload } from "lucide-react";

type Format = NonNullable<AdCreativeInput["format"]>;
type Cta = NonNullable<AdCreativeInput["callToAction"]>;
const FORMATS: Format[] = ["single_image", "video", "carousel"];
const CTAS: Cta[] = [
  "learn_more",
  "shop_now",
  "sign_up",
  "book_now",
  "contact_us",
  "download",
  "none",
];

function toList(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CreativesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId } = useAccount();
  const accountId = selectedAccountId ?? 0;
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: creatives, isLoading } = useListAdCreatives(accountId, {
    query: {
      enabled: selectedAccountId != null,
      queryKey: getListAdCreativesQueryKey(accountId),
    },
  });
  const create = useCreateAdCreative();
  const del = useDeleteAdCreative();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("single_image");
  const [cta, setCta] = useState<Cta>("learn_more");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaText, setMediaText] = useState("");
  const [uploading, setUploading] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAdCreativesQueryKey(accountId) });

  if (selectedAccountId == null) return <NoAccount />;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadMedia(file);
      setMediaText((prev) => (prev ? `${prev}\n${url}` : url));
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        toast({
          title: "Upload unavailable",
          description: "Paste the media URL manually.",
        });
      } else {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdCreativeInput = {
      name: name.trim(),
      format,
      callToAction: cta,
      headline: headline.trim() || undefined,
      primaryText: primaryText.trim() || undefined,
      description: description.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      mediaUrls: toList(mediaText),
    };
    create.mutate(
      { id: accountId, data },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          setName("");
          setHeadline("");
          setPrimaryText("");
          setDescription("");
          setLinkUrl("");
          setMediaText("");
          toast({ title: "Creative created" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't create",
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
          toast({ title: "Creative deleted" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't delete",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creatives</h1>
          <p className="text-sm text-muted-foreground">
            Ad image, text and call-to-action.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-creative">
              <Plus className="mr-2 h-4 w-4" /> New creative
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New creative</DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Call to action</Label>
                  <Select value={cta} onValueChange={(v) => setCta(v as Cta)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Primary text</Label>
                <Textarea
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link URL</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Media URLs</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </div>
                <Textarea
                  placeholder="https://... (each line ekta URL)"
                  value={mediaText}
                  onChange={(e) => setMediaText(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Creating..." : "Create creative"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !creatives || creatives.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No creatives yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creatives.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              {c.mediaUrls[0] ? (
                <div className="aspect-video w-full bg-muted">
                  <img
                    src={c.mediaUrls[0]}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete creative?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{c.name}" will be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(c.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.headline ? (
                  <p className="text-sm font-medium">{c.headline}</p>
                ) : null}
                {c.primaryText ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {c.primaryText}
                  </p>
                ) : null}
                <div className="flex gap-1.5">
                  <Badge variant="secondary" className="font-normal">
                    {c.format.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {c.callToAction.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
