import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const accMatch = env.match(/CLOUDFLARE_ACCOUNT_ID=(.+)/);
const tokMatch = env.match(/CLOUDFLARE_API_TOKEN=(.+)/);

if (accMatch && tokMatch) {
  const aId = accMatch[1].trim();
  const tId = tokMatch[1].trim();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${aId}/pages/projects`, {
    headers: { Authorization: `Bearer ${tId}` }
  });
  const data = await res.json();
  console.log("Pages Projects:", data.result?.map(p => ({
    name: p.name,
    subdomain: p.subdomain,
    domains: p.domains
  })));
}
