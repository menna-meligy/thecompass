# Payment scenario — what needs to happen (البوصلة)

This is the manual-transfer payment flow (InstaPay / Vodafone Cash). Card payment
via Paymob is coded but disabled until Paymob keys are set.

---

## 0. Blockers / prerequisites (do these first)

| # | Item | Status | Action needed |
|---|------|--------|---------------|
| 1 | **Supabase (local dev)** | ✅ RUNNING via `npx supabase start` (Docker). `.env.local` → `http://127.0.0.1:54321`. Schema + curriculum + pricing loaded; site works. | Start it with `npx supabase start` in the repo when you resume. Studio: `http://127.0.0.1:54323`. |
| 1b | **Supabase (production)** | ❌ old hosted project is dead | For Vercel/production, create a new hosted project, run `supabase/schema.sql` (now fixed) + `workshops_curriculum_migration.sql` + `workshops_pricing_seed.sql`, and swap the 3 Supabase keys in `.env.local`. |
| 2 | **Storage bucket** | ✅ `payment-proofs` created (local) | On a new hosted project, create a public bucket named `payment-proofs` |
| 3 | **Resend** (email) | ❌ placeholder | Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (verified domain). Without it, all emails are silent no-ops. |
| 4 | **Admin email** | ✅ set to `thecompass555@gmail.com` | Change `ADMIN_EMAIL` in `.env.local` if the admin inbox differs |
| 5 | **Receipt OCR** (optional) | not set | Set `OPENAI_API_KEY` to auto-verify receipts. If empty, any clear screenshot >20KB is soft-accepted and left for manual admin review. |
| 6 | **Paymob** (optional, card) | ❌ placeholder | Set `PAYMOB_*` to enable card payment. Not required for InstaPay/Vodafone. |

Prices are now aligned to the PDFs:
Break the Loop → **1500** full / **300** single · Play it Right → **1150** full / **250** single (5 seats).

---

## 1. User POV — steps to a successful payment

1. **Browse** → `/workshops` → open a workshop → sees per-session **price** + **Book** button.
2. **Book** (must be logged in) → `/book/[sessionId]`.
3. **Choose method** — InstaPay or Vodafone Cash → the number `01093036736` is shown (+ copy button + app link).
4. **Transfer** the exact amount from their own wallet/bank app to that number.
5. Click **"I Transferred — Upload Receipt"** → creates a `booking` (status `pending`) + `payment` (status `pending`).
6. **Upload the receipt screenshot** → `verify-screenshot`:
   - rejects a **duplicate** receipt (same image used before),
   - if `OPENAI_API_KEY` set: checks the recipient number (+ optional name + today's date),
   - otherwise: soft-accepts a clear screenshot.
7. Sees the **Confirmed** screen with appointment details → link to `/dashboard/bookings`.

> ⚠️ At this point the booking is **submitted, not yet approved**. Payment is still
> `pending` in the DB until the admin confirms it (step below). The success screen
> means "receipt received", not "money verified".

**For the payment to actually succeed, all of these must be true:** user is logged in •
session is `published` and not fully booked • they transferred the correct amount to
`01093036736` • the receipt screenshot is clear, unused, and (if OCR on) shows the right
number/date • Supabase + Storage are reachable.

---

## 2. Admin POV — tracking + notification

### Notification (new — implemented this round)
- When a user submits a receipt, the app POSTs `type: "admin_new_payment"` to `/api/send-email`,
  which emails **`ADMIN_EMAIL`** with client name, contact, workshop, amount, method, and a
  direct link to `/ar/admin/bookings`.
- **Requires Resend configured** (item 3). Until then it's a silent no-op.

### Tracking + approval
- Admin opens **`/admin/bookings`** — table of every booking with:
  filter tabs (All / Proof sent / Pending / Confirmed / Attended / Cancelled), search,
  status badge, amount, and a **👁 view-receipt** button.
- Admin actions per row:
  - **✔ Confirm** → payment → `paid`, booking → `confirmed`, emails the **user** a
    `payment_approved` confirmation, and adds a session card to their roadmap.
  - **✖ Cancel** → payment → `failed`, booking → `cancelled`.
  - **✔ Mark attended** (after confirmed) → booking → `attended`.

---

## 3. "Definition of done" checklist

- [ ] New Supabase project provisioned; schema + curriculum + pricing SQL run
- [ ] `payment-proofs` storage bucket created (public)
- [ ] `.env.local` updated: Supabase URL/anon/service keys, `RESEND_API_KEY`,
      `RESEND_FROM_EMAIL`, `ADMIN_EMAIL` (done), optional `OPENAI_API_KEY`, optional `PAYMOB_*`
- [ ] Test: user books → transfers → uploads receipt → sees Confirmed
- [ ] Test: admin receives the "new payment" email
- [ ] Test: admin confirms → user receives approval email → booking shows Confirmed
- [ ] (Optional) enable Paymob for instant card payments
