// Minimal .env.local loader for the verification scripts in this folder.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", ".env.local");
for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (!(key in process.env) || !process.env[key]) process.env[key] = value;
}

module.exports = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  site: process.env.PROD_SITE || "https://albosla.vercel.app",
};
