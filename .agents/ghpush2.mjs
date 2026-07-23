// Extended GitHub REST push: artifacts/ + .agents/memory/ + selected root files.
import fs from "node:fs";
import { execSync } from "node:child_process";

const OWNER = "farhanayanemon-hub";
const REPO = "himewo";
const BRANCH = "main";
const TOKEN = process.env.GITHUB_TOKEN;
const DO_PUSH = process.argv.includes("--push");
const MSG = process.env.PUSH_MSG || "Sync project (code + memory + env template)";

const ROOT_ALLOW = new Set([".env.example", "MIGRATION.md", "replit.md", "package.json"]);

const porcelain = execSync("git status --porcelain", { cwd: "/home/runner/workspace", encoding: "utf8" });
const inScope = (f) =>
  (f.startsWith("artifacts/") || f.startsWith("lib/") || f.startsWith(".agents/memory/") || ROOT_ALLOW.has(f)) &&
  !f.startsWith("attached_assets/") &&
  !f.startsWith(".local/") &&
  !f.includes("node_modules/");
const lines = porcelain.split("\n").filter(Boolean);
const DELETED = lines
  .filter((l) => l.slice(0, 2).includes("D"))
  .map((l) => l.slice(3).trim())
  .filter(inScope);
const expand = (p) => {
  if (fs.statSync(p).isDirectory()) {
    return fs.readdirSync(p).flatMap((c) => expand(`${p.replace(/\/$/, "")}/${c}`));
  }
  return [p];
};
const FILES = lines
  .filter((l) => !l.slice(0, 2).includes("D"))
  .map((l) => l.slice(3).trim())
  .flatMap(expand)
  .filter(
    (f) =>
      (f.startsWith("artifacts/") || f.startsWith("lib/") || f.startsWith(".agents/memory/") || ROOT_ALLOW.has(f)) &&
      !f.startsWith("attached_assets/") &&
      !f.startsWith(".local/") &&
      !f.includes("node_modules/"),
  );

if (!TOKEN) { console.error("No GITHUB_TOKEN in env"); process.exit(1); }
console.log("candidate files:", FILES.length);

const API = "https://api.github.com";
const h = { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "himewo-deploy" };
async function gh(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...h, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const headSha = ref.object.sha;
const headCommit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
const baseTree = headCommit.tree.sha;
console.log("remote HEAD:", headSha);

const treeItems = [];
for (const file of FILES) {
  const content = fs.readFileSync(file);
  let remote = null;
  try {
    const c = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(file)}?ref=${BRANCH}`);
    remote = Buffer.from(c.content, "base64");
  } catch { remote = null; }
  if (remote && remote.equals(content)) { console.log("  unchanged:", file); continue; }
  console.log("  changed  :", file);
  const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST", body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
  });
  treeItems.push({ path: file, mode: "100644", type: "blob", sha: blob.sha });
}
for (const file of DELETED) {
  // Only delete if it actually exists on the remote.
  try {
    await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(file)}?ref=${BRANCH}`);
    console.log("  deleted  :", file);
    treeItems.push({ path: file, mode: "100644", type: "blob", sha: null });
  } catch {}
}

console.log("changed files:", treeItems.length);
if (treeItems.length === 0) { console.log("nothing to push."); process.exit(0); }
if (!DO_PUSH) { console.log("(dry run — pass --push)"); process.exit(0); }

const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: "POST", body: JSON.stringify({ base_tree: baseTree, tree: treeItems }),
});
const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: "POST", body: JSON.stringify({ message: MSG, tree: tree.sha, parents: [headSha] }),
});
await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
  method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }),
});
console.log("PUSHED commit:", commit.sha);
