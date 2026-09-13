# Complete Booking Workflow Implementation

## Overview
Full end-to-end booking flow with centralized availability calendar, receipt verification, admin approval, and Google Meet link distribution.

## Flow Steps

### 1. **Client Selection** (`/book/availability`)
- Client browses available time slots from centralized calendar
- Slots show: date, time, workshop name, capacity, availability
- One slot can only accommodate ONE client
- When booked, slot is automatically locked and removed from availability

### 2. **Confirmation** (Step 1)
- User confirms booking details
- Booking record created with status `pending`
- Payment record created with status `pending`

### 3. **Receipt Upload** (Step 2)
- User uploads payment proof image (JPG/PNG, max 5MB)
- Image uploaded to Supabase Storage
- Payment status changes to `pending_verification`
- System waits for admin approval

### 4. **Admin Review** (PaymentApprovalPanel)
- Admin sees list of all pending receipts
- Admin can view receipt image in modal
- Admin adds notes in Arabic and English
- Admin approves or rejects payment

### 5. **Payment Approval**
- On approval:
  - Payment status → `paid`
  - Booking status → `confirmed`
  - Google Meet link distributed to client
  - Slot capacity updated (booked_count incremented)
- On rejection:
  - Payment status → `failed`
  - Booking status → `cancelled`
  - Slot freed up for other bookings

### 6. **Countdown Timer**
- Client sees countdown to session start
- Format: "1d 2h", "30m 45s", etc.
- Auto-updates every second

### 7. **Google Meet Link Distribution**
- Meeting link: https://meet.google.com/kcv-icuc-ovm
- Sent to client after admin approval
- Displayed on success screen

## Database Schema Updates

### New Tables/Columns
- `availability_slots.booked_count` - tracks bookings per slot
- `bookings.slot_id` - links to centralized slots
- `bookings.google_meet_link` - meeting link for confirmed bookings
- `bookings.scheduled_at` - session datetime
- `payments.receipt_image_url` - uploaded proof image URL
- `payments.admin_notes_ar/en` - admin review notes
- `payments.approved_by` - admin user ID
- `payments.approved_at` - approval timestamp

### Triggers
- `update_slot_booked_count_trigger` - auto-increments/decrements capacity as bookings confirmed/cancelled
- `check_slot_capacity_trigger` - prevents overbooking

### RLS Policies
- Admins can view and manage all payments
- Users can only view/upload their own receipts
- Slot assignments readable by all

## API Endpoints

### Client Endpoints
- `POST /api/bookings/create` - Create booking & payment record
- `POST /api/bookings/upload-receipt` - Upload payment proof
- `GET /api/availability/centralized-slots` - Browse available slots

### Admin Endpoints
- `GET /api/admin/payments/pending` - List pending verifications
- `POST /api/admin/bookings/approve-payment` - Approve/reject payment
- `GET /api/admin/availability/slots` - Manage centralized slots
- `POST /api/admin/availability/assign` - Assign slots to workshops

## Components

### Client Components
- **CentralizedSlotBrowser** - Browse slots by date
- **BookingCheckout** - 4-step checkout flow
  - Step 1: Confirm booking
  - Step 2: Upload receipt
  - Step 3: Waiting for admin (countdown timer)
  - Step 4: Success with Google Meet link

### Admin Components
- **CentralizedAvailabilityManager** - Create/manage slots
- **PaymentApprovalPanel** - Review and approve receipts

## Features

✅ Centralized master calendar (admin creates once)
✅ Assign slots to workshops (dual dropdown interface)
✅ One client per slot (automatic capacity enforcement)
✅ Receipt/proof upload with image validation
✅ Manual admin verification (view image, add notes)
✅ Google Meet link distribution after approval
✅ Countdown timer showing time until session
✅ Automatic slot removal when capacity reached
✅ Bilingual UI (Arabic/English)
✅ RLS security with role-based access

## Testing Checklist

- [ ] Create slot in admin interface
- [ ] Assign slot to workshop
- [ ] Browse and select slot as client
- [ ] Upload payment receipt
- [ ] Admin approves receipt
- [ ] Client receives Google Meet link
- [ ] Countdown timer working
- [ ] Slot locked after booking (not available for other users)
- [ ] Bilingual UI functioning correctly

## Environment Variables Required

```
NEXT_PUBLIC_GOOGLE_MEET_LINK=https://meet.google.com/kcv-icuc-ovm
```

## Known Limitations

- userId retrieval from localStorage (should use auth context in production)
- Email notifications not yet implemented
- Paymob/Instapay integration pending
