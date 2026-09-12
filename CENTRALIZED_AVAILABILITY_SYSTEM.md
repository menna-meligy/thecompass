# Centralized Availability System - Complete Redesign

## Overview

The availability system has been completely redesigned to provide a **single master calendar** where admins create time slots once, then assign them to different workshops and individual sessions. This eliminates the need to manage separate slot lists per session.

## How It Works

### For Admins

1. **Create Master Time Slots**
   - Navigate to `/ar/admin/availability`
   - Select a date from the calendar
   - Enter start time, end time, and capacity
   - Click "Add" to create the slot
   - Slot appears in the master list

2. **Assign Slots to Workshops/Sessions**
   - Select a slot from the list
   - Choose a workshop or individual session to assign it to
   - Click "Assign" to link the slot
   - Slot now appears in both the master list and available for that workshop/session

3. **Manage Slots**
   - View all booked/available slots
   - Delete slots that are no longer needed
   - See which workshops/sessions each slot is assigned to

### For Clients

1. **Browse Available Slots**
   - Go to `/ar/book/availability`
   - Slots are grouped by date
   - See which workshop or session each slot is for
   - See capacity and how many spots are available

2. **Book a Session**
   - Click on an available slot
   - Proceed to checkout
   - Complete payment
   - Booking confirmed

## Database Structure

### New Tables

#### `availability_slots` (Master Calendar)
```sql
- id (UUID): Unique slot ID
- date (DATE): Slot date
- start_time (TIME): Start time
- end_time (TIME): End time
- capacity (INTEGER): Max participants
- booked_count (INTEGER): Current bookings
- created_by (UUID): Admin who created
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `slot_assignments` (Slot-to-Workshop/Session Links)
```sql
- id (UUID): Assignment ID
- slot_id (UUID): FK to availability_slots
- session_id (UUID): FK to sessions (optional)
- workshop_id (UUID): FK to workshops (optional)
- assigned_at (TIMESTAMPTZ)
```

### Constraints
- Each slot is unique by (date, start_time, end_time)
- Each assignment must have either session_id OR workshop_id (not both required)

## API Endpoints

### Admin APIs

**GET** `/api/admin/availability/slots`
- Lists all master time slots with their assignments
- Returns slot details + linked workshops/sessions

**POST** `/api/admin/availability/slots`
- Create a new master time slot
- Required: date, start_time, end_time, capacity

**DELETE** `/api/admin/availability/slots/:id`
- Delete a master time slot
- Also deletes all assignments for that slot

**POST** `/api/admin/availability/assign`
- Assign a slot to a workshop or session
- Required: slot_id, (workshop_id OR session_id)

**GET** `/api/admin/availability/workshops`
- List all published workshops (for assignment dropdown)

**GET** `/api/admin/availability/sessions`
- List all published sessions (for assignment dropdown)

### Public APIs

**GET** `/api/availability/centralized-slots`
- Lists future available slots (public-facing)
- Shows assignments and booking status
- Filtered by: date >= today, status = published

## Components

### Admin Components
- `CentralizedAvailabilityManager.tsx`
  - Master calendar interface
  - Slot creation form
  - Slot-to-workshop assignment interface
  - Slot management (delete)

### Client Components
- `CentralizedSlotBrowser.tsx`
  - Calendar view grouped by date
  - Available slot cards
  - Shows workshop/session name and capacity
  - Click-to-select slot for booking

## Migration

Run the migration to create the new tables:
```bash
# Run via Supabase SQL editor or CLI
cat supabase/centralized_availability_migration.sql | psql <connection>
```

## Key Differences from Old System

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **Slot Creation** | Per session (separate form for each) | Once in master calendar |
| **Slot Management** | Per session | Centralized in one place |
| **Assignment** | Implicit (slots created for specific sessions) | Explicit (create slot, then assign) |
| **Reuse** | Slots cannot be shared | Slots can be assigned to multiple workshops |
| **Client View** | Session-specific slots | Centralized slot browser by date |

## Benefits

✅ **Single Source of Truth** - One master calendar instead of scattered per-session slots
✅ **Flexible Assignments** - Same slot can serve multiple workshops/sessions
✅ **Cleaner UI** - Admins don't navigate through multiple sessions
✅ **Better UX for Clients** - Browse all available times in one calendar view
✅ **Easier Management** - Delete one slot, it's gone everywhere
✅ **Scalable** - Works for unlimited workshops and sessions

## Testing

### Admin Flow
1. Create 3 slots: 9am-10am, 10am-11am, 2pm-3pm on the same day
2. Assign 9am-10am to Workshop A
3. Assign 10am-11am to Workshop B
4. Assign 2pm-3pm to Individual Session
5. Verify each slot shows correct assignments
6. Delete a slot and verify it disappears

### Client Flow
1. Visit `/ar/book/availability`
2. See all 3 slots grouped by date
3. Each shows: time range, workshop name, available capacity
4. Click one to proceed with booking
5. Complete booking flow

## Files Modified/Created

### New Files
- `/supabase/centralized_availability_migration.sql` - DB schema
- `/src/components/admin/CentralizedAvailabilityManager.tsx` - Admin UI
- `/src/components/booking/CentralizedSlotBrowser.tsx` - Client UI
- `/src/app/api/admin/availability/slots/route.ts` - Slot CRUD
- `/src/app/api/admin/availability/slots/[id]/route.ts` - Slot delete
- `/src/app/api/admin/availability/assign/route.ts` - Assignment creation
- `/src/app/api/admin/availability/workshops/route.ts` - Workshop list
- `/src/app/api/admin/availability/sessions/route.ts` - Session list
- `/src/app/api/availability/centralized-slots/route.ts` - Public slot list

### Modified Files
- `/src/app/[locale]/admin/availability/page.tsx` - Now uses CentralizedAvailabilityManager

## Next Steps

1. Apply the database migration
2. Deploy the code
3. Test admin flow (create, assign, delete)
4. Test client flow (browse, book)
5. Verify old session-specific slot pages still work (for backwards compatibility)

## Notes

- Old `time_slots` and `AvailabilityManager` are still in place for backwards compatibility
- Can be removed in a future cleanup once migration is confirmed complete
- RLS policies ensure only admins can create/modify slots
- All slots default to unpublished status (set via API if needed)
