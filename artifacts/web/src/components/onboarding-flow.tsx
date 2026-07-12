import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetFriendSuggestions,
  getGetFriendSuggestionsQueryKey,
  useUpdateMyProfile,
  useSendFriendRequest,
  useCompleteOnboarding,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { avatarSrc } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  Image as ImageIcon,
  UserPlus,
  Check,
  PartyPopper,
} from "lucide-react";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";

type Step = "photo" | "cover" | "bio" | "friends" | "done";

const STEPS: Step[] = ["photo", "cover", "bio", "friends"];

/**
 * One-time post-signup onboarding: profile photo → cover → bio → 5 friend
 * requests → celebration. Shown as a full-screen takeover on small screens
 * and a centered card on desktop. Every step can be skipped; finishing (or
 * skipping through) marks onboarding complete server-side.
 */
export function OnboardingFlow() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("photo");

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateMyProfile();
  const sendRequest = useSendFriendRequest();
  const completeOnboarding = useCompleteOnboarding();

  const suggestionsParams = { mode: "onboarding" as const, limit: 12 };
  const suggestions = useGetFriendSuggestions(suggestionsParams, {
    query: {
      queryKey: getGetFriendSuggestionsQueryKey(suggestionsParams),
      enabled: step === "friends",
      staleTime: Infinity,
    },
  });
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState<string | null>(null);

  const people = suggestions.data ?? [];
  const goal = Math.min(5, people.length || 5);
  const sentCount = requested.size;

  const stepIndex = STEPS.indexOf(step);

  const handleFile = async (file: File, kind: "avatar" | "cover") => {
    setUploading(true);
    try {
      const media = await uploadMedia(file);
      if (kind === "avatar") setAvatarUrl(media.url);
      else setCoverUrl(media.url);
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available here. Paste an image URL instead:",
        );
        if (url && url.trim()) {
          if (kind === "avatar") setAvatarUrl(url.trim());
          else setCoverUrl(url.trim());
        }
      } else {
        toast.error("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const savePhotoStep = async (kind: "avatar" | "cover", next: Step) => {
    const value = kind === "avatar" ? avatarUrl : coverUrl;
    const original =
      kind === "avatar" ? (user?.avatarUrl ?? "") : (user?.coverUrl ?? "");
    if (!value || value === original) {
      setStep(next);
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        data: kind === "avatar" ? { avatarUrl: value } : { coverUrl: value },
      });
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setStep(next);
    } catch {
      toast.error("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveBioStep = async () => {
    const trimmed = bio.trim();
    if (!trimmed || trimmed === (user?.bio ?? "")) {
      setStep("friends");
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ data: { bio: trimmed } });
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setStep("friends");
    } catch {
      toast.error("Couldn't save your bio. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addFriend = async (id: string) => {
    if (requested.has(id) || requesting) return;
    setRequesting(id);
    try {
      await sendRequest.mutateAsync({ data: { addresseeId: id } });
      setRequested((prev) => new Set(prev).add(id));
    } catch {
      toast.error("Couldn't send that request.");
    } finally {
      setRequesting(null);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setStep("done");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background sm:bg-black/50 sm:flex sm:items-center sm:justify-center overflow-y-auto">
      <div className="min-h-full sm:min-h-0 w-full sm:max-w-lg bg-card sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border flex flex-col sm:max-h-[90vh]">
        {/* Progress */}
        {step !== "done" && (
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-primary">
                Welcome to HiMewo!
              </h1>
              <span className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {STEPS.length}
              </span>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${
                    i <= stepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === "photo" && (
            <div className="flex flex-col items-center text-center gap-4">
              <h2 className="text-lg font-semibold">Add a profile picture</h2>
              <p className="text-sm text-muted-foreground">
                Help your friends recognize you.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f, "avatar");
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="relative w-36 h-36 rounded-full bg-muted border-4 border-primary/20 overflow-hidden flex items-center justify-center hover:border-primary/50 transition-colors"
                data-testid="button-onboarding-avatar"
              >
                {avatarUrl ? (
                  <img
                    src={avatarSrc(avatarUrl)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : uploading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="w-10 h-10 text-muted-foreground" />
                )}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
            </div>
          )}

          {step === "cover" && (
            <div className="flex flex-col items-center text-center gap-4">
              <h2 className="text-lg font-semibold">Add a cover photo</h2>
              <p className="text-sm text-muted-foreground">
                Show a bit of your world at the top of your profile.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f, "cover");
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-40 rounded-xl bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center hover:border-primary/50 transition-colors"
                data-testid="button-onboarding-cover"
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm">Tap to upload</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {step === "bio" && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Tell us about yourself</h2>
                <p className="text-sm text-muted-foreground">
                  A short bio for your profile.
                </p>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What's your story?"
                rows={4}
                maxLength={300}
                data-testid="input-onboarding-bio"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/300
              </p>
            </div>
          )}

          {step === "friends" && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Find your friends</h2>
                <p className="text-sm text-muted-foreground">
                  Send {goal} friend requests to get your feed going.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold">
                  <UserPlus className="w-4 h-4" />
                  {Math.min(sentCount, goal)} of {goal} sent
                </div>
              </div>
              {suggestions.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : people.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No suggestions right now — you can find friends later from
                  the Friends page.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {people.map((p) => {
                    const sent = requested.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className="border border-border rounded-xl p-3 flex flex-col items-center gap-2 text-center"
                        data-testid={`card-suggestion-${p.username}`}
                      >
                        <img
                          src={avatarSrc(p.avatarUrl)}
                          alt={p.displayName}
                          className="w-16 h-16 rounded-full object-cover bg-muted"
                        />
                        <span className="text-sm font-medium leading-tight line-clamp-1">
                          {p.displayName}
                        </span>
                        <Button
                          size="sm"
                          variant={sent ? "secondary" : "default"}
                          className="w-full"
                          disabled={sent || requesting === p.id}
                          onClick={() => void addFriend(p.id)}
                          data-testid={`button-add-${p.username}`}
                        >
                          {requesting === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : sent ? (
                            <>
                              <Check className="w-4 h-4 mr-1" /> Sent
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" /> Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center gap-4 py-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
                <PartyPopper className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your profile is ready. Time to explore HiMewo and connect with
                your friends.
              </p>
              <Button
                size="lg"
                className="mt-2"
                onClick={() => void refreshUser()}
                data-testid="button-onboarding-finish"
              >
                Go to HiMewo
              </Button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step !== "done" && (
          <div className="p-6 pt-0 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() =>
                step === "friends"
                  ? void finish()
                  : setStep(STEPS[stepIndex + 1] as Step)
              }
              disabled={saving}
              data-testid="button-onboarding-skip"
            >
              Skip
            </Button>
            {step === "photo" && (
              <Button
                onClick={() => void savePhotoStep("avatar", "cover")}
                disabled={saving || uploading}
                data-testid="button-onboarding-next"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
              </Button>
            )}
            {step === "cover" && (
              <Button
                onClick={() => void savePhotoStep("cover", "bio")}
                disabled={saving || uploading}
                data-testid="button-onboarding-next"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
              </Button>
            )}
            {step === "bio" && (
              <Button
                onClick={() => void saveBioStep()}
                disabled={saving}
                data-testid="button-onboarding-next"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
              </Button>
            )}
            {step === "friends" && (
              <Button
                onClick={() => void finish()}
                disabled={saving || (people.length > 0 && sentCount < goal)}
                data-testid="button-onboarding-next"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Finish"
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
