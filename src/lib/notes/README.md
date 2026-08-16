# Bidirectional Notes System

Complete audit-tracked system for mentor-to-client and client-to-mentor notes in البوصلة (Al-Bosla).

## Overview

The notes system enables:

1. **Session Reflections** - Mentor-created reflections with bilingual encouragement and private notes
2. **Client Notes** - Client responses and reflections on sessions
3. **Audit Logging** - Complete change history with user tracking
4. **Permission-Based Access** - RLS policies for secure multi-user access

## Architecture

### Database Schema (Phase 1)

#### Enhanced `session_reflections`
```
- created_by (UUID) - who created this reflection
- updated_at (TIMESTAMPTZ) - last update timestamp
- is_public (BOOLEAN) - publication status
- mentor_notes_ar (TEXT) - mentor private notes in Arabic
- mentor_notes_en (TEXT) - mentor private notes in English
- status (VARCHAR) - 'draft', 'published', 'archived'
```

#### New `client_notes` Table
```
- booking_id (UUID FK) - reference to session booking
- client_id (UUID FK) - client who wrote the note
- content_ar (TEXT) - note content in Arabic
- content_en (TEXT) - note content in English
- is_public (BOOLEAN) - visibility to mentor
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(booking_id, is_public) - one public + one private per booking
```

#### New `notes_audit_log` Table
```
- table_name (VARCHAR) - which table was changed
- record_id (UUID) - which record was changed
- action (VARCHAR) - INSERT, UPDATE, DELETE
- changed_by (UUID FK) - who made the change
- changed_at (TIMESTAMPTZ) - when it happened
- old_data (JSONB) - previous values
- new_data (JSONB) - current values
```

### RLS Policies

**session_reflections:**
- Clients can read their own public reflections
- Clients can read all their reflections (including private)
- Admins can read all reflections
- Admins can update reflections (publish, add notes, change status)

**client_notes:**
- Clients can read/write their own notes
- Admins can read/manage all notes

**notes_audit_log:**
- Admins can read audit logs
- System can insert audit entries

### Operations (Phase 2)

#### Creating Reflections

```typescript
import { createSessionReflection } from '@/lib/notes';

const result = await createSessionReflection(
  db,
  bookingId,
  mentorId,
  clientId,
  {
    encouragement_ar: 'شكراً على مشاركتك الفعالة',
    encouragement_en: 'Thank you for your active participation',
    private_notes: 'Client showed great interest in career path discussion',
    is_public: true,
    status: 'published'
  }
);

if (result.success) {
  console.log('Reflection created:', result.data);
} else {
  console.error('Error:', result.error.message);
}
```

#### Updating Reflections

```typescript
import { updateSessionReflection, publishReflection } from '@/lib/notes';

// Update content
const updated = await updateSessionReflection(
  db,
  reflectionId,
  {
    mentor_notes_ar: 'تطور ملحوظ في التحليل',
    mentor_notes_en: 'Notable improvement in analytical thinking'
  },
  adminUserId
);

// Or publish with one call
const published = await publishReflection(db, reflectionId, adminUserId);
```

#### Fetching Client Reflections

```typescript
import { getClientReflections } from '@/lib/notes';

// Get all public reflections
const result = await getClientReflections(db, clientId);

// Include private reflections (admin only)
const allResult = await getClientReflections(db, clientId, true);

if (result.success) {
  result.data.forEach(reflection => {
    console.log(reflection.encouragement_ar);
    console.log(reflection.skills); // Associated skills
  });
}
```

#### Creating Client Notes

```typescript
import { createClientNote } from '@/lib/notes';

// Public note visible to mentor
const publicNote = await createClientNote(
  db,
  bookingId,
  clientId,
  {
    ar: 'استفدت جداً من الجلسة',
    en: 'I benefited greatly from the session'
  },
  true // is_public
);

// Private note (only for client)
const privateNote = await createClientNote(
  db,
  bookingId,
  clientId,
  {
    ar: 'أريد العودة إلى هذا الموضوع',
    en: 'I want to revisit this topic'
  },
  false // is_public
);
```

#### Getting Complete Reflection View

```typescript
import { getReflectionWithNotes } from '@/lib/notes';

const result = await getReflectionWithNotes(
  db,
  bookingId,
  'admin', // 'client' or 'admin'
  userId
);

if (result.success) {
  const { reflection, clientNotes, auditTrail } = result.data;
  
  console.log('Reflection:', reflection);
  console.log('Client notes:', clientNotes);
  console.log('Audit trail:', auditTrail); // Only populated for admins
}
```

#### Syncing Notes to Client

