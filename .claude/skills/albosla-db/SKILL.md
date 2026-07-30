---
name: albosla-db
description: Connect to البوصلة's hosted Supabase Postgres to run migrations, seed data, or query production. Use when asked to migrate, seed, reschedule sessions, change prices, or inspect the live albosla database.
---

# البوصلة hosted database access

Production backend = Supabase project **`irinehjflompktssnbwa`** (region eu-central-1), under Menna's signal work account. URL: `https://irinehjflompktssnbwa.supabase.co`.

## Keys
- **anon key**: inlined in `.next` client bundles (grep a role:anon JWT with that ref), or from the dashboard.
- **service_role key**: from the dashboard (Settings → API Keys → Legacy). Enables the Auth admin API + full PostgREST, but **cannot run DDL**.
- **DB password**: `elbosla123.meme` (rotate in dashboard if needed).

## Running SQL / migrations (DDL needs a direct Postgres connection)
Direct `db.<ref>.supabase.co:5432` is IPv6-only and unreachable locally. Use the **session pooler** (IPv4) via the local docker `supabase_db` container's psql (it has psql + IPv4 egress):
```bash
CID=$(docker ps --format '{{.ID}} {{.Names}}' | grep -i supabase_db | awk '{print $1}' | head -1)
docker exec -i -e PGPASSWORD="elbosla123.meme" "$CID" \
  psql -h aws-1-eu-central-1.pooler.supabase.com -p 5432 -U postgres.irinehjflompktssnbwa -d postgres < path/to/migration.sql
```
Pass explicit `-h/-p/-U/-d` flags (don't bundle them in one variable — it breaks arg parsing).

## Migration ordering gotcha
`compass_migration.sql` (creates `assessments`) MUST run before `skills_migration.sql` (references it). All migrations use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so re-running is safe; `CREATE POLICY` is not guarded, so a fully-fresh first run is cleanest.

## Seeding users (no DDL needed — service_role via Auth admin API)
```bash
URL=https://irinehjflompktssnbwa.supabase.co ; SRK=<service_role>
curl -sS -X POST "$URL/auth/v1/admin/users" -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"email":"x@albosla.test","password":"Albosla123!","email_confirm":true}'
# then set role: PATCH /rest/v1/profiles?id=eq.<uid> {"role":"admin"}
```
Test accounts: `admin@albosla.test` (admin) + `user@albosla.test` (user), password `Albosla123!`.

## Booking slots
Individual general-session slots come from `sessions` (type=individual, status=published, starts_at>now). Keep future-dated rows so `/book/general` always shows options. Storage buckets `proofs` + `payment-proofs` (both public) hold receipts.
