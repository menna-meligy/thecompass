# Admin Bookings Dashboard Implementation

## Overview

This document describes the complete admin bookings dashboard implementation for tracking and managing all client-side booking attempts, receipt uploads, and verification status.

## Components Created

### 1. API Endpoint: `/api/admin/bookings`

**Location:** `/src/app/api/admin/bookings/route.ts`

**Purpose:** Comprehensive API endpoint for fetching all bookings with payment and receipt data.

**Features:**
- Returns all bookings with:
  - Booking ID, user ID, session info, status
  - Payment info (amount, method, status, proof_url)
  - Receipt verification status and details
  - Creation timestamp
  - Admin approval notes and status

**Query Parameters:**
- `page` (int, default: 1) - Pagination page number
- `pageSize` (int, default: 50, max: 100) - Items per page
- `status` (string) - Filter by booking status
- `search` (string) - Search across name, email, phone, title, booking ID
- `paymentStatus` (string) - Filter by payment status (pending, paid, pending_verification, failed)
- `receiptStatus` (string) - Filter by receipt status (none, pending_verification, verified, rejected)
- `sortBy` (string) - Sort field (created_at, payment_deadline, session_date)
- `sortOrder` (string) - Sort order (asc, desc)

**Response Structure:**
```json
{
  "bookings": [
    {
      "id": "booking-uuid",
      "user_id": "user-uuid",
      "session_id": "session-uuid",
      "status": "pending|confirmed|cancelled|completed",
      "created_at": "2024-09-13T12:00:00Z",
      "payment_deadline": "2024-09-14T12:00:00Z",
      "user": {
        "full_name": "Client Name",
        "email": "client@example.com",
        "phone": "+20123456789"
      },
      "session": {
        "starts_at": "2024-09-15T14:00:00Z",
        "ends_at": "2024-09-15T15:00:00Z",
        "location_or_link": "https://...",
        "price": 500,
        "type": "group|individual",
        "workshop": {
          "title_ar": "عنوان الورشة",
          "title_en": "Workshop Title"
        }
      },
      "payment": {
        "id": "payment-uuid",
        "amount": 500,
        "currency": "EGP",
        "method": "instapay|vodafone_cash|paymob",
        "status": "pending|paid|failed|pending_verification",
        "proof_url": "https://storage.example.com/payment-proof.jpg",
        "gateway_txn_id": "ref:1234567890",
        "admin_approved": true,
        "approved_at": "2024-09-13T13:00:00Z",
        "admin_approval_notes_ar": "الملاحظات",
        "admin_approval_notes_en": "Notes",
        "created_at": "2024-09-13T12:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalFiltered": 45,
    "pages": 1
  }
}
```

### 2. Receipt Modal Component

**Location:** `/src/components/admin/ReceiptModal.tsx`

**Purpose:** Modal for viewing receipt images, verification details, and admin approval workflow.

**Features:**
- **Receipt Display:**
  - Full-size receipt image with zoom controls (0.5x - 2x)
  - Option to open in new window
  - Centered display with scrollable container

- **Payment Information Summary:**
  - Amount and currency
  - Payment method
  - Current status indicator
  - Transaction date

- **Verification Details:**
  - Reference number display
  - Approval status indicator
  - Approval date and time

- **Admin Approval Workflow:**
  - Bilingual notes fields (Arabic and English)
  - Approve button (for pending receipts)
  - Reject button (for pending receipts)
  - Loading states and error handling
  - Success confirmation

- **Read-Only Mode:**
  - For already-approved receipts, shows approval notes
  - Displays approval date/time
  - Prevents re-approval

**Props:**
```typescript
interface ReceiptModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  payment?: PaymentData;
  userEmail?: string;
  onApprovalChange?: () => void;
}
```

### 3. Enhanced Admin Bookings Page

**Location:** `/src/app/[locale]/admin/bookings/page.tsx`

**Purpose:** Main admin dashboard for managing bookings with advanced filtering, search, and bulk actions.

**Features:**

- **Filter Tabs:**
  - All bookings
  - Awaiting payment
  - Proof sent (pending review)
  - Pending
  - Confirmed
  - Attended
  - Cancelled
  - Count indicators for each status

- **Advanced Filtering:**
  - Payment status filter (pending, paid, under review, failed)
  - Receipt status filter (no receipt, pending review, verified, rejected)
  - Real-time search across:
    - Client name
    - Client email
    - Client phone
    - Workshop title
    - Booking ID

