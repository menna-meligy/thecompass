import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/index";

type DB = SupabaseClient<Database>;

/**
 * Comprehensive error type for notes operations
 */
export interface NotesError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Result wrapper for operations
 */
export type Result<T> = { success: true; data: T } | { success: false; error: NotesError };

/**
 * Session reflection data with both Arabic and English
 */
export interface SessionReflectionData {
  id: string;
  booking_id: string;
  client_id: string;
  mentor_id: string;
  created_by?: string;
  encouragement_ar?: string;
  encouragement_en?: string;
  mentor_notes_ar?: string;
  mentor_notes_en?: string;
  private_notes?: string;
  is_public: boolean;
  status: "draft" | "published" | "archived";
  submitted_at: string;
  updated_at: string;
  skills?: Array<{ skill_id: string; mentor_level: number }>;
}

/**
 * Client note data with both Arabic and English
 */
export interface ClientNoteData {
  id: string;
  booking_id: string;
  client_id: string;
  content_ar?: string;
  content_en?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by?: string;
  changed_at: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}

/**
 * Combined reflection with associated notes
 */
export interface ReflectionWithNotes {
  reflection: SessionReflectionData;
  clientNotes: ClientNoteData[];
  auditTrail: AuditLogEntry[];
}

/**
 * Create a new session reflection
 * @param db - Supabase client
 * @param bookingId - Reference to booking
 * @param mentorId - Admin/mentor creating the reflection
 * @param clientId - Client receiving the reflection
 * @param data - Reflection content and metadata
 */
export async function createSessionReflection(
  db: DB,
  bookingId: string,
  mentorId: string,
  clientId: string,
  data: {
    encouragement_ar?: string;
    encouragement_en?: string;
    private_notes?: string;
    is_public?: boolean;
    status?: "draft" | "published";
  }
): Promise<Result<SessionReflectionData>> {
  try {
    // Validate prerequisites
    if (!bookingId || !mentorId || !clientId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing required booking, mentor, or client ID" },
      };
    }

    // Check if reflection already exists
    const { data: existingReflection } = await db
      .from("session_reflections")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingReflection) {
      return {
        success: false,
        error: { code: "REFLECTION_EXISTS", message: "Reflection already exists for this booking" },
      };
    }

    // Create the reflection
    const { data: reflection, error } = await db
      .from("session_reflections")
      .insert({
        booking_id: bookingId,
        client_id: clientId,
        mentor_id: mentorId,
        created_by: mentorId,
        encouragement_ar: data.encouragement_ar,
        encouragement_en: data.encouragement_en,
        private_notes: data.private_notes,
        is_public: data.is_public ?? true,
        status: data.status ?? "published",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to create reflection",
          details: error,
        },
      };
    }

    return {
      success: true,
      data: {
        ...reflection,
        submitted_at: reflection.submitted_at || new Date().toISOString(),
        updated_at: reflection.updated_at || new Date().toISOString(),
      } as SessionReflectionData,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error creating reflection",
        details: err,
      },
    };
  }
}

/**
 * Update an existing session reflection
 * @param db - Supabase client
 * @param reflectionId - ID of reflection to update
 * @param data - Fields to update
 * @param updatedBy - User making the update (for audit trail)
 */
export async function updateSessionReflection(
  db: DB,
  reflectionId: string,
  data: Partial<Omit<SessionReflectionData, "id" | "submitted_at">>,
  updatedBy: string
): Promise<Result<SessionReflectionData>> {
  try {
    if (!reflectionId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing reflection ID" },
      };
    }

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: reflection, error } = await db
      .from("session_reflections")
      .update(updateData)
      .eq("id", reflectionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to update reflection",
          details: error,
        },
      };
    }

    return {
      success: true,
      data: {
        ...reflection,
        submitted_at: reflection.submitted_at || new Date().toISOString(),
        updated_at: reflection.updated_at || new Date().toISOString(),
      } as SessionReflectionData,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error updating reflection",
        details: err,
      },
    };
  }
}

