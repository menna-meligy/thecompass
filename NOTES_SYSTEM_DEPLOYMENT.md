# Notes System Implementation - Deployment Guide

## Overview

This document provides production-ready deployment instructions for the bidirectional notes system with publish functionality for the البوصلة (albosla) coaching platform.

## What's New

### Client-Side Features
- **Notes Section** (`/[locale]/dashboard/bookings`):
  - Write and publish session notes for mentors to see
  - View unpublished notes as drafts
  - See admin's published mentor notes
  - Auto-save functionality every 30 seconds
  - Bilingual support (Arabic/English)

### Admin-Side Features
- **Mentor Notes** (`/[locale]/admin/clients/[userId]`):
  - Write and manage mentor notes for clients
  - Save as draft or publish directly
  - See client's published notes in-line
  - List of recent completed sessions
  - Bilingual mentor note input

## Database Requirements

### Prerequisites
- Supabase project with PostgreSQL database
- Already migrated tables: `client_notes`, `session_reflections`, `notes_audit_log`

### Schema Verification

Run the following SQL to verify the tables exist:

```sql
-- Check client_notes table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'client_notes';

-- Check session_reflections table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'session_reflections'
WHERE column_name LIKE '%mentor%' OR column_name = 'status';

-- Check for indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'client_notes' OR tablename = 'session_reflections';
```

### Required Columns

**client_notes table:**
- `id` (UUID, PRIMARY KEY)
- `booking_id` (UUID, FOREIGN KEY)
- `client_id` (UUID, FOREIGN KEY)
- `content_ar` (TEXT)
- `content_en` (TEXT)
- `is_public` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**session_reflections table:**
- `id` (UUID, PRIMARY KEY)
- `booking_id` (UUID)
- `client_id` (UUID)
- `mentor_id` (UUID)
- `mentor_notes_ar` (TEXT)
- `mentor_notes_en` (TEXT)
- `status` (VARCHAR) - values: 'draft', 'published', 'archived'
- `is_public` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `submitted_at` (TIMESTAMPTZ)

### Apply Migration (if not already applied)

```bash
# Using Supabase CLI
supabase db push

# OR manually in Supabase dashboard:
# Navigate to SQL Editor → supabase/notes_system_migration.sql
```

## API Endpoints

### Client Endpoints

#### GET /api/client-notes
Fetch client's own notes and published mentor notes for a booking.

**Query Parameters:**
```
- booking_id: string (required)
- client_id: string (required)
```

**Response:**
```json
{
  "clientNotes": [
    {
      "id": "uuid",
      "booking_id": "uuid",
      "client_id": "uuid",
      "content_ar": "string or null",
      "content_en": "string or null",
      "is_public": boolean,
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp"
    }
  ],
  "mentorNotes": {
    "id": "uuid",
    "booking_id": "uuid",
    "mentor_notes_ar": "string or null",
    "mentor_notes_en": "string or null",
    "status": "published",
    "updated_at": "ISO timestamp"
  } or null
}
```

#### POST /api/client-notes
Create or update client's own notes (draft or published).

**Request Body:**
```json
{
  "booking_id": "uuid",
  "client_id": "uuid",
  "content_ar": "string or null",
  "content_en": "string or null",
  "is_public": boolean
}
```

