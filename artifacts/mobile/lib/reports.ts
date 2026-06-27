import { Alert } from "react-native";
import { getApiOrigin, getAuthToken } from "./api";

/**
 * Report intake helper for the mobile (Messenger companion) app.
 *
 * The mobile surface only lets users report *people* and *stories*. Posts,
 * comments and reels live on the web app. Reports are sent to the public
 * `/api/reports` endpoint which the admin panel then triages.
 */

export type MobileReportTarget = "user" | "story";

export interface ReportInput {
  targetType: MobileReportTarget;
  targetId: string | number;
  reason: string;
  details?: string;
}

const REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Nudity or sexual content",
  "Hate speech",
  "Violence or threats",
  "Other",
] as const;

export async function submitReport(input: ReportInput): Promise<void> {
  const origin = getApiOrigin();
  if (!origin) {
    throw new Error("The app is not configured to reach the server.");
  }
  const token = await getAuthToken();
  if (!token) {
    throw new Error("You need to be signed in to file a report.");
  }
  const res = await fetch(`${origin}/api/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetType: input.targetType,
      targetId: String(input.targetId),
      reason: input.reason,
      details: input.details,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Report failed (${res.status})`);
  }
}

/**
 * Presents the native report flow: pick a reason, confirm, submit. Handles its
 * own success / error alerts so callers only need to supply the target.
 */
export function promptReport(opts: {
  targetType: MobileReportTarget;
  targetId: string | number;
  subjectLabel: string;
}): void {
  const noun = opts.targetType === "user" ? "person" : "story";
  Alert.alert(
    `Report ${opts.subjectLabel}`,
    `Why are you reporting this ${noun}?`,
    [
      ...REASONS.map((reason) => ({
        text: reason,
        onPress: () => confirmAndSend(opts, reason),
      })),
      { text: "Cancel", style: "cancel" as const },
    ],
    { cancelable: true },
  );
}

function confirmAndSend(
  opts: { targetType: MobileReportTarget; targetId: string | number; subjectLabel: string },
  reason: string,
): void {
  Alert.alert(
    "Submit report?",
    `Report "${opts.subjectLabel}" for: ${reason}`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        style: "destructive",
        onPress: () => {
          submitReport({
            targetType: opts.targetType,
            targetId: opts.targetId,
            reason,
          })
            .then(() => {
              Alert.alert(
                "Report sent",
                "Thanks — our moderators will review this shortly.",
              );
            })
            .catch((err: unknown) => {
              Alert.alert(
                "Could not send report",
                err instanceof Error ? err.message : "Please try again later.",
              );
            });
        },
      },
    ],
  );
}
