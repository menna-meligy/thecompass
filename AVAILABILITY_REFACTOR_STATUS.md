# Availability System Refactor - Implementation Status

## ✅ COMPLETED

### Database
- [x] Migration file created: `/supabase/admin_marking_migration.sql`
  - Adds `admin_marked_status` column to `availability_slots`
  - Creates Career Deciding Session
  - Index for query performance

### Admin Components (NEW)
- [x] `CalendarGrid.tsx` - Month calendar with color indicators (🟢🔴⚪)
- [x] `SlotEditModal.tsx` - Date/time selection + 7-option dropdown
- [x] `CentralizedAvailabilityManager.tsx` - REFACTORED to use new components
  - Removed capacity field
  - Integrated calendar + modal
  - Builds 7 session type options dynamically

### Client Components (NEW)
- [x] `SessionSelector.tsx` - 7-option dropdown for clients

### Types
- [x] Added `AdminMarkedStatus` enum to `/src/types/index.ts`

### API Routes (UPDATED)
- [x] `/api/admin/availability/slots` - POST now accepts admin_marked_status + session_id/workshop_id
- [x] `/api/availability/centralized-slots` - GET now returns admin_marked_status for client color display

---

## ⏳ STILL NEEDS

### Client-Side Integration (Quick)
Update `/src/app/[locale]/book/availability/page.tsx`:
1. Import `SessionSelector` component
2. Replace the workshop selection step with SessionSelector showing 7 options
3. Pass selected session type ID to slot filtering logic
4. Update slot display to show colors based on `admin_marked_status`

**New Flow:**
- "Select session type" (7 dropdown) → Calendar (green/red/gray) → Time slots → Booking

### API: Handle Capacity = 1
- Career/Individual sessions: capacity = 1 (already set in POST)
- Workshop groups: capacity = 1 (already set in POST)
- Each booking = 1 person, slot can hold 1 at a time

### Database Migration Apply
**Command:**
```bash
cd /Users/mennaelmeligy/albosla
npx supabase migration up
# OR manually run against production Supabase:
psql postgresql://postgres.irinehjflompktssnbwa:elbosla123.meme@aws-1-eu-central-1.pooler.supabase.com:5432/postgres < supabase/admin_marking_migration.sql
```

### Testing Checklist
- [ ] Migration applied successfully
- [ ] Admin can see calendar (month view)
- [ ] Admin clicks date → modal opens
- [ ] Admin selects start/end time + session type (7 options)
- [ ] Admin clicks "Create Slot" → slot appears as 🟢 green
- [ ] Admin clicks date again → "Mark Unavailable" → slot appears as 🔴 red
- [ ] Client logs in (different account)
- [ ] Client sees same calendar colors
- [ ] Client selects Career Deciding → books successfully → receipt upload works
- [ ] Client selects Workshop 1 Individual → books → receipt upload works
- [ ] Client selects Workshop 2 Group → books → receipt upload works
- [ ] No errors in browser console or server logs

---

## Architecture Overview

```
Admin Flow:
Click Calendar Day
    ↓
SlotEditModal Opens
    ↓
Enter Time + Session Type (7 options)
    ↓
Create Slot OR Mark Unavailable
    ↓
POST /api/admin/availability/slots
    ↓
Slot saved with admin_marked_status
    ↓
Calendar updates immediately

Client Flow:
SessionSelector (7 options)
    ↓
Filter availability_slots by selection
    ↓
Display slots with colors (🟢🔴)
    ↓
Click slot → Booking Flow (unchanged)
    ↓
Receipt upload → Payment approval
```

---

## Key Data Mapping

### Session Type ID → Label + Details

```
"career-deciding" →
  label: "Career Deciding Session"
  labelAr: "جلسة تحديد المسار الوظيفي"
  price: 500 EGP
  type: "individual"

"{workshop-id}-individual" →
  label: "Workshop Name - Individual"
  labelAr: "اسم الورشة - فردي"
  price: 500 EGP
  type: "individual"

"{workshop-id}-group" →
  label: "Workshop Name - Group"
  labelAr: "اسم الورشة - مجموعة"
  price: 1200 EGP
  type: "group"
```

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `/src/components/admin/CalendarGrid.tsx` | NEW | ✅ |
| `/src/components/admin/SlotEditModal.tsx` | NEW | ✅ |
| `/src/components/admin/CentralizedAvailabilityManager.tsx` | REFACTOR | ✅ |
| `/src/components/booking/SessionSelector.tsx` | NEW | ✅ |
| `/src/types/index.ts` | UPDATE | ✅ |
| `/src/app/api/admin/availability/slots/route.ts` | UPDATE | ✅ |
| `/src/app/api/availability/centralized-slots/route.ts` | UPDATE | ✅ |
| `/src/app/[locale]/book/availability/page.tsx` | PENDING | ⏳ |
| `/supabase/admin_marking_migration.sql` | NEW | ✅ |

---

## Next Steps

1. **Apply migration** to production database
2. **Update client booking page** (20 min)
3. **Test admin flow** - create/mark slots
4. **Test client sync** - see same calendar
5. **Book all 7 session types** - verify receipt upload works for each
6. **Demo walkthrough** to user

---

## Notes

- Capacity field removed from admin UI (default 1 per slot)
- Each slot = 1 person max
- Multi-person workshops handled by client selecting quantity before booking (existing flow)
- Career Deciding Session created as permanent one-time session (recurring slots can be made for it)
- Color coding syncs via `admin_marked_status`:
  - `available` → 🟢 Green (bookable)
  - `unavailable`/`full` → 🔴 Red ("Fully Booked" shown to client)
  - No slots → ⚪ Gray

