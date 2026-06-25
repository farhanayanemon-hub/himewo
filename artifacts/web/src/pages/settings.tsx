import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/lib/auth";
import { useUpdateMyProfile, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    work: user?.work || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success("Profile updated successfully");
        },
        onError: () => {
          toast.error("Failed to update profile");
        }
      }
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-in fade-in max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Button variant="destructive" onClick={signOut}>Sign Out</Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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