/**
 * Publish a reflection (mark as public and published)
 * @param db - Supabase client
 * @param reflectionId - ID of reflection to publish
 * @param publishedBy - User publishing the reflection
 */
export async function publishReflection(
  db: DB,
  reflectionId: string,
  publishedBy: string
): Promise<Result<SessionReflectionData>> {
  return updateSessionReflection(
    db,
    reflectionId,
    {
      is_public: true,
      status: "published",
    },
    publishedBy
  );
}

/**
 * Get all reflections visible to a client
 * @param db - Supabase client
 * @param clientId - Client's ID
 * @param includePrivate - Whether to include private reflections (admin only)
 */
export async function getClientReflections(
  db: DB,
  clientId: string,
  includePrivate?: boolean
): Promise<Result<Array<SessionReflectionData & { skills?: unknown[] }>>> {
  try {
    if (!clientId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing client ID" },
      };
    }

    let query = db
      .from("session_reflections")
      .select(
        `
        *,
        session_reflection_skills(skill_id, mentor_level)
      `
      )
      .eq("client_id", clientId);

    // Filter by publication status if not including private
    if (!includePrivate) {
      query = query.eq("is_public", true);
    }

    const { data: reflections, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to fetch reflections",
          details: error,
        },
      };
    }

    return {
      success: true,
      data: (reflections || []).map((r) => ({
        ...r,
        submitted_at: r.submitted_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
      })) as Array<SessionReflectionData & { skills?: unknown[] }>,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error fetching reflections",
        details: err,
      },
    };
  }
}

/**
 * Create a client note
 * @param db - Supabase client
 * @param bookingId - Reference to booking
 * @param clientId - Client creating the note
 * @param content - Note content (can be Arabic and/or English)
 * @param isPublic - Whether note is visible to mentor
 */
export async function createClientNote(
  db: DB,
  bookingId: string,
  clientId: string,
  content: { ar?: string; en?: string },
  isPublic?: boolean
): Promise<Result<ClientNoteData>> {
  try {
    if (!bookingId || !clientId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing booking or client ID" },
      };
    }

    // Check if a note with same public status already exists
    const { data: existingNote } = await db
      .from("client_notes")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("is_public", isPublic ?? false)
      .maybeSingle();

    if (existingNote) {
      return {
        success: false,
        error: {
          code: "NOTE_EXISTS",
          message: `A ${isPublic ? "public" : "private"} note already exists for this booking`,
        },
      };
    }

    const now = new Date().toISOString();
    const { data: note, error } = await db
      .from("client_notes")
      .insert({
        booking_id: bookingId,
        client_id: clientId,
        content_ar: content.ar,
        content_en: content.en,
        is_public: isPublic ?? false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to create note",
          details: error,
        },
      };
    }

    return {
      success: true,
      data: {
        ...note,
        created_at: note.created_at || now,
        updated_at: note.updated_at || now,
      } as ClientNoteData,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error creating note",
        details: err,
      },
    };
  }
}

/**
 * Update a client note
 * @param db - Supabase client
 * @param noteId - ID of note to update
 * @param content - Updated content
 * @param isPublic - Toggle public status
 */
export async function updateClientNote(
  db: DB,
  noteId: string,
  content?: { ar?: string; en?: string },
  isPublic?: boolean
): Promise<Result<ClientNoteData>> {
  try {
    if (!noteId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing note ID" },
      };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (content) {
      if (content.ar !== undefined) updateData.content_ar = content.ar;
      if (content.en !== undefined) updateData.content_en = content.en;
    }

    if (isPublic !== undefined) {
      updateData.is_public = isPublic;
    }

    const { data: note, error } = await db
      .from("client_notes")
      .update(updateData)
      .eq("id", noteId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to update note",
          details: error,
        },
      };
    }

    return {
      success: true,
      data: {
        ...note,
        created_at: note.created_at || new Date().toISOString(),
        updated_at: note.updated_at || new Date().toISOString(),
      } as ClientNoteData,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error updating note",
        details: err,
      },
    };
  }
}

