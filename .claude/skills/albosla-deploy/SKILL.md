---
name: albosla-deploy
description: Build and deploy البوصلة (albosla) to Vercel production. Use when asked to deploy, ship, or push the albosla app live, or verify a production deploy.
---

# Deploy البوصلة to production

The Vercel project `albosla` (team `mennas-projects-495e22a3`) is linked in this repo (`.vercel/project.json`). CLI is authenticated as `menna-meligy`.

## Steps
1. Commit any working changes first (deploy ships committed + working-tree state):
   ```bash
   cd ~/albosla && git add <paths> && git commit -m "…"
   ```
2. Deploy to production:
   ```bash
   cd ~/albosla && vercel --prod --yes
   ```
   Build runs on Vercel (~40s) using Vercel's stored env vars. The stable alias is **https://albosla.vercel.app**.
3. Verify it's live and public (no Vercel SSO wall):
   ```bash
   curl -sS -m 20 -L -o /dev/null -w "%{http_code}\n" https://albosla.vercel.app/ar
   ```

## Env vars (NEXT_PUBLIC_* are inlined at BUILD time)
Any change to `NEXT_PUBLIC_*` requires updating Vercel env **and redeploying**:
```bash
vercel env rm NEXT_PUBLIC_FOO production -y ; printf '%s' "value" | vercel env add NEXT_PUBLIC_FOO production
```
Vercel env values pull as empty via CLI (marked sensitive) — you can't read them back, only overwrite.

## Notes
- Backend is the hosted Supabase project `irinehjflompktssnbwa` (see `albosla-db` skill).
- If login/data fails after deploy, re-check the 3 Supabase env vars point to that project.
