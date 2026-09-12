#!/bin/bash
# Update production environment variables
echo "Updating Vercel environment variables..."

# Use vercel env to update production variables
vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_URL production << 'EOFKEY'
https://irinehjflompktssnbwa.supabase.co
EOFKEY

vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production << 'EOFKEY'
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaW5laGpmbG9tcGt0c3NuYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNzg4NDUsImV4cCI6MjA5NTc1NDg0NX0.qjYZw0aXp7PXnYlSAIRnYmkQX7pNRSbJKlMzMEQvI5U
EOFKEY

vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes 2>/dev/null || true
vercel env add SUPABASE_SERVICE_ROLE_KEY production << 'EOFKEY'
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaW5laGpmbG9tcGt0c3NuYndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3ODg0NSwiZXhwIjoyMDk1NzU0ODQ1fQ.hA0842J4vq-nVz7MIl3S_Qnc0EDcaQK3TdQUcmFJec4
EOFKEY

echo "Environment variables updated!"