/**
 * Get reflection with associated client notes and audit trail
 * @param db - Supabase client
 * @param bookingId - Booking to fetch
 * @param viewerRole - Role of viewer ('client' or 'admin')
 * @param viewerUserId - ID of viewing user
 */
export async function getReflectionWithNotes(
  db: DB,
  bookingId: string,
  viewerRole: "client" | "admin",
  viewerUserId: string
): Promise<Result<ReflectionWithNotes>> {
  try {
    if (!bookingId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing booking ID" },
      };
    }

    // Fetch reflection
    const { data: reflection, error: reflectionError } = await db
      .from("session_reflections")
      .select(
        `
        *,
        session_reflection_skills(skill_id, mentor_level)
      `
      )
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (reflectionError) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to fetch reflection",
          details: reflectionError,
        },
      };
    }

    if (!reflection) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Reflection not found" },
      };
    }

    // Check permissions
    const isClient = viewerRole === "client";
    const isOwner = isClient && reflection.client_id === viewerUserId;
    const isAdmin = viewerRole === "admin";

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "You don't have access to this reflection" },
      };
    }

    // Fetch client notes (only public if viewer is client, all if admin)
    let notesQuery = db
      .from("client_notes")
      .select("*")
      .eq("booking_id", bookingId);

    if (isClient) {
      notesQuery = notesQuery.eq("client_id", viewerUserId);
    }

    const { data: clientNotes = [], error: notesError } = await notesQuery;

    if (notesError) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to fetch notes",
          details: notesError,
        },
      };
    }

    // Fetch audit trail (only for admin)
    let auditTrail: AuditLogEntry[] = [];
    if (isAdmin) {
      const { data: logs = [], error: auditError } = await db
        .from("notes_audit_log")
        .select("*")
        .in("record_id", [reflection.id, ...clientNotes.map((n) => n.id)])
        .order("changed_at", { ascending: false });

      if (!auditError) {
        auditTrail = logs as AuditLogEntry[];
      }
    }

    return {
      success: true,
      data: {
        reflection: {
          ...reflection,
          submitted_at: reflection.submitted_at || new Date().toISOString(),
          updated_at: reflection.updated_at || new Date().toISOString(),
        } as SessionReflectionData,
        clientNotes: (clientNotes || []).map((n) => ({
          ...n,
          created_at: n.created_at || new Date().toISOString(),
          updated_at: n.updated_at || new Date().toISOString(),
        })) as ClientNoteData[],
        auditTrail,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error fetching reflection with notes",
        details: err,
      },
    };
  }
}

/**
 * Ensure client can see a reflection (makes it public if needed)
 * @param db - Supabase client
 * @param reflectionId - Reflection to sync
 * @param clientId - Client who should see it
 */
export async function syncNotesToClient(
  db: DB,
  reflectionId: string,
  clientId: string
): Promise<Result<SessionReflectionData>> {
  try {
    if (!reflectionId || !clientId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing reflection or client ID" },
      };
    }

    // Fetch the reflection
    const { data: reflection, error: fetchError } = await db
      .from("session_reflections")
      .select("*")
      .eq("id", reflectionId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (fetchError) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to fetch reflection",
          details: fetchError,
        },
      };
    }

    if (!reflection) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Reflection not found for this client" },
      };
    }

    // If not public, make it public
    if (!reflection.is_public || reflection.status !== "published") {
      const { data: updated, error: updateError } = await db
        .from("session_reflections")
        .update({
          is_public: true,
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reflectionId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: {
            code: "DB_ERROR",
            message: "Failed to sync reflection",
            details: updateError,
          },
        };
      }

      return {
        success: true,
        data: {
          ...updated,
          submitted_at: updated.submitted_at || new Date().toISOString(),
          updated_at: updated.updated_at || new Date().toISOString(),
        } as SessionReflectionData,
      };
    }

    return {
      success: true,
      data: {
        ...reflection,
        submitted_at: reflection.submitted_at || new Date().toISOString(),
        updated_at: reflection.updated_at || new Date().toISOString(),
      } as SessionReflectionData,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error syncing notes",
        details: err,
      },
    };
  }
}

