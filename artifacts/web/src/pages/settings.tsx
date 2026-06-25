import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/lib/auth";
import { useUpdateMyProfile, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    work: user?.work || "",
  });
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl || "");
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  const handleImageUpload = async (file: File, kind: "avatar" | "cover") => {
    setUploading(kind);
    try {
      const media = await uploadMedia(file);
      if (kind === "avatar") setAvatarUrl(media.url);
      else setCoverUrl(media.url);
      toast.success(`${kind === "avatar" ? "Avatar" : "Cover photo"} uploaded`);
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          `Direct upload isn't available here. Paste an image URL for your ${kind === "avatar" ? "avatar" : "cover photo"}:`,
        );
        if (url && url.trim()) {
          if (kind === "avatar") setAvatarUrl(url.trim());
          else setCoverUrl(url.trim());
        }
      } else {
        toast.error("Upload failed. Please try again.");
      }
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      {
        data: {
          ...formData,
          avatarUrl: avatarUrl || undefined,
          coverUrl: coverUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success("Profile updated successfully");
        },
        onError: () => {
          toast.error("Failed to update profile");
        },
      },
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl shadow-sm animate-in fade-in max-w-2xl mx-auto overflow-hidden">
        <div className="flex justify-between items-center px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Button variant="destructive" onClick={signOut}>Sign Out</Button>
        </div>

        {/* Cover + avatar editor */}
        <div className="relative">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f, "cover");
              e.target.value = "";
            }}
          />
          <div className="h-44 bg-muted relative">
            {coverUrl ? (
              <img src={coverUrl} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
            )}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploading === "cover"}
              className="absolute bottom-3 right-3 bg-card/90 hover:bg-card text-foreground px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow"
            >
              {uploading === "cover" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Edit cover
            </button>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f, "avatar");
              e.target.value = "";
            }}
          />
          <div className="px-6">
            <div className="relative inline-block -mt-14">
              <img
                src={avatarUrl || ""}
                className="w-28 h-28 rounded-full border-4 border-card object-cover bg-muted"
                alt="Avatar"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading === "avatar"}
                className="absolute bottom-1 right-1 bg-primary text-primary-foreground w-9 h-9 rounded-full flex items-center justify-center shadow hover:bg-primary/90"
              >
                {uploading === "avatar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input 
              id="displayName" 
              value={formData.displayName} 
              onChange={e => setFormData({ ...formData, displayName: e.target.value })} 
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              value={formData.bio} 
              onChange={e => setFormData({ ...formData, bio: e.target.value })} 
              className="bg-muted/50 resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                value={formData.location} 
                onChange={e => setFormData({ ...formData, location: e.target.value })} 
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work">Work</Label>
              <Input 
                id="work" 
                value={formData.work} 
                onChange={e => setFormData({ ...formData, work: e.target.value })} 
                className="bg-muted/50"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
