import { useRef, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useGetFriendSuggestions,
  getGetFriendSuggestionsQueryKey,
  useUpdateMyProfile,
  useSendFriendRequest,
  useFollowUser,
  useCompleteOnboarding,
  getGetCurrentUserQueryKey,
  customFetch,
  type Profile,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { avatarSrc } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  Image as ImageIcon,
  UserPlus,
  Check,
  PartyPopper,
  UserCheck,
  ShieldCheck,
  AtSign,
} from "lucide-react";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";

type Step = "name" | "photo" | "cover" | "bio" | "friends" | "done";

const STEPS: Step[] = ["name", "photo", "cover", "bio", "friends"];

/**
 * One-time post-signup onboarding: name/username confirmation → profile photo →
 * cover → bio → mandatory follow & friend requests → celebration.
 */
export function OnboardingFlow() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("name");

  // Step 1: Name & Username
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [nameError, setNameError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateMyProfile();
  const sendRequest = useSendFriendRequest();
  const followUser = useFollowUser();
  const completeOnboarding = useCompleteOnboarding();

  // Mandatory accounts query using authenticated customFetch
  const { data: mandatoryAccounts = [], isLoading: isLoadingMandatory } = useQuery<Profile[]>({
    queryKey: ["onboarding", "mandatory-accounts"],
    queryFn: async () => {
      return customFetch<Profile[]>("/api/onboarding/mandatory-accounts").catch(() => []);
    },
    enabled: step === "friends",
  });
  const [followedMandatory, setFollowedMandatory] = useState<Set<string>>(new Set());
  const [followingMandatory, setFollowingMandatory] = useState<string | null>(null);

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

  const saveNameStep = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDisplay = displayName.trim() || `${trimmedFirst} ${trimmedLast}`.trim();
    const trimmedUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!trimmedDisplay) {
      setNameError("Display name cannot be empty");
      return;
    }
    if (!trimmedUsername || !/^[a-zA-Z0-9._]{3,30}$/.test(trimmedUsername)) {
      setNameError("Username must be 3-30 characters (letters, numbers, dot, underscore)");
      return;
    }

    setNameError("");
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        data: {
          firstName: trimmedFirst || undefined,
          lastName: trimmedLast || undefined,
          displayName: trimmedDisplay,
          username: trimmedUsername,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setStep("photo");
    } catch (err: any) {
      const msg = err?.message || err?.error || "Failed to save profile name";
      setNameError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFollowMandatory = async (accId: string) => {
    if (followedMandatory.has(accId) || followingMandatory) return;
    setFollowingMandatory(accId);
    try {
      await followUser.mutateAsync({ userId: accId });
      setFollowedMandatory((prev) => new Set(prev).add(accId));
      toast.success("Followed official account");
    } catch {
      toast.error("Failed to follow account");
    } finally {
      setFollowingMandatory(null);
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
          {step === "name" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Confirm Your Name & Handle</h2>
                <p className="text-sm text-muted-foreground">
                  Review your information before continuing. You can personalize your name and your unique username handle.
                </p>
              </div>

              {nameError && (
                <div className="p-3 text-xs bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl">
                  {nameError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name" className="text-xs">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="h-11 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name" className="text-xs">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="h-11 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="display-name" className="text-xs">Display Name (Visible to everyone)</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Farhan Ayan"
                  className="h-11 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs">Username Handle</Label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                    placeholder="username"
                    className="pl-9 h-11 text-sm font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used for your profile URL and mentions.
                </p>
              </div>
            </div>
          )}

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
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Connect & Follow</h2>
                <p className="text-sm text-muted-foreground">
                  Follow official accounts and connect with people to start your feed.
                </p>
              </div>

              {/* Mandatory Accounts Section */}
              {mandatoryAccounts.length > 0 && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4" /> Required: Official Accounts
                  </div>
                  <div className="space-y-2">
                    {mandatoryAccounts.map((acc) => {
                      const isFollowed = followedMandatory.has(acc.id) || (acc as any).viewerIsFollowing || acc.viewerFollows;
                      const isPending = followingMandatory === acc.id;
                      return (
                        <div key={acc.id} className="flex items-center justify-between gap-3 bg-card p-2.5 rounded-xl border border-border/60">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={avatarSrc(acc.avatarUrl)}
                              alt={acc.displayName}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{acc.displayName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">@{acc.username}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={isFollowed || isPending}
                            onClick={() => void handleFollowMandatory(acc.id)}
                            className={
                              isFollowed
                                ? "bg-muted text-muted-foreground border border-border h-8 text-xs font-semibold px-3"
                                : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-8 text-xs font-semibold px-3.5"
                            }
                          >
                            {isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isFollowed ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" /> Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5 mr-1" /> Follow
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* People You May Know */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    People You May Know
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">
                    <UserPlus className="w-3.5 h-3.5" />
                    {Math.min(sentCount, goal)} of {goal} sent
                  </div>
                </div>

                {suggestions.isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : people.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No suggestions right now — you can find friends later from the Friends page.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {people.map((p) => {
                      const sent = requested.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className="border border-border rounded-xl p-3 flex flex-col items-center gap-2 text-center bg-card/60"
                          data-testid={`card-suggestion-${p.username}`}
                        >
                          <img
                            src={avatarSrc(p.avatarUrl)}
                            alt={p.displayName}
                            className="w-14 h-14 rounded-full object-cover bg-muted"
                          />
                          <span className="text-xs font-semibold leading-tight line-clamp-1">
                            {p.displayName}
                          </span>
                          <Button
                            size="sm"
                            variant={sent ? "secondary" : "default"}
                            className="w-full h-8 text-xs"
                            disabled={sent || requesting === p.id}
                            onClick={() => void addFriend(p.id)}
                            data-testid={`button-add-${p.username}`}
                          >
                            {requesting === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : sent ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" /> Sent
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center gap-4 py-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
                <PartyPopper className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your profile is ready. Time to explore HiMewo and connect with your friends.
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
              onClick={() => {
                if (step === "name") {
                  void saveNameStep();
                } else if (step === "friends") {
                  const hasUnfollowed =
                    mandatoryAccounts.length > 0 &&
                    !mandatoryAccounts.every(
                      (acc) => followedMandatory.has(acc.id) || (acc as any).viewerIsFollowing || acc.viewerFollows
                    );
                  if (hasUnfollowed) {
                    toast.error("Please follow the mandatory official accounts first");
                    return;
                  }
                  void finish();
                } else {
                  setStep(STEPS[stepIndex + 1] as Step);
                }
              }}
              disabled={saving}
              data-testid="button-onboarding-skip"
            >
              Skip
            </Button>
            {step === "name" && (
              <Button
                onClick={() => void saveNameStep()}
                disabled={saving}
                data-testid="button-onboarding-next"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
              </Button>
            )}
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
                disabled={
                  saving ||
                  (mandatoryAccounts.length > 0 &&
                    !mandatoryAccounts.every(
                      (acc) => followedMandatory.has(acc.id) || (acc as any).viewerIsFollowing || acc.viewerFollows
                    ))
                }
                data-testid="button-onboarding-next"
                className="bg-purple-600 hover:bg-purple-700 text-white"
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