/**
 * Get audit trail for a reflection and its notes
 * @param db - Supabase client
 * @param reflectionId - Reflection to audit
 */
export async function getNotesAuditTrail(
  db: DB,
  reflectionId: string
): Promise<Result<AuditLogEntry[]>> {
  try {
    if (!reflectionId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing reflection ID" },
      };
    }

    // Get reflection and its notes
    const { data: reflection, error: refError } = await db
      .from("session_reflections")
      .select("id, booking_id")
      .eq("id", reflectionId)
      .maybeSingle();

    if (refError) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to fetch reflection",
          details: refError,
        },
      };
    }

    if (!reflection) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Reflection not found" },
      };
    }

    const { data: notes = [] } = await db
      .from("client_notes")
      .select("id")
      .eq("booking_id", reflection.booking_id);

    const recordIds = [reflectionId, ...notes.map((n) => n.id)];

    // Fetch all audit entries for these records
    const { data: auditLogs = [], error: auditError } = await db
      .from("notes_audit_log")
      .select("*")
      .in("record_id", recordIds)
      .order("changed_at", { ascending: false });

    if (auditError) {
      return {
        success: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to fetch audit trail",
          details: auditError,
        },
      };
    }

    return {
      success: true,
      data: auditLogs as AuditLogEntry[],
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error fetching audit trail",
        details: err,
      },
    };
  }
}

/**
 * Archive a reflection (soft delete)
 * @param db - Supabase client
 * @param reflectionId - Reflection to archive
 * @param archivedBy - User archiving the reflection
 */
export async function archiveReflection(
  db: DB,
  reflectionId: string,
  archivedBy: string
): Promise<Result<SessionReflectionData>> {
  return updateSessionReflection(
    db,
    reflectionId,
    {
      status: "archived",
      is_public: false,
    },
    archivedBy
  );
}

/**
 * Get statistics about notes for a reflection
 * @param db - Supabase client
 * @param reflectionId - Reflection to analyze
 */
export async function getNotesStatistics(
  db: DB,
  reflectionId: string
): Promise<
  Result<{
    totalNotes: number;
    publicNotes: number;
    privateNotes: number;
    auditEntries: number;
    lastUpdated: string;
  }>
> {
  try {
    if (!reflectionId) {
      return {
        success: false,
        error: { code: "INVALID_PARAMS", message: "Missing reflection ID" },
      };
    }

    // Get reflection's booking_id
    const { data: reflection } = await db
      .from("session_reflections")
      .select("booking_id, updated_at")
      .eq("id", reflectionId)
      .maybeSingle();

    if (!reflection) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Reflection not found" },
      };
    }

    // Count all notes
    const { count: totalCount } = await db
      .from("client_notes")
      .select("*", { count: "exact", head: true })
      .eq("booking_id", reflection.booking_id);

    // Count public notes
    const { count: publicCount } = await db
      .from("client_notes")
      .select("*", { count: "exact", head: true })
      .eq("booking_id", reflection.booking_id)
      .eq("is_public", true);

    // Count audit entries
    const { count: auditCount } = await db
      .from("notes_audit_log")
      .select("*", { count: "exact", head: true })
      .in("record_id", [reflectionId]);

    return {
      success: true,
      data: {
        totalNotes: totalCount || 0,
        publicNotes: publicCount || 0,
        privateNotes: (totalCount || 0) - (publicCount || 0),
        auditEntries: auditCount || 0,
        lastUpdated: reflection.updated_at || new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Unexpected error computing statistics",
        details: err,
      },
    };
  }
}
