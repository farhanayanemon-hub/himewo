import fs from "fs";
import { execSync } from "child_process";

const env = fs.readFileSync(".env", "utf8");
const accMatch = env.match(/CLOUDFLARE_ACCOUNT_ID=(.+)/);
const tokMatch = env.match(/CLOUDFLARE_API_TOKEN=(.+)/);

if (accMatch && tokMatch) {
  process.env.CLOUDFLARE_ACCOUNT_ID = accMatch[1].trim();
  process.env.CLOUDFLARE_API_TOKEN = tokMatch[1].trim();
  console.log("Deploying app-landing to Cloudflare Pages (himewo-apps)...");
  execSync("npx wrangler pages deploy artifacts/app-landing/dist --project-name=himewo-apps --branch=main", {
    stdio: "inherit",
    env: process.env
  });
  console.log("Deployed successfully to app.himewo.com!");
}
