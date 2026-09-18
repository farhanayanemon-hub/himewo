import { uploadAsset, ensureRelease } from "./publish-release.mjs";

async function main() {
  const rel120 = await ensureRelease("v1.2.0", "HiMewo Android Apps v1.2.0", "HiMewo Mobile Social & Chat Messenger v1.2.0 - Optimized ARM release builds.");
  console.log("Targeting Release v1.2.0 ID:", rel120.id);

  console.log("Uploading himewo.apk to v1.2.0...");
  await uploadAsset(rel120.id, "downloads/himewo.apk", "himewo.apk");

  console.log("Uploading himewo-social.apk to v1.2.0...");
  await uploadAsset(rel120.id, "downloads/himewo-social.apk", "himewo-social.apk");

  console.log("Uploading himewo-chat.apk to v1.2.0...");
  await uploadAsset(rel120.id, "downloads/himewo-chat.apk", "himewo-chat.apk");

  // Also update v1.0.0
  const rel100Id = "378193576";
  console.log("Updating legacy release v1.0.0 assets...");
  await uploadAsset(rel100Id, "downloads/himewo.apk", "himewo.apk");
  await uploadAsset(rel100Id, "downloads/himewo-social.apk", "himewo-social.apk");
  await uploadAsset(rel100Id, "downloads/himewo-chat.apk", "himewo-chat.apk");

  console.log("ALL ASSETS SUCCESSFULLY UPLOADED TO GITHUB RELEASES!");
}
main().catch(console.error);