- **Desktop Table:**
  - Columns:
    - Checkbox (for bulk selection)
    - Client name and email
    - Session title
    - Date and time
    - Amount
    - Payment method
    - Payment status badge
    - Receipt status indicator (with icon)
    - Booking status badge
    - Actions
  - Hover effects for better UX
  - Full responsiveness

- **Mobile Cards:**
  - Condensed layout with essential info
  - Stacked action buttons
  - Touch-friendly spacing

- **Action Buttons:**
  - View Details (amber) - Opens booking detail modal
  - View Receipt (blue) - Opens receipt viewer
  - Confirm Receipt & Booking (green) - For "proof_submitted" status
  - Cancel Booking (red) - For pending/proof_submitted/confirmed
  - Mark Attended (purple) - For confirmed bookings
  - Loading spinner during action

- **Pagination:**
  - Page number display
  - Previous/Next buttons
  - Disable states for first/last pages
  - Results count and total display
  - Mobile-optimized pagination

- **Selection & Bulk Actions:**
  - Checkbox to select individual bookings
  - Select-all checkbox in table header
  - Prepared for future bulk action implementation

- **Status Indicators:**
  - Awaiting receipt (white/transparent)
  - Pending (amber)
  - Receipt to review (blue)
  - Confirmed (emerald/green)
  - Cancelled (red)
  - Attended (purple)

- **Receipt Status Icons:**
  - Clock icon + "pending" for pending verification
  - Check circle + "verified" for approved/paid
  - Alert circle + "rejected" for failed
  - "None" text for no receipt

## Database Schema

### Required Fields in Payments Table

The following fields are already added via the `manual_payment_approval_migration.sql`:

```sql
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approval_notes_ar TEXT,
ADD COLUMN IF NOT EXISTS admin_approval_notes_en TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
```

### Existing Fields Used

From the base `payments` table:
- `id` - UUID primary key
- `booking_id` - Foreign key to bookings
- `user_id` - Foreign key to profiles
- `amount` - Payment amount (NUMERIC)
- `currency` - Currency code (TEXT, default 'EGP')
- `method` - Payment method (instapay, vodafone_cash, paymob)
- `gateway_txn_id` - Transaction reference
- `proof_url` - Receipt image URL (TEXT)
- `status` - Payment status (pending, paid, failed, pending_verification, refunded)
- `created_at` - Timestamp

## API Integration Points

### 1. Admin Payment Approval
**Endpoint:** `POST /api/admin/payment-approval`

Used to approve or reject payment receipts with optional notes.

**Request Body:**
```json
{
  "booking_id": "uuid",
  "approved": true,
  "notes_ar": "ملاحظات عربي",
  "notes_en": "English notes"
}
```

**Response:**
```json
{
  "ok": true,
  "admin_approved": true
}
```

### 2. Email Notifications
**Endpoint:** `POST /api/send-email`

Triggers when:
- Admin approves a payment receipt

**Payload:**
```json
{
  "type": "payment_approved",
  "booking_id": "uuid",
  "admin_notes": "Optional notes"
}
```

### 3. Session Completion
**Endpoint:** `POST /api/admin/mark-complete`

Marks booking as attended and creates roadmap milestone.

## User Flows

### Admin Reviewing Bookings

1. **Browse All Bookings**
   - Admin opens `/app/[locale]/admin/bookings`
   - Dashboard loads all bookings with latest payment info
   - Status indicators show at a glance

2. **Filter to Find Receipts Needing Review**
   - Use Payment Status filter: "pending_verification"
   - Or use Receipt Status filter: "pending_verification"
   - Results show only bookings with uploaded receipts awaiting review

3. **Review Receipt Details**
   - Click "View Receipt" button (FileImage icon)
   - ReceiptModal opens showing:
     - Full-size receipt image with zoom
     - Payment amount verification
     - Transaction reference
     - Admin approval form

4. **Approve or Reject Receipt**
   - Add optional notes in Arabic and/or English
   - Click "Approve Receipt" or "Reject"
   - System updates payment status
   - Client receives notification email
   - Dashboard refreshes

5. **Confirm Booking**
   - Once receipt is approved, "Confirm Receipt & Booking" button appears
   - Click to confirm booking status
   - Client receives confirmation with session details
   - Booking moves to "Confirmed" status

### Tracking Payment Workflow

