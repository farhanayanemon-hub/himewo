import { getSettings } from "./flags";

/**
 * GreenWeb (bdbulksms.com) SMS gateway. Bangladesh numbers ONLY — this is a
 * BD-local gateway and the product decision is to send OTP SMS to +880
 * numbers exclusively.
 */

const GREENWEB_URL = "https://api.greenweb.com.bd/api.php";

/**
 * Normalize a phone number to GreenWeb's expected `8801XXXXXXXXX` form.
 * Returns null when the number is not a valid Bangladeshi mobile number.
 */
export function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("00880")) n = n.slice(2);
  if (n.startsWith("880")) {
    // already country-coded
  } else if (n.startsWith("01")) {
    n = `88${n}`;
  } else {
    return null;
  }
  // 880 + 1X + 8 digits = 13 digits; BD mobiles are 8801[3-9]XXXXXXXX.
  if (!/^8801[3-9]\d{8}$/.test(n)) return null;
  return n;
}

/**
 * Send an SMS through GreenWeb. Throws with a descriptive message on any
 * failure (missing token, non-BD number, gateway error) — callers surface
 * the error instead of silently dropping the message.
 */
export async function sendGreenWebSms(to: string, message: string): Promise<void> {
  const settings = await getSettings();
  const token = (settings.sms_greenweb_token || "").trim();
  if (!token) {
    throw new Error("SMS gateway is not configured (missing GreenWeb token).");
  }
  const bd = normalizeBdPhone(to);
  if (!bd) {
    throw new Error("Only Bangladeshi (+880) mobile numbers are supported.");
  }
  const body = new URLSearchParams({ token, to: bd, message });
  const resp = await fetch(GREENWEB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const text = (await resp.text()).trim();
  // GreenWeb replies with a plain-text status; success contains "Ok".
  if (!resp.ok || !/ok/i.test(text)) {
    throw new Error(`SMS gateway error: ${text.slice(0, 200) || resp.status}`);
  }
}
