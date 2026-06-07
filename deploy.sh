#!/bin/bash
# البوصلة — One-command deploy script
# Usage: ./deploy.sh
# Requirements: Fill .env.local first, then run this script

set -e

echo "🧭 البوصلة — Deploying..."

# Check required env vars
source .env.local 2>/dev/null || true

if [ "$NEXT_PUBLIC_SUPABASE_URL" = "your_supabase_project_url" ] || [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: Please fill in your Supabase credentials in .env.local first"
  echo "   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co"
  echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..."
  echo "   SUPABASE_SERVICE_ROLE_KEY=eyJ..."
  exit 1
fi

echo "✅ Environment variables found"
echo "📦 Building..."
npm run build

echo "🚀 Deploying to Vercel..."
npx vercel --prod \
  -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e RESEND_API_KEY="$RESEND_API_KEY" \
  -e RESEND_FROM_EMAIL="$RESEND_FROM_EMAIL" \
  -e PAYMOB_API_KEY="$PAYMOB_API_KEY" \
  -e PAYMOB_INTEGRATION_ID="$PAYMOB_INTEGRATION_ID" \
  -e PAYMOB_IFRAME_ID="$PAYMOB_IFRAME_ID" \
  -e PAYMOB_HMAC_SECRET="$PAYMOB_HMAC_SECRET" \
  -e NEXT_PUBLIC_INSTAPAY_NUMBER="$NEXT_PUBLIC_INSTAPAY_NUMBER" \
  -e NEXT_PUBLIC_VODAFONE_CASH_NUMBER="$NEXT_PUBLIC_VODAFONE_CASH_NUMBER" \
  -e NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL"

echo ""
echo "✅ Deployed!"
echo ""
echo "📋 Post-deployment checklist:"
echo "   1. Go to Supabase → Storage → Create bucket named 'proofs' (public: ON)"
echo "   2. Go to Supabase → Auth → Settings → Add your Vercel URL to Site URL"
echo "   3. Sign up on your site, then run in Supabase SQL editor:"
echo "      UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';"
echo "   4. If using Paymob: set webhook URL in Paymob dashboard:"
echo "      https://your-domain.vercel.app/api/payments/paymob/webhook"
