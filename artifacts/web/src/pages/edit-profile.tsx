import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";
import { useUpdateMyProfile, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Camera, ArrowLeft, Lock } from "lucide-react";
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
    bio: user?.bio || "",
    birthday: (user?.birthday || "").slice(0, 10),
    location: user?.location || "",
    hometown: user?.hometown || "",
    work: user?.work || "",
    education: user?.education || "",
    hobbies: user?.hobbies || "",
    interests: user?.interests || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
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

  const bioWords = (formData.bio || "").trim()
    ? (formData.bio || "").trim().split(/\s+/).length
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bioWords > 150) {
      toast.error("Bio cannot exceed 150 words");
      return;
    }
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
          <div>
            <h1 className="text-lg font-bold">Edit Profile</h1>
            <p className="text-xs text-muted-foreground">Manage your bio, avatar and details</p>
          </div>
        </div>

        {/* Cover + avatar editor */}
        <div className="relative">
          <div className="h-36 bg-muted relative">
            {coverUrl ? (
              <img src={coverUrl} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-600/30 to-pink-500/30" />
            )}
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
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploading === "cover"}
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm"
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
                src={avatarSrc(avatarUrl)}
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
          {/* Read-only Full Name with Settings link */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Full Name
              </Label>
              <Link href="/settings/account" className="text-xs text-primary font-semibold hover:underline">
                Change in Settings →
              </Link>
            </div>
            <Input
              value={user?.displayName || ""}
              disabled
              className="bg-muted/60 text-foreground font-semibold cursor-not-allowed opacity-90"
            />
            <p className="text-[11px] text-muted-foreground">
              Your name cannot be changed directly here. To change your name, please visit Account Settings.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className={`text-xs ${bioWords > 150 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                {bioWords}/150 words
              </span>
            </div>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => set("bio", e.target.value)}
              className={`bg-muted/50 resize-none ${bioWords > 150 ? "border-destructive focus-visible:ring-destructive" : ""}`}
              rows={3}
              placeholder="Write something about yourself (up to 150 words)"
            />
            {bioWords > 150 && (
              <p className="text-xs text-destructive">Bio cannot exceed 150 words.</p>
            )}
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
                <Input id="work" value={formData.work} onChange={(e) => set("work", e.target.value)} className="bg-muted/50" placeholder="Where do you work?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input id="education" value={formData.education} onChange={(e) => set("education", e.target.value)} className="bg-muted/50" placeholder="Where did you study?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Current city</Label>
                <Input id="location" value={formData.location} onChange={(e) => set("location", e.target.value)} className="bg-muted/50" placeholder="Where do you live now?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hometown">Hometown</Label>
                <Input id="hometown" value={formData.hometown} onChange={(e) => set("hometown", e.target.value)} className="bg-muted/50" placeholder="Your hometown" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hobbies">Hobbies</Label>
                <Input id="hobbies" value={formData.hobbies} onChange={(e) => set("hobbies", e.target.value)} className="bg-muted/50" placeholder="Cricket, music, cooking..." />
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
