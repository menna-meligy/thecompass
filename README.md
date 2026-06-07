# البوصلة (Al-Bosla) — Coaching Platform

A bilingual (Arabic/English) coaching and self-development platform built with Next.js App Router, Supabase, and Tailwind CSS.

## Features

- 🌍 Bilingual (Arabic RTL + English LTR) with next-intl
- 🔐 Authentication (Magic Link + Email/Password via Supabase)
- 📅 Workshop browsing + session booking
- 💳 Payment: Paymob (card) + Manual (InstaPay / Vodafone Cash with proof upload)
- 🗺️ Gamified roadmap with XP, levels, and badges (Framer Motion)
- 👤 User dashboard (bookings, materials, profile)
- 🔧 Admin panel (full CRUD: workshops, sessions, bookings, vlogs, discounts, announcements, materials)
- 📧 Email notifications via Resend

## Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS v4
- **i18n**: next-intl (ar default, en)
- **Forms**: react-hook-form + zod
- **Animation**: framer-motion
- **Email**: Resend
- **Payments**: Paymob + Manual

## Setup

### 1. Clone and install

```bash
cd albosla
npm install
```

### 2. Environment variables

Copy `.env.local` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Paymob
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database setup

Run the SQL schema in your Supabase SQL editor:

```bash
# Copy contents of supabase/schema.sql and run in Supabase dashboard
```

### 4. Supabase Storage

Create a bucket named `proofs` with public access for payment proof uploads.

### 5. Set admin user

After creating your admin account, run in Supabase SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### 6. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to `/ar`.

## Routes

### Public
- `/ar` or `/en` — Landing page
- `/ar/workshops` — Workshop listing
- `/ar/workshops/[id]` — Workshop detail
- `/ar/vlogs` — Video content
- `/ar/auth` — Login / Register

### User Dashboard (requires auth)
- `/ar/dashboard` — Overview
- `/ar/dashboard/roadmap` — Gamified journey
- `/ar/dashboard/bookings` — Booking history
- `/ar/dashboard/materials/[bookingId]` — Session materials
- `/ar/dashboard/profile` — Edit profile

### Admin (requires admin role)
- `/ar/admin` — Analytics
- `/ar/admin/workshops` — Manage workshops
- `/ar/admin/bookings` — Approve payments, manage bookings
- `/ar/admin/vlogs` — Video content management
- `/ar/admin/discounts` — Promo codes
- `/ar/admin/announcements` — Site announcements
- `/ar/admin/materials` — Upload session notes

## Payment Flow

### Paymob (card)
1. User selects Paymob → API creates Paymob order → redirects to iframe
2. Paymob webhook (`/api/payments/paymob/webhook`) receives callback with HMAC verification
3. Booking status updated to `confirmed`

### Manual (InstaPay / Vodafone Cash)
1. User completes booking → prompted to upload payment screenshot
2. File uploaded to Supabase Storage (`proofs` bucket)
3. Admin reviews in `/admin/bookings` → approves or rejects
4. Confirmation email sent via Resend

## Deploy

### Vercel (recommended)

```bash
vercel deploy
```

Set all environment variables in Vercel dashboard. Make sure to:
1. Set `NEXT_PUBLIC_APP_URL` to your production domain
2. Add production domain to Supabase allowed URLs
3. Update Paymob webhook URL to `https://yourdomain.com/api/payments/paymob/webhook`

### Supabase
- Enable Email Auth in Supabase dashboard
- Configure email templates for magic link
- Set `Site URL` and redirect URLs in Supabase Auth settings
