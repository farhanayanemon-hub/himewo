import fs from "fs";
import path from "path";
import { execSync } from "child_process";

if (!process.env.GITHUB_TOKEN && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const m = line.match(/^GITHUB_TOKEN=(.*)$/);
    if (m) process.env.GITHUB_TOKEN = m[1].trim();
  }
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.RELEASE_GITHUB_TOKEN;
const REPO = "farhanayanemon-hub/himewo";

async function ghRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("https://") ? endpoint : `https://api.github.com/repos/${REPO}${endpoint}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "User-Agent": "HiMewo-Release-Bot",
    Accept: "application/vnd.github.v3+json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}

export async function uploadAsset(releaseId, filePath, assetName) {
  const stats = fs.statSync(filePath);

  const relRes = await ghRequest(`/releases/${releaseId}`);
  const relData = await relRes.json();
  const existing = relData.assets?.find((a) => a.name === assetName);
  if (existing) {
    console.log(`Deleting existing asset ${assetName} (id: ${existing.id}) from release ${releaseId}...`);
    await ghRequest(`/releases/assets/${existing.id}`, { method: "DELETE" });
  }

  const uploadUrl = `https://uploads.github.com/repos/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(assetName)}`;
  console.log(`Uploading ${assetName} (${(stats.size / 1024 / 1024).toFixed(2)} MB) to release ${releaseId}...`);

  const curlCmd = `curl --http1.1 -s -S -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/vnd.android.package-archive" --data-binary "@${filePath}" "${uploadUrl}"`;
  const stdout = execSync(curlCmd, { maxBuffer: 50 * 1024 * 1024 }).toString();
  const uploaded = JSON.parse(stdout);
  if (!uploaded.browser_download_url) {
    throw new Error(`Upload failed: ${stdout}`);
  }

  console.log(`Successfully uploaded ${assetName}: ${uploaded.browser_download_url}`);
  return uploaded;
}

export async function ensureRelease(tagName, releaseName, body) {
  const listRes = await ghRequest("/releases");
  const releases = await listRes.json();
  const found = releases.find((r) => r.tag_name === tagName);
  if (found) {
    return found;
  }

  console.log(`Creating release ${tagName}...`);
  const createRes = await ghRequest("/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: tagName,
      target_commitish: "main",
      name: releaseName,
      body: body,
      draft: false,
      prerelease: false,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create release (${createRes.status}): ${errText}`);
  }

  return await createRes.json();
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("publish-release.mjs");
if (isDirectRun && process.argv[2] && process.argv[3]) {
  const filePath = process.argv[2];
  const assetName = process.argv[3];
  const tagName = process.argv[4] || "v1.2.0";
  (async () => {
    console.log(`Publishing ${assetName} from ${filePath} to release ${tagName}...`);
    const release = await ensureRelease(
      tagName,
      `HiMewo Android Apps ${tagName}`,
      `HiMewo Mobile Apps ${tagName} build.`
    );
    await uploadAsset(release.id, filePath, assetName);
    console.log(`Successfully published ${assetName} to ${tagName}!`);
  })().catch((err) => {
    console.error("Publish failed:", err);
    process.exit(1);
  });
}
