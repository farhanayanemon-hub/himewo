// Real-name validation shared by the signup wizard (/auth/validate-name,
// /auth/sync) and profile rename (PATCH /users/me). Mirrors Facebook's
// "use the name people call you in real life" policy: letters only, no
// gibberish, no profanity, no brand/role words.

const MAX_PART_LENGTH = 50;

// Letters (any script, incl. Bangla) + combining marks, joined by
// space / hyphen / apostrophe / period.
const ALLOWED_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u;
const HAS_DIGIT = /\d/;
const REPEATED_CHAR = /(.)\1{2,}/u;
const LATIN_ONLY = /^[a-z'’.-]+$/;
const LATIN_VOWEL = /[aeiouy]/;

// Common keyboard-mash sequences ("asdf jkl", "qwerty" …).
const KEYBOARD_RUNS = [
  "qwert", "werty", "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "jkl",
  "zxcv", "xcvb", "cvbn", "vbnm", "qaz", "wsx", "edc",
];

// Profanity / abusive words — English + common Bangla/Banglish (Latin and
// Bangla script). Matched against normalized word tokens AND the whole
// concatenated name so "Madar Chod" style splits are caught too.
const PROFANITY = [
  // English
  "fuck", "fucker", "shit", "bitch", "asshole", "dick", "pussy", "cunt",
  "bastard", "whore", "slut", "nigger", "nigga", "sexy", "porn", "rape",
  "rapist", "penis", "vagina", "boobs",
  // Bangla / Banglish
  "magi", "magir", "khanki", "khankir", "chudi", "chuda", "choda", "chod",
  "chodna", "madarchod", "motherchod", "banchod", "bokachoda", "gudmara",
  "haramjada", "haramzada", "haramkhor", "shuorer", "shuorerbaccha",
  "kuttarbaccha", "khankimagi", "chudir", "chudirbhai", "gandu", "dhonmara",
  // Bangla script
  "মাগি", "খানকি", "চুদি", "চুদা", "চোদা", "মাদারচোদ", "হারামজাদা",
  "খানকির", "চুদির", "শুয়োরের", "কুত্তার",
];

// Obvious non-person names: brands, roles, app/route words, place-only words.
const NON_PERSON = [
  // Brands / platforms
  "facebook", "instagram", "whatsapp", "messenger", "tiktok", "youtube",
  "google", "twitter", "snapchat", "telegram", "netflix", "amazon",
  "microsoft", "samsung", "xiaomi", "nokia", "himewo", "imo", "likee",
  "bkash", "nagad", "rocket", "daraz", "foodpanda", "pathao",
  // Roles / system words
  "admin", "administrator", "moderator", "official", "verified", "support",
  "helpdesk", "customer", "service", "system", "root", "test", "testing",
  "unknown", "anonymous", "user", "profile", "account", "page", "group",
  "shop", "store", "market", "news", "media", "agency", "company", "ltd",
  "limited", "brand", "online", "gaming", "gamer", "youtuber", "tiktoker",
  // Place-only words
  "bangladesh", "dhaka", "chittagong", "chattogram", "sylhet", "khulna",
  "rajshahi", "barisal", "barishal", "rangpur", "mymensingh", "comilla",
  "cumilla", "kolkata", "india", "london", "dubai", "america", "canada",
  "malaysia", "singapore",
];

const PROFANITY_SET = new Set(PROFANITY);
const NON_PERSON_SET = new Set(NON_PERSON);

/** Lowercase, strip accents/apostrophes/periods/hyphens for word matching. */
function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.\-\s]/g, "");
}

function longestConsonantRun(word: string): number {
  let run = 0;
  let max = 0;
  for (const ch of word) {
    if (/[a-z]/.test(ch) && !LATIN_VOWEL.test(ch)) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

function isGibberishLatinWord(word: string): boolean {
  // Only meaningful for pure-Latin words; Bangla script skips these checks.
  if (!LATIN_ONLY.test(word)) return false;
  const letters = word.replace(/[^a-z]/g, "");
  if (letters.length >= 4 && !LATIN_VOWEL.test(letters)) return true;
  if (longestConsonantRun(letters) >= 5) return true;
  for (const run of KEYBOARD_RUNS) {
    if (letters.includes(run) && letters.length <= run.length + 3) return true;
  }
  return false;
}

function countLetters(value: string): number {
  const m = value.match(/\p{L}/gu);
  return m ? m.length : 0;
}

/**
 * Validate one name part (first or last name). Returns a user-facing error
 * message, or null when the name looks OK.
 */
export function validateNamePart(
  raw: string,
  label: "First name" | "Last name" | "Name" = "Name",
): string | null {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return `${label} is required.`;
  if (HAS_DIGIT.test(value))
    return `${label} can't contain numbers.`;
  if (!ALLOWED_CHARS.test(value))
    return `${label} can only contain letters, spaces, hyphens, apostrophes and periods.`;
  if (countLetters(value) < 2)
    return `${label} is too short — please enter your full ${label.toLowerCase()}.`;
  if (value.length > MAX_PART_LENGTH)
    return `${label} is too long.`;
  if (REPEATED_CHAR.test(normalizeToken(value)))
    return `${label} doesn't look like a real name. Please use the name people call you in real life.`;

  const words = value.split(/[\s.-]+/).filter(Boolean);
  const tokens = words.map(normalizeToken).filter(Boolean);
  const joined = normalizeToken(value);

  for (const t of [...tokens, joined]) {
    if (PROFANITY_SET.has(t))
      return `${label} contains words that aren't allowed.`;
    if (NON_PERSON_SET.has(t))
      return `${label} doesn't look like a real person's name. Please use your own name.`;
  }
  // Substring profanity check on the joined form catches "MadarchodX".
  for (const bad of PROFANITY) {
    if (bad.length >= 5 && joined.includes(normalizeToken(bad)))
      return `${label} contains words that aren't allowed.`;
  }
  for (const w of words.map((x) => x.toLowerCase())) {
    if (isGibberishLatinWord(w))
      return `${label} doesn't look like a real name. Please check the spelling and use your real name.`;
  }
  return null;
}

export interface NameValidationResult {
  valid: boolean;
  firstNameError: string | null;
  lastNameError: string | null;
}

/** Validate the first/last pair used by the signup wizard. */
export function validateFullName(
  firstName: string,
  lastName: string,
): NameValidationResult {
  const firstNameError = validateNamePart(firstName, "First name");
  const lastNameError = validateNamePart(lastName, "Last name");
  return {
    valid: !firstNameError && !lastNameError,
    firstNameError,
    lastNameError,
  };
}

/**
 * Validate a display name (profile "name" edits). Same rules, applied to the
 * whole name; requires at least two letters overall.
 */
export function validateDisplayName(name: string): string | null {
  return validateNamePart(name, "Name");
}
