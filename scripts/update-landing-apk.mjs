import fs from "fs";
import { execSync } from "child_process";
import { uploadAsset, ensureRelease } from "./publish-release.mjs";

async function main() {
  console.log("==================================================");
  console.log("  HiMewo APK & Landing Page Auto-Sync Pipeline    ");
  console.log("==================================================");

  const tag = process.argv[2] || "v1.2.0";

  // 1. Upload to GitHub Releases
  console.log(`\n[1/3] Uploading APKs to GitHub Release (${tag})...`);
  const rel = await ensureRelease(
    tag,
    `HiMewo Android Apps ${tag}`,
    `HiMewo Mobile All-in-One and Messenger ${tag} release builds.`
  );

  if (fs.existsSync("downloads/himewo.apk")) {
    console.log("-> Uploading himewo.apk...");
    await uploadAsset(rel.id, "downloads/himewo.apk", "himewo.apk");
  }

  if (fs.existsSync("downloads/himewo-social.apk")) {
    console.log("-> Uploading himewo-social.apk...");
    await uploadAsset(rel.id, "downloads/himewo-social.apk", "himewo-social.apk");
  }

  if (fs.existsSync("downloads/himewo-chat.apk")) {
    console.log("-> Uploading himewo-chat.apk...");
    await uploadAsset(rel.id, "downloads/himewo-chat.apk", "himewo-chat.apk");
  }

  // 2. Build landing page
  console.log("\n[2/3] Building landing page (artifacts/app-landing)...");
  execSync("pnpm --filter @workspace/app-landing run build", { stdio: "inherit" });

  // 3. Deploy to Cloudflare Pages
  console.log("\n[3/3] Deploying updated landing page to Cloudflare Pages (app.himewo.com)...");
  execSync("node scripts/deploy-landing.mjs", { stdio: "inherit" });

  console.log("\n==================================================");
  console.log("  SUCCESS! APK is now live on Landing Page!       ");
  console.log("  Direct URL: https://app.himewo.com/himewo.apk   ");
  console.log("  Landing URL: https://app.himewo.com             ");
  console.log("  GitHub URL: https://github.com/farhanayanemon-hub/himewo/releases/latest/download/himewo.apk");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
