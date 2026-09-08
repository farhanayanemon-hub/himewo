#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");

// Load .env manually if exists
function loadEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("❌ SUPABASE_ACCESS_TOKEN not found in .env or environment!");
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
let projectRef = null;
if (SUPABASE_URL) {
  const match = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (match) projectRef = match[1];
}
if (!projectRef) {
  projectRef = "rzdfgbfyhnkvqbcegguk";
}

const API_ENDPOINT = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

async function getAuthConfig() {
  const res = await fetch(API_ENDPOINT, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch auth config: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function updateAuthConfig(patch) {
  const res = await fetch(API_ENDPOINT, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update auth config: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "status";

  console.log(`📡 Connecting to Supabase Project: ${projectRef}...`);

  if (command === "status") {
    const config = await getAuthConfig();
    console.log("\n================ [ HiMewo Auth Status ] ================");
    console.log("🔗 Site URL:", config.site_url);
    console.log("🌐 URI Allow List:", config.uri_allow_list);
    console.log("-------------------------------------------------------");
    console.log("🔑 Google OAuth:", {
      enabled: config.external_google_enabled,
      clientId: config.external_google_client_id ? `${config.external_google_client_id.substring(0, 15)}...` : "NOT_CONFIGURED",
      hasSecret: !!config.external_google_secret,
    });
    console.log("-------------------------------------------------------");
    console.log("📧 SMTP Config:", {
      host: config.smtp_host || "NOT_CONFIGURED (using Supabase default mailer)",
      port: config.smtp_port,
      user: config.smtp_user,
      hasPass: !!config.smtp_pass,
      senderName: config.smtp_sender_name,
      adminEmail: config.smtp_admin_email,
      rateLimitPerHour: config.smtp_max_frequency,
    });
    console.log("========================================================\n");
    return;
  }

  if (command === "apply-env") {
    console.log("🔍 Checking .env for Google OAuth and SMTP variables...");
    const patch = {};

    const googleId = process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID;
    const googleSecret = process.env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
    if (googleId && googleSecret) {
      console.log("✨ Found Google OAuth credentials in .env!");
      patch.external_google_enabled = true;
      patch.external_google_client_id = googleId.trim();
      patch.external_google_secret = googleSecret.trim();
    }

    const smtpHost = process.env.SMTP_HOST || env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER || env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || env.SMTP_PASS;
    const smtpSenderEmail = process.env.SMTP_ADMIN_EMAIL || env.SMTP_ADMIN_EMAIL || smtpUser;
    const smtpSenderName = process.env.SMTP_SENDER_NAME || env.SMTP_SENDER_NAME || "HiMewo";

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      console.log("✨ Found SMTP credentials in .env!");
      patch.smtp_host = smtpHost.trim();
      patch.smtp_port = String(smtpPort).trim();
      patch.smtp_user = smtpUser.trim();
      patch.smtp_pass = smtpPass.trim();
      patch.smtp_admin_email = smtpSenderEmail.trim();
      patch.smtp_sender_name = smtpSenderName.trim();
      patch.smtp_max_frequency = 60;
    }

    if (Object.keys(patch).length === 0) {
      console.log("⚠️ No GOOGLE_* or SMTP_* credentials found in .env yet.");
      console.log("You can add these to .env:\n");
      console.log("GOOGLE_CLIENT_ID=your_client_id_here");
      console.log("GOOGLE_CLIENT_SECRET=your_client_secret_here\n");
      console.log("SMTP_HOST=smtp.gmail.com");
      console.log("SMTP_PORT=587");
      console.log("SMTP_USER=your_email@gmail.com");
      console.log("SMTP_PASS=your_16_char_app_password");
      console.log("SMTP_ADMIN_EMAIL=your_email@gmail.com");
      console.log("SMTP_SENDER_NAME=HiMewo\n");
      return;
    }

    console.log("⏳ Applying configuration to Supabase...");
    const updated = await updateAuthConfig(patch);
    console.log("✅ Successfully applied to Supabase!");
    console.log({
      googleEnabled: updated.external_google_enabled,
      smtpHost: updated.smtp_host,
      smtpUser: updated.smtp_user,
    });
    return;
  }

  if (command === "setup-google") {
    // Usage: node scripts/configure-supabase-auth.mjs setup-google <clientId> <clientSecret>
    const clientId = args[1];
    const clientSecret = args[2];
    if (!clientId || !clientSecret) {
      console.error("❌ Usage: node scripts/configure-supabase-auth.mjs setup-google <clientId> <clientSecret>");
      process.exit(1);
    }
    console.log("⏳ Enabling Google OAuth on Supabase...");
    const updated = await updateAuthConfig({
      external_google_enabled: true,
      external_google_client_id: clientId.trim(),
      external_google_secret: clientSecret.trim(),
    });
    console.log("✅ Google OAuth successfully enabled!");
    console.log({
      enabled: updated.external_google_enabled,
      clientId: updated.external_google_client_id,
      hasSecret: !!updated.external_google_secret,
    });
    return;
  }

  if (command === "setup-smtp") {
    // Usage: node scripts/configure-supabase-auth.mjs setup-smtp <host> <port> <user> <pass> <adminEmail> <senderName>
    const host = args[1];
    const port = String(args[2] || "").trim();
    const user = args[3];
    const pass = args[4];
    const adminEmail = args[5] || user;
    const senderName = args[6] || "HiMewo";

    if (!host || !port || !user || !pass) {
      console.error("❌ Usage: node scripts/configure-supabase-auth.mjs setup-smtp <host> <port> <user> <pass> [adminEmail] [senderName]");
      console.log("\nExamples:");
      console.log("Gmail:  node scripts/configure-supabase-auth.mjs setup-smtp smtp.gmail.com 587 your-email@gmail.com your-app-password your-email@gmail.com HiMewo");
      console.log("Resend: node scripts/configure-supabase-auth.mjs setup-smtp smtp.resend.com 465 resend re_123456789 noreply@yourdomain.com HiMewo");
      process.exit(1);
    }

    console.log(`⏳ Setting up SMTP (${host}:${port}) on Supabase...`);
    const updated = await updateAuthConfig({
      smtp_host: host.trim(),
      smtp_port: port,
      smtp_user: user.trim(),
      smtp_pass: pass.trim(),
      smtp_admin_email: adminEmail.trim(),
      smtp_sender_name: senderName.trim(),
      smtp_max_frequency: 60,
    });
    console.log("✅ SMTP successfully configured on Supabase!");
    console.log({
      host: updated.smtp_host,
      port: updated.smtp_port,
      user: updated.smtp_user,
      senderName: updated.smtp_sender_name,
      adminEmail: updated.smtp_admin_email,
    });
    return;
  }

  console.error("Unknown command:", command);
  console.log("Available commands: status, apply-env, setup-google, setup-smtp");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