**Response:**
```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "client_id": "uuid",
  "content_ar": "string or null",
  "content_en": "string or null",
  "is_public": boolean,
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

### Admin Endpoints

#### GET /api/admin/mentor-notes
Fetch mentor notes and client's published notes for a booking.

**Query Parameters:**
```
- booking_id: string (required)
- client_id: string (required)
```

**Response:**
```json
{
  "mentorNotes": {
    "id": "uuid",
    "booking_id": "uuid",
    "mentor_notes_ar": "string or null",
    "mentor_notes_en": "string or null",
    "status": "draft" | "published",
    "updated_at": "ISO timestamp"
  } or null,
  "clientPublishedNotes": {
    "id": "uuid",
    "content_ar": "string or null",
    "content_en": "string or null",
    "is_public": true,
    "created_at": "ISO timestamp"
  } or null
}
```

#### POST /api/admin/mentor-notes
Create, update, or publish mentor notes.

**Request Body:**
```json
{
  "booking_id": "uuid",
  "client_id": "uuid",
  "mentor_notes_ar": "string or null",
  "mentor_notes_en": "string or null",
  "action": "save" | "publish"
}
```

**Response:**
```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "client_id": "uuid",
  "mentor_notes_ar": "string or null",
  "mentor_notes_en": "string or null",
  "status": "draft" | "published",
  "submitted_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

## Component Documentation

### Client Components

#### ClientSessionNotesForm
Location: `/src/components/dashboard/ClientSessionNotesForm.tsx`

Component for clients to write and publish session notes.

**Props:**
```typescript
{
  bookingId: string;
  clientId: string;
  locale?: "ar" | "en";
  onSave?: (note: ClientNote) => void;
}
```

**Features:**
- Write notes for mentor (public, visible)
- Write private notes (only client sees)
- Auto-save every 30 seconds
- Manual save button
- Character count validation
- Status indicators (draft/saved)

#### MentorNotesDisplay
Location: `/src/components/dashboard/MentorNotesDisplay.tsx`

Read-only display of published mentor notes for clients.

**Props:**
```typescript
{
  bookingId: string;
  clientId: string;
  locale?: "ar" | "en";
  onRefresh?: () => void;
}
```

**Features:**
- Shows only published mentor notes
- Bilingual content display
- Publication date/time
- Refresh capability
- Empty state when no mentor notes

### Admin Components

#### MentorNotesForm
Location: `/src/components/admin/MentorNotesForm.tsx`

Component for admins to write, save, and publish mentor notes.

**Props:**
```typescript
{
  bookingId: string;
  clientId: string;
  clientName?: string;
  locale?: "ar" | "en";
  onSave?: (note: MentorNote) => void;
}
```

**Features:**
- Write mentor notes in Arabic and English
- Save as draft (not visible to client)
- Publish notes (visible to client)
- View client's published notes inline
- Auto-save functionality
- Status indicators
- Character count validation

## Deployment Steps

### Step 1: Verify Database Migration

```bash
# Check if tables exist in Supabase
supabase db list

# If migration not applied:
cd supabase
supabase migration up
```

### Step 2: Deploy API Routes

The following new files have been created:
- `/src/app/api/client-notes/route.ts` - Client notes GET/POST
- `/src/app/api/admin/mentor-notes/route.ts` - Mentor notes GET/POST

No changes needed - these are automatically picked up by Next.js.

### Step 3: Deploy Components

New components created:
- `/src/components/dashboard/MentorNotesDisplay.tsx` - Client mentor notes display
- `/src/components/admin/MentorNotesForm.tsx` - Admin mentor notes editor

Updated components:
- `/src/components/dashboard/ClientSessionNotesForm.tsx` - Fixed API endpoint
- `/src/app/[locale]/dashboard/bookings/page.tsx` - Added MentorNotesDisplay
- `/src/app/[locale]/admin/clients/[userId]/page.tsx` - Added MentorNotesForm with recent bookings

### Step 4: Build & Deploy to Vercel

```bash
# Install dependencies (if needed)
npm install

# Build
npm run build

# Deploy
vercel deploy --prod

# Or if using Git:
git add .
git commit -m "Add bidirectional notes system with publish functionality"
git push origin main
```

## Testing Checklist

### Unit Tests
- [ ] Client can create and save draft notes
- [ ] Client can publish notes (is_public=true)
- [ ] Admin can create and save draft mentor notes
- [ ] Admin can publish mentor notes (status=published)
- [ ] Character count validation works (min 10, max 2000/3000)
- [ ] Bilingual content handling works

