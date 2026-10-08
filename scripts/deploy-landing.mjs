import fs from "fs";
import { execSync } from "child_process";

const env = fs.readFileSync(".env", "utf8");
const accMatch = env.match(/CLOUDFLARE_ACCOUNT_ID=(.+)/);
const tokMatch = env.match(/CLOUDFLARE_API_TOKEN=(.+)/);

if (accMatch && tokMatch) {
  process.env.CLOUDFLARE_ACCOUNT_ID = accMatch[1].trim();
  process.env.CLOUDFLARE_API_TOKEN = tokMatch[1].trim();

  // Cloudflare Pages has a 25 MiB file size limit for static assets.
  // APK downloads are routed directly to GitHub Releases via _redirects.
  for (const apk of ["himewo.apk", "himewo-social.apk", "himewo-chat.apk"]) {
    const distFile = `artifacts/app-landing/dist/${apk}`;
    if (fs.existsSync(distFile)) fs.unlinkSync(distFile);
    const pubFile = `artifacts/app-landing/public/${apk}`;
    if (fs.existsSync(pubFile)) fs.unlinkSync(pubFile);
  }

  console.log("Deploying app-landing to Cloudflare Pages (himewo-apps)...");
  execSync("npx wrangler pages deploy artifacts/app-landing/dist --project-name=himewo-apps --branch=main", {
    stdio: "inherit",
    env: process.env
  });
  console.log("Deployed successfully to app.himewo.com!");
}
