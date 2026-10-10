---
name: HiMewo 2FA + OTP password change
description: How Supabase TOTP MFA and the OTP-gated password change are wired in web + mobile, and the invariants to keep.
---

# HiMewo 2FA (TOTP) + OTP-gated password change

## Password change (settings)
- Supabase project has `security_update_password_require_reauthentication=true` (set via Mgmt API). `updateUser({password})` on an old session now fails — settings flow reuses the FORGOT-PASSWORD lib fns: sendResetEmailOtp/sendResetPhoneOtp (`shouldCreateUser:false`) → verifyEmailOtp / verifyPhoneOtpNoSync → setPassword. verifyOtp mints a fresh session, which satisfies the reauth requirement, so signup-wizard and recovery flows are unaffected.
- Contact options come from `supabase.auth.getUser()` (email + phone), not the app profile.

## TOTP login MFA
- Password sign-in fns return `PasswordSignInResult {mfaRequired, factorId?}`; after signInWithPassword they check `getAuthenticatorAssuranceLevel()` (currentLevel!==aal2 && nextLevel===aal2) + a verified totp factor from `listFactors().all`.
- An `mfaPending` ref (like `wizardActive`) suppresses the onAuthStateChange auto-login so the AAL1 half-session doesn't log the user in; cancel = signOut. Login screens render the 6-digit step in-place (NO new route files — expo typed-routes gotcha).
- Enroll: unenroll stale UNVERIFIED totp factors first or enroll fails with a friendly-name conflict. Disable: challenge+verify a current code first (raises to AAL2, which unenroll of a verified factor requires), then unenroll.
- **Accepted risk:** API server accepts AAL1 JWTs — MFA is client-side login UX only. If real enforcement is ever wanted, check `aal` claim server-side.
- Mobile has no QR: show setup key + Copy (expo-clipboard) + "Open authenticator" Linking.openURL(enrollment.uri).