1. **Awaiting Payment** (blue, pending status)
   - Client hasn't paid yet
   - Payment deadline countdown visible

2. **Receipt Submitted** (blue, pending_verification status)
   - Client has uploaded and OCR'd receipt
   - Receipt passed basic validation
   - Awaiting admin manual review

3. **Receipt Approved** (green, paid status)
   - Admin has reviewed and approved receipt
   - Payment marked as verified
   - Ready for booking confirmation

4. **Booking Confirmed** (emerald, confirmed status)
   - Admin has confirmed the booking
   - Session locked
   - Client can attend

5. **Session Attended** (purple, attended status)
   - Admin marks after session completion
   - Roadmap milestone created for client
   - Booking cycle complete

## Security & Authorization

- All endpoints require admin authentication (role = 'admin')
- Admin can only view bookings for bookings in the system
- Admin can only update payment approval for their own bookings
- Row-level security (RLS) enforced at database level
- All actions logged with `approved_by` user ID and timestamp

## Performance Considerations

- API implements pagination to handle large datasets efficiently
- Post-processing filters applied after database query
- Indexed queries on common filter fields:
  - `idx_payments_admin_approved`
  - `idx_payments_approved_by`
  - `idx_payments_approved_at`
- Component uses `useCallback` for memoization
- State managed efficiently with sets for bulk selection

## Bilingual Support

- All UI text translated to Arabic and English
- Dynamically switches based on `useLocale()` from next-intl
- Dates formatted with correct locale
- Notes fields support both Arabic and English input
- Storage preserves both language versions

## Mobile Responsiveness

- Desktop: Full table with all columns
- Mobile (sm breakpoint): Card-based layout
- Touch-friendly button sizing
- Pagination optimized for small screens
- All modals work on mobile with adjusted sizing

## Future Enhancements

1. **Bulk Actions:**
   - Approve multiple receipts at once
   - Reject multiple receipts with single reason
   - Send batch notifications

2. **Advanced Analytics:**
   - Payment completion rate by time period
   - Receipt verification time tracking
   - Payment method popularity

3. **Automated Reminders:**
   - Send payment reminders for overdue bookings
   - Follow-up reminders for rejected receipts

4. **Receipt OCR Improvements:**
   - Manual entry for receipt fields if OCR fails
   - Support for different receipt formats
   - Reference number uniqueness validation

5. **Webhook Integration:**
   - Real-time receipt status updates
   - Automatic client notifications
   - Integration with other business systems

## Testing Checklist

- [ ] API endpoint returns correct data with pagination
- [ ] Filters work independently and in combination
- [ ] Search functionality across all fields
- [ ] Receipt modal displays images correctly
- [ ] Zoom controls work (0.5x to 2x)
- [ ] Approve/Reject workflow functions
- [ ] Admin notes saved in both languages
- [ ] Client receives notification on approval
- [ ] Pagination works with all filters
- [ ] Mobile layout responds correctly
- [ ] Permission checks work (admin-only access)
- [ ] Status indicators update in real-time
- [ ] Error messages display correctly
- [ ] Loading states show during operations

## Files Modified/Created

### New Files:
- `/src/app/api/admin/bookings/route.ts` - Main API endpoint
- `/src/components/admin/ReceiptModal.tsx` - Receipt viewer and approval component

### Modified Files:
- `/src/app/[locale]/admin/bookings/page.tsx` - Enhanced dashboard page

### No Database Changes Required:
- All necessary fields already exist via `manual_payment_approval_migration.sql`
- RLS policies already configured

## Deployment Notes

1. Ensure Supabase migration `manual_payment_approval_migration.sql` has been applied
2. Verify `admin_approved`, `approved_by`, and `approved_at` fields exist in payments table
3. Test payment approval workflow end-to-end
4. Verify email service is configured for notifications
5. Check storage bucket permissions for receipt image display
6. Test with real payment data before going live

## Troubleshooting

**Issue:** Receipts not displaying
- Check storage bucket permissions
- Verify proof_url is valid and publicly accessible

**Issue:** Approval status not updating
- Check admin role in profiles table
- Verify RLS policies allow update
- Check API response for errors

**Issue:** Pagination not working
- Clear browser cache
- Verify pageSize parameter is valid
- Check total count calculation

**Issue:** Filters not returning results
- Verify filter values match database
- Check search terms in browser console
- Test individual filters separately
