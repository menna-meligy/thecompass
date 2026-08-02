-- Local Supabase does NOT auto-grant table privileges to service_role (hosted does).
-- Without this, createAdminClient() (service role) hits "permission denied for table …"
-- and server routes that use it (e.g. /api/payments/verify-screenshot) fail with 403.
-- Run this on the LOCAL stack after applying schema + migrations.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