```typescript
import { syncNotesToClient } from '@/lib/notes';

// Ensures client can see the reflection
const result = await syncNotesToClient(db, reflectionId, clientId);

if (result.success) {
  console.log('Reflection is now visible to client');
}
```

#### Getting Audit Trail

```typescript
import { getNotesAuditTrail } from '@/lib/notes';

const result = await getNotesAuditTrail(db, reflectionId);

if (result.success) {
  result.data.forEach(entry => {
    console.log(`${entry.action} by ${entry.changed_by} at ${entry.changed_at}`);
    console.log('Old:', entry.old_data);
    console.log('New:', entry.new_data);
  });
}
```

#### Getting Statistics

```typescript
import { getNotesStatistics } from '@/lib/notes';

const result = await getNotesStatistics(db, reflectionId);

if (result.success) {
  const stats = result.data;
  console.log(`Total notes: ${stats.totalNotes}`);
  console.log(`Public: ${stats.publicNotes}, Private: ${stats.privateNotes}`);
  console.log(`Audit entries: ${stats.auditEntries}`);
  console.log(`Last update: ${stats.lastUpdated}`);
}
```

## Error Handling

All operations return a `Result<T>` type for consistent error handling:

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: NotesError };

interface NotesError {
  code: string;
  message: string;
  details?: unknown;
}
```

Error codes:
- `INVALID_PARAMS` - Missing or invalid parameters
- `REFLECTION_EXISTS` - Reflection already exists for this booking
- `NOTE_EXISTS` - Note already exists with same public status
- `NOT_FOUND` - Requested resource not found
- `FORBIDDEN` - User lacks permission for operation
- `DB_ERROR` - Database operation failed
- `UNEXPECTED_ERROR` - Unhandled exception

## Data Consistency

### Atomicity
- Each operation is transactional
- Audit logs are written automatically via triggers
- Conflicts are prevented by UNIQUE constraints

### Conflict Resolution
- Graceful handling via Result types
- Clear error messages for debugging
- Audit trail for debugging conflicts

### Timestamps
- All operations include `updated_at` tracking
- Audit logs track `changed_at` per action
- Server-side NOW() ensures consistency

## Security

### Row-Level Security (RLS)
- All tables have RLS enabled
- Policies enforce user isolation
- Admins have full access
- Clients see only their own data

### Audit Trail
- Every change is logged
- User ID tracked per action
- Before/after values stored
- Immutable (triggers INSERT only)

### Permissions
- Clients can only create/update own notes
- Clients can only read public reflections
- Admins have full CRUD access
- Audit logs read-only for admins

## Migration Steps

### 1. Apply Phase 1 Migration

```bash
# In your database client:
supabase db push --schema notes_system_migration.sql
```

Or in Supabase dashboard:
- SQL Editor → New query
- Paste contents of `supabase/notes_system_migration.sql`
- Run query

### 2. Verify Schema

```sql
-- Check tables exist
SELECT * FROM information_schema.tables 
WHERE table_name IN ('client_notes', 'notes_audit_log')
AND table_schema = 'public';

-- Check columns added to session_reflections
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'session_reflections' 
AND column_name IN ('created_by', 'is_public', 'status', 'mentor_notes_ar', 'mentor_notes_en');
```

### 3. Import Operations

```typescript
import {
  createSessionReflection,
  updateSessionReflection,
  getReflectionWithNotes,
  // ... etc
} from '@/lib/notes';
```

## TypeScript Types

Import comprehensive types for strict typing:

```typescript
import type {
  SessionReflectionData,
  ClientNoteData,
  ReflectionWithNotes,
  AuditLogEntry,
  NotesError,
  Result,
  // ... and more
} from '@/lib/notes';
```

## Performance Considerations

### Indexes
- `client_notes(booking_id, is_public)`
- `session_reflections(client_id, is_public, status)`
- `notes_audit_log(table_name, record_id, changed_at DESC)`

### Query Optimization
- Use RLS to pre-filter rows
- Select specific columns when possible
- Paginate large result sets
- Cache audit trails when appropriate

## Bilingual Support

All text fields support both Arabic and English:

```typescript
{
  encouragement_ar: 'محتوى بالعربية',
  encouragement_en: 'English content',
  mentor_notes_ar: 'ملاحظات',
  mentor_notes_en: 'Notes'
}
```

Use optional chaining to handle missing translations:
```typescript
const text = reflection.encouragement_ar ?? reflection.encouragement_en;
```

## Future Enhancements

Potential additions:
- Real-time updates via Supabase subscriptions
- Note versioning (keep all versions)
- Bulk operations for batch reflections
- Advanced filtering and search
- Export audit trails to PDF/CSV
- Notification system for new notes
- Rating/sentiment analysis
- Skill recommendation engine integration
