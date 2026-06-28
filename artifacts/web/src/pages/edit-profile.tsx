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
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { Link, useLocation } from "wouter";

export default function EditProfilePage() {
  const { user } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    birthday: (user?.birthday || "").slice(0, 10),
    location: user?.location || "",
    hometown: user?.hometown || "",
    work: user?.work || "",
    education: user?.education || "",
    hobbies: user?.hobbies || "",
    interests: user?.interests || "",
    website: user?.website || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl || "");
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  const set = (key: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleImageUpload = async (file: File, kind: "avatar" | "cover") => {
    setUploading(kind);
    try {
      const media = await uploadMedia(file);
      if (kind === "avatar") setAvatarUrl(media.url);
      else setCoverUrl(media.url);
      toast.success(`${kind === "avatar" ? "Profile picture" : "Cover photo"} uploaded`);
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          `Direct upload isn't available here. Paste an image URL for your ${kind === "avatar" ? "profile picture" : "cover photo"}:`,
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
    const payload = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, v.trim()]),
    ) as typeof formData;
    updateProfile.mutate(
      {
        data: {
          ...payload,
          avatarUrl: avatarUrl || undefined,
          coverUrl: coverUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success("Profile updated");
          navigate("/me");
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
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <Link href="/me">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit profile</h1>
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
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" value={formData.displayName} onChange={(e) => set("displayName", e.target.value)} className="bg-muted/50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio / Intro</Label>
            <Textarea id="bio" value={formData.bio} onChange={(e) => set("bio", e.target.value)} className="bg-muted/50 resize-none" rows={3} placeholder="Nijer somporke kichu likhun" />
          </div>

          <div>
            <h2 className="font-semibold text-sm text-muted-foreground mb-3">About you</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input id="birthday" type="date" value={formData.birthday} onChange={(e) => set("birthday", e.target.value)} className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work">Work</Label>
                <Input id="work" value={formData.work} onChange={(e) => set("work", e.target.value)} className="bg-muted/50" placeholder="Kothay kaj koren" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input id="education" value={formData.education} onChange={(e) => set("education", e.target.value)} className="bg-muted/50" placeholder="Kothay porashona korechen" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Current city</Label>
                <Input id="location" value={formData.location} onChange={(e) => set("location", e.target.value)} className="bg-muted/50" placeholder="Ekhon kothay thaken" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hometown">Hometown</Label>
                <Input id="hometown" value={formData.hometown} onChange={(e) => set("hometown", e.target.value)} className="bg-muted/50" placeholder="Apnar nijer elaka" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hobbies">Hobbies</Label>
                <Input id="hobbies" value={formData.hobbies} onChange={(e) => set("hobbies", e.target.value)} className="bg-muted/50" placeholder="Cricket, gaan, ranna..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <Input id="interests" value={formData.interests} onChange={(e) => set("interests", e.target.value)} className="bg-muted/50" placeholder="Travel, technology..." />
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-sm text-muted-foreground mb-3">Contact info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => set("phone", e.target.value)} className="bg-muted/50" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formData.website} onChange={(e) => set("website", e.target.value)} className="bg-muted/50" placeholder="https://..." />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Link href="/me">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
