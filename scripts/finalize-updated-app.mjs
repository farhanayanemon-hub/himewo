import fs from "fs";
import { pipeline } from "stream/promises";
import { uploadAsset } from "./publish-release.mjs";

const token = "cSCu7OX69ij_m5uHhIb7UGYx8HoDEWZ5zNxl3Tyr";
const buildId = "ae0464f0-c721-40f5-bfac-7232588a9f96";

async function getBuildStatus() {
  const query = `
    query GetBuild($id: ID!) {
      builds {
        byId(buildId: $id) {
          status
          artifacts {
            buildUrl
          }
          error {
            message
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.expo.dev/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: buildId } }),
  });
  const json = await res.json();
  return json.data?.builds?.byId;
}

async function main() {
  console.log(`[EAS] Monitoring build ${buildId}...`);

  while (true) {
    const build = await getBuildStatus();
    if (!build) {
      console.log("[EAS] Failed to query build status, retrying in 20s...");
      await new Promise((r) => setTimeout(r, 20000));
      continue;
    }

    console.log(`[EAS] Status: ${build.status} at ${new Date().toLocaleTimeString()}`);

    if (build.status === "FINISHED") {
      const apkUrl = build.artifacts?.buildUrl;
      if (!apkUrl) throw new Error("Build finished but no buildUrl found!");

      if (!fs.existsSync("downloads")) fs.mkdirSync("downloads");
      const destApk = "downloads/himewo.apk";
      const destSocial = "downloads/himewo-social.apk";

      console.log(`[Download] Downloading fresh APK from ${apkUrl}...`);
      const res = await fetch(apkUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      await pipeline(res.body, fs.createWriteStream(destApk));
      fs.copyFileSync(destApk, destSocial);

      const stats = fs.statSync(destApk);
      console.log(`[OK] Saved APK (${(stats.size / 1024 / 1024).toFixed(2)} MB) to ${destApk}`);

      console.log("[Release] Uploading himewo.apk to v1.2.0 (388367670)...");
      await uploadAsset(388367670, destApk, "himewo.apk");

      console.log("[Release] Uploading himewo-social.apk to v1.2.0 (388367670)...");
      await uploadAsset(388367670, destSocial, "himewo-social.apk");

      console.log("[Release] Uploading himewo.apk to v1.0.0 (378193576)...");
      await uploadAsset(378193576, destApk, "himewo.apk");

      console.log("[Release] Uploading himewo-social.apk to v1.0.0 (378193576)...");
      await uploadAsset(378193576, destSocial, "himewo-social.apk");

      console.log("[SUCCESS] Both APK assets uploaded to releases successfully!");
      break;
    } else if (build.status === "ERRORED" || build.status === "CANCELED") {
      throw new Error(`Build ended with status: ${build.status}. Error: ${build.error?.message}`);
    }

    await new Promise((r) => setTimeout(r, 25000));
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
