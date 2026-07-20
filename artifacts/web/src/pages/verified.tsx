import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { BadgeCheck, Clock, XCircle, Loader2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured, DEV_USER_STORAGE_KEY } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const rawApiBaseUrl = import.meta.env.DEV ? undefined : (import.meta.env.VITE_API_URL as string | undefined);
const apiBaseUrl = rawApiBaseUrl
  ? /^https?:\/\//.test(rawApiBaseUrl)
    ? rawApiBaseUrl
    : `https://${rawApiBaseUrl}`
  : "";

async function getAuthToken(): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    if (!import.meta.env.DEV) return null;
    // Dev-only: fall through to the dev bypass token below.
  }
  const devId = localStorage.getItem(DEV_USER_STORAGE_KEY);
  return devId ? `dev:${devId}` : null;
}

interface VerificationRequirements {
  minAccountAgeDays: number;
  minPosts: number;
  minReels: number;
  regularPostDays: number;
  monthlyFee: number;
}

interface VerificationProgress {
  accountAgeDays: number;
  postCount: number;
  reelCount: number;
  lastPostDaysAgo: number | null;
}

interface VerificationState {
  isVerified: boolean;
  requirements: VerificationRequirements;
  progress: VerificationProgress | null;
  eligible: boolean;
  missing: string[];
  request: {
    id: number;
    status: "pending" | "approved" | "rejected";
    note: string | null;
    reviewNote: string | null;
    createdAt: string;
  } | null;
}

async function fetchVerificationState(): Promise<VerificationState> {
  const token = await getAuthToken();
  const res = await fetch(`${apiBaseUrl}/api/verification/request`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Could not load verification status (${res.status})`);
  return (await res.json()) as VerificationState;
}

async function submitVerificationRequest(note: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${apiBaseUrl}/api/verification/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ note: note.trim() || undefined }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Could not submit request (${res.status})`);
  }
}

function RequirementRow({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2">
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <span className={met ? "" : "text-muted-foreground"}>
        {label} <span className="text-xs text-muted-foreground">({detail})</span>
      </span>
    </li>
  );
}

export default function VerifiedPage() {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["verification-request"],
    queryFn: fetchVerificationState,
  });

  const submit = useMutation({
    mutationFn: () => submitVerificationRequest(note),
    onSuccess: () => {
      toast({ title: "Request submitted", description: "We'll review your request soon." });
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["verification-request"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not submit", description: err.message, variant: "destructive" });
    },
  });

  const status = data?.isVerified
    ? "verified"
    : data?.request?.status === "pending"
      ? "pending"
      : data?.request?.status === "rejected"
        ? "rejected"
        : "none";

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
            <BadgeCheck className="w-9 h-9 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold">Verified Badge</h1>
          <p className="text-muted-foreground mt-2">
            The blue badge shows people that your profile is authentic. Apply below and our
            team will review your request.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h2 className="font-semibold text-lg">Couldn't load your status</h2>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Please check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : status === "verified" ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <BadgeCheck className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <h2 className="font-semibold text-lg">You're verified!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Your profile shows the blue verified badge.
            </p>
          </div>
        ) : status === "pending" ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-semibold text-lg">Request pending</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Your request is being reviewed. We'll notify you once it's decided.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            {data && data.progress && (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-semibold mb-3">Requirements</p>
                <ul className="space-y-2 text-sm">
                  <RequirementRow
                    met={data.progress.accountAgeDays >= data.requirements.minAccountAgeDays}
                    label={`Account at least ${data.requirements.minAccountAgeDays} days old`}
                    detail={`${data.progress.accountAgeDays} days`}
                  />
                  <RequirementRow
                    met={data.progress.postCount >= data.requirements.minPosts}
                    label={`At least ${data.requirements.minPosts} posts`}
                    detail={`${data.progress.postCount} posts`}
                  />
                  <RequirementRow
                    met={data.progress.reelCount >= data.requirements.minReels}
                    label={`At least ${data.requirements.minReels} reels`}
                    detail={`${data.progress.reelCount} reels`}
                  />
                  {data.requirements.regularPostDays > 0 && (
                    <RequirementRow
                      met={
                        data.progress.lastPostDaysAgo !== null &&
                        data.progress.lastPostDaysAgo <= data.requirements.regularPostDays
                      }
                      label={`Posted within the last ${data.requirements.regularPostDays} days`}
                      detail={
                        data.progress.lastPostDaysAgo === null
                          ? "no posts yet"
                          : `last post ${data.progress.lastPostDaysAgo}d ago`
                      }
                    />
                  )}
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Verified badge costs ৳{data.requirements.monthlyFee}/month after approval.
                </p>
              </div>
            )}
            {status === "rejected" && (
              <div className="rounded-xl bg-destructive/10 p-4 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Your previous request was not approved.</p>
                  {data?.request?.reviewNote && (
                    <p className="text-muted-foreground mt-1">{data.request.reviewNote}</p>
                  )}
                  <p className="text-muted-foreground mt-1">You can apply again below.</p>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium block mb-2">
                Why should your profile be verified? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Tell us about yourself — public figure, creator, business, etc."
              />
            </div>
            <Button
              className="w-full"
              disabled={submit.isPending || !data?.eligible}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : data?.eligible ? (
                "Submit request"
              ) : (
                "Requirements not met yet"
              )}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
