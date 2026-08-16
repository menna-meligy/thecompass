# Phase 4: API Routes Implementation Guide

This document provides example implementations for the API routes needed by the Phase 4 UI components.

## Reflections API Routes

### GET `/api/reflections/{bookingId}`

Fetch a mentor's reflection for a specific booking (viewed by client).

```typescript
// app/api/reflections/[bookingId]/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { getReflectionWithNotes } from '@/lib/notes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const db = await createServerClient();
    const userId = req.headers.get('x-user-id'); // From auth middleware
    const userRole = req.headers.get('x-user-role');

    const result = await getReflectionWithNotes(
      db,
      params.bookingId,
      userRole,
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.code === 'NOT_FOUND' ? 404 : 400 }
      );
    }

    return NextResponse.json(result.data.reflection);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### POST `/api/reflections`

Create a new session reflection.

```typescript
// app/api/reflections/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { createSessionReflection } from '@/lib/notes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const db = await createServerClient();
    const userId = req.headers.get('x-user-id'); // Mentor ID
    const userRole = req.headers.get('x-user-role');

    if (userRole !== 'admin' && userRole !== 'mentor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const {
      booking_id,
      client_id,
      encouragement_ar,
      encouragement_en,
      mentor_notes_ar,
      mentor_notes_en,
      status = 'published',
      skill_ratings = {},
      completed_milestones = [],
    } = await req.json();

    // Validate inputs
    if (!booking_id || !client_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createSessionReflection(
      db,
      booking_id,
      userId, // mentor_id
      client_id,
      {
        encouragement_ar,
        encouragement_en,
        mentor_notes_ar,
        mentor_notes_en,
        status,
        is_public: status === 'published',
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    // Store skill ratings and milestones in separate tables
    if (Object.keys(skill_ratings).length > 0) {
      await db
        .from('reflection_skill_ratings')
        .upsert(
          Object.entries(skill_ratings).map(([skillId, level]) => ({
            reflection_id: result.data.id,
            skill_id: skillId,
            level,
          }))
        );
    }

    if (completed_milestones.length > 0) {
      await db
        .from('reflection_milestone_completions')
        .upsert(
          completed_milestones.map((milestoneId) => ({
            reflection_id: result.data.id,
            milestone_id: milestoneId,
            completed_at: new Date().toISOString(),
          }))
        );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error creating reflection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### PATCH `/api/reflections/{reflectionId}`

Update an existing reflection.

```typescript
// app/api/reflections/[reflectionId]/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { updateSessionReflection } from '@/lib/notes';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { reflectionId: string } }
) {
  try {
    const db = await createServerClient();
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (userRole !== 'admin' && userRole !== 'mentor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const {
      encouragement_ar,
      encouragement_en,
      mentor_notes_ar,
      mentor_notes_en,
      status,
      skill_ratings = {},
      completed_milestones = [],
    } = await req.json();

    const result = await updateSessionReflection(
      db,
      params.reflectionId,
      userId,
      {
        encouragement_ar,
        encouragement_en,
        mentor_notes_ar,
        mentor_notes_en,
        status,
        is_public: status === 'published',
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    // Update skill ratings
    if (Object.keys(skill_ratings).length > 0) {
      // Delete old ratings
      await db
        .from('reflection_skill_ratings')
        .delete()
        .eq('reflection_id', params.reflectionId);

      // Insert new ratings
      await db
        .from('reflection_skill_ratings')
        .insert(
          Object.entries(skill_ratings).map(([skillId, level]) => ({
            reflection_id: params.reflectionId,
            skill_id: skillId,
            level,
          }))
        );
    }

    // Update milestones
    if (completed_milestones.length > 0) {
      await db
        .from('reflection_milestone_completions')
        .delete()
        .eq('reflection_id', params.reflectionId);

      await db
        .from('reflection_milestone_completions')
        .insert(
          completed_milestones.map((milestoneId) => ({
            reflection_id: params.reflectionId,
            milestone_id: milestoneId,
            completed_at: new Date().toISOString(),
          }))
        );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error updating reflection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Client Notes API Routes

### GET `/api/client-notes/{bookingId}`

Fetch client notes for a booking (permission-based).

```typescript
// app/api/client-notes/[bookingId]/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const db = await createServerClient();
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    const clientId = req.nextUrl.searchParams.get('client_id');

    // Permission check
    if (userRole !== 'admin' && userId !== clientId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { data, error } = await db
      .from('client_notes')
      .select('*')
      .eq('booking_id', params.bookingId)
      .eq('client_id', clientId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching client notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### POST `/api/client-notes`

Create or update client notes (public or private).

```typescript
// app/api/client-notes/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { createClientNote, updateClientNote } from '@/lib/notes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const db = await createServerClient();
    const userId = req.headers.get('x-user-id'); // Should match client_id

    const {
      booking_id,
      client_id,
      content_ar,
      content_en,
      is_public,
    } = await req.json();

    // Permission check
    if (userId !== client_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if note with this public status already exists
    const { data: existing } = await db
      .from('client_notes')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('client_id', client_id)
      .eq('is_public', is_public)
      .single();

    let result;

    if (existing) {
      // Update existing
      const { data, error } = await db
        .from('client_notes')
        .update({
          content_ar,
          content_en,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await db
        .from('client_notes')
        .insert({
          id: crypto.randomUUID(),
          booking_id,
          client_id,
          content_ar,
          content_en,
          is_public,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result, {
      status: existing ? 200 : 201,
    });
  } catch (error) {
    console.error('Error saving client note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Authentication Middleware

Add this middleware to extract user context from requests:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ request });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  // Add user info to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.user.id);
  requestHeaders.set('x-user-role', profile?.role || 'user');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## Database Schema Extensions

If you need additional tables for skill ratings and milestones:

```sql
-- Reflection skill ratings
CREATE TABLE reflection_skill_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id UUID NOT NULL REFERENCES session_reflections(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id),
  level INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reflection_id, skill_id)
);

-- Reflection milestone completions
CREATE TABLE reflection_milestone_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id UUID NOT NULL REFERENCES session_reflections(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES roadmap_milestones(id),
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reflection_id, milestone_id)
);

-- Indexes for performance
CREATE INDEX idx_reflection_skill_ratings_reflection
  ON reflection_skill_ratings(reflection_id);

CREATE INDEX idx_reflection_milestone_completions_reflection
  ON reflection_milestone_completions(reflection_id);
```

---

## Testing the Routes

### Create a reflection
```bash
curl -X POST http://localhost:3000/api/reflections \
  -H "Content-Type: application/json" \
  -H "x-user-id: mentor-uuid" \
  -H "x-user-role: mentor" \
  -d '{
    "booking_id": "booking-uuid",
    "client_id": "client-uuid",
    "encouragement_ar": "أداء رائع في الجلسة",
    "encouragement_en": "Great performance in the session",
    "mentor_notes_ar": "يحتاج تحسين في التواصل",
    "mentor_notes_en": "Needs improvement in communication",
    "status": "published",
    "skill_ratings": {"skill-1": 4, "skill-2": 3},
    "completed_milestones": ["milestone-1"]
  }'
```

### Fetch a reflection
```bash
curl http://localhost:3000/api/reflections/booking-uuid \
  -H "x-user-id: client-uuid" \
  -H "x-user-role: seeker"
```

### Create client notes
```bash
curl -X POST http://localhost:3000/api/client-notes \
  -H "Content-Type: application/json" \
  -H "x-user-id: client-uuid" \
  -d '{
    "booking_id": "booking-uuid",
    "client_id": "client-uuid",
    "content_ar": "شكراً على الملاحظات البناءة",
    "content_en": "Thanks for the constructive feedback",
    "is_public": true
  }'
```

---

## Error Responses

All routes return consistent error responses:

```typescript
// 400 Bad Request - Validation error
{
  "error": "Missing required fields",
  "code": "INVALID_PARAMS"
}

// 403 Forbidden - Permission denied
{
  "error": "Unauthorized",
  "code": "FORBIDDEN"
}

// 404 Not Found - Resource not found
{
  "error": "Reflection not found",
  "code": "NOT_FOUND"
}

// 409 Conflict - Duplicate entry
{
  "error": "Reflection already exists for this booking",
  "code": "REFLECTION_EXISTS"
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "code": "UNEXPECTED_ERROR"
}
```

---

## Implementation Checklist

- [ ] Create `/api/reflections/[bookingId]/route.ts` (GET)
- [ ] Create `/api/reflections/route.ts` (POST)
- [ ] Create `/api/reflections/[reflectionId]/route.ts` (PATCH)
- [ ] Create `/api/client-notes/[bookingId]/route.ts` (GET)
- [ ] Create `/api/client-notes/route.ts` (POST)
- [ ] Add authentication middleware
- [ ] Create database schema extensions
- [ ] Test all endpoints with curl/Postman
- [ ] Connect UI components to actual APIs
- [ ] Deploy to staging
- [ ] Test end-to-end flow

---

**Status:** ✅ API Route Examples Complete
**Ready for:** Implementation in your Next.js API