### Integration Tests
- [ ] Client publishes notes → Admin can fetch via API
- [ ] Admin publishes mentor notes → Client can see via API
- [ ] Unpublished notes are not visible to other party
- [ ] Status transitions work correctly (draft → published)
- [ ] Timestamps are updated correctly
- [ ] Audit logs are created for all operations

### E2E Tests
- [ ] Complete workflow:
  1. Book session
  2. Complete session
  3. Client writes and publishes notes
  4. Admin writes and publishes mentor notes
  5. Both can see each other's published notes
  6. Refresh shows updates

### Security Tests
- [ ] Client cannot access other clients' notes (401/403)
- [ ] Admin cannot edit client notes (403)
- [ ] Unpublished notes require correct is_public/status flag
- [ ] Row-level security (RLS) prevents unauthorized access

### Performance Tests
- [ ] Notes load within 500ms
- [ ] Auto-save doesn't create performance issues
- [ ] Queries use proper indexes

## Environment Variables

Ensure these are set in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Monitoring & Troubleshooting

### Check API Logs
```bash
# In Supabase dashboard:
# Edge Functions → Logs
# OR check Vercel logs:
vercel logs
```

### Database Queries
```sql
-- Check recent notes activity
SELECT * FROM client_notes ORDER BY updated_at DESC LIMIT 10;
SELECT * FROM session_reflections WHERE status='published' ORDER BY updated_at DESC LIMIT 10;

-- Check audit trail
SELECT * FROM notes_audit_log ORDER BY changed_at DESC LIMIT 20;

-- Check for RLS violations
SELECT * FROM notes_audit_log WHERE action='DENY' OR action='ERROR';
```

### Common Issues

#### Issue: "Unauthorized" error on client notes API
**Solution:** Verify auth user ID matches client_id in request

#### Issue: Admin cannot see client notes
**Solution:** Verify admin role in profiles table is 'admin'

#### Issue: Notes not showing up for other party
**Solution:** Check is_public (client_notes) and status (session_reflections) flags

#### Issue: Performance degradation
**Solution:** Verify indexes on booking_id, client_id, is_public, status columns

## Rollback Plan

If issues occur:

### Option 1: Revert Components
```bash
git revert <commit-hash>
vercel deploy --prod
```

### Option 2: Keep Database, Disable UI
- Remove MentorNotesDisplay component from bookings page
- Remove MentorNotesForm from admin clients page
- Data remains in database for recovery

### Option 3: Full Database Rollback
```bash
# In Supabase dashboard:
# Settings → Backups → Restore from timestamp
```

## Post-Deployment

### Verify Functionality
1. Login as client
2. Navigate to dashboard → bookings
3. Find completed booking
4. Write and save session notes
5. Publish notes
6. Login as admin
7. Navigate to admin clients
8. Find same client
9. See client's published notes
10. Write mentor notes
11. Publish
12. Login as client again
13. Verify mentor notes appear

### Monitor Usage
- Check Supabase database metrics
- Monitor API response times
- Track user feedback

## Support & Documentation

- Component Props: See inline JSDoc comments
- API Spec: See endpoint documentation above
- Database Schema: See notes_system_migration.sql
- Type Definitions: See `/src/lib/skills/types.ts`

## Future Enhancements

1. **Real-time Updates**: Implement Supabase Realtime subscriptions
2. **Notifications**: Email alerts when notes are published
3. **Rich Text Editor**: Upgrade from textarea to rich text (Markdown/WYSIWYG)
4. **Search & Filter**: Full-text search on notes content
5. **Templates**: Pre-built mentor note templates
6. **Analytics**: Track notes engagement and patterns
7. **Versioning**: Keep history of note edits
8. **Commenting**: Reply/discussion on notes

## Version Information

- **Implementation Date**: September 2026
- **Database Migration**: notes_system_migration.sql
- **Next.js Version**: 14+ (App Router)
- **Supabase**: Latest (with RLS)
- **Components**: React 18+, use "use client" for state management
