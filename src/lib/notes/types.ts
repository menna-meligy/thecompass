/**
 * Notes System Type Definitions
 * Comprehensive type safety for bidirectional notes operations
 */

/**
 * Reflection status lifecycle
 */
export type ReflectionStatus = "draft" | "published" | "archived";

/**
 * Audit action types
 */
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

/**
 * Bilingual content
 */
export interface BilingualContent {
  ar?: string;
  en?: string;
}

/**
 * Session reflection created by mentor for client
 */
export interface SessionReflection {
  id: string;
  booking_id: string;
  client_id: string;
  mentor_id: string;
  created_by: string;
  encouragement_ar: string | null;
  encouragement_en: string | null;
  mentor_notes_ar: string | null;
  mentor_notes_en: string | null;
  private_notes: string | null;
  is_public: boolean;
  status: ReflectionStatus;
  submitted_at: string;
  updated_at: string;
}

/**
 * Client note for a specific session
 */
export interface ClientNote {
  id: string;
  booking_id: string;
  client_id: string;
  content_ar: string | null;
  content_en: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Skills assessed in a reflection
 */
export interface ReflectionSkill {
  id: string;
  reflection_id: string;
  skill_id: string;
  mentor_level: 1 | 2 | 3 | 4 | 5;
}

/**
 * Milestones attached to a reflection
 */
export interface ReflectionMilestone {
  reflection_id: string;
  milestone_id: string;
}

/**
 * Audit log entry tracking changes
 */
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

/**
 * Input for creating session reflection
 */
export interface CreateSessionReflectionInput {
  booking_id: string;
  mentor_id: string;
  client_id: string;
  encouragement_ar?: string;
  encouragement_en?: string;
  private_notes?: string;
  is_public?: boolean;
  status?: ReflectionStatus;
}

/**
 * Input for updating session reflection
 */
export interface UpdateSessionReflectionInput {
  encouragement_ar?: string;
  encouragement_en?: string;
  mentor_notes_ar?: string;
  mentor_notes_en?: string;
  private_notes?: string;
  is_public?: boolean;
  status?: ReflectionStatus;
}

/**
 * Input for creating client note
 */
export interface CreateClientNoteInput {
  booking_id: string;
  client_id: string;
  content_ar?: string;
  content_en?: string;
  is_public?: boolean;
}

/**
 * Input for updating client note
 */
export interface UpdateClientNoteInput {
  content_ar?: string;
  content_en?: string;
  is_public?: boolean;
}

/**
 * Result of reflection sync operation
 */
export interface SyncResult {
  synced: boolean;
  was_public: boolean;
  now_public: boolean;
  message: string;
}

/**
 * Statistics for notes associated with a reflection
 */
export interface NotesStatistics {
  reflection_id: string;
  total_client_notes: number;
  public_client_notes: number;
  private_client_notes: number;
  total_audit_entries: number;
  created_at: string;
  last_updated: string;
  last_modified_by: string | null;
}

/**
 * Combined view of reflection with all related data
 */
export interface ReflectionView {
  reflection: SessionReflection;
  mentor_info: {
    id: string;
    full_name: string | null;
    email: string;
  };
  client_info: {
    id: string;
    full_name: string | null;
    email: string;
  };
  skills: Array<ReflectionSkill & { skill_name_ar: string; skill_name_en: string }>;
  milestones: ReflectionMilestone[];
  client_notes: ClientNote[];
  recent_audit_entries: AuditLog[];
}

/**
 * Query parameters for fetching reflections
 */
export interface ReflectionQueryParams {
  client_id?: string;
  mentor_id?: string;
  status?: ReflectionStatus;
  is_public?: boolean;
  since?: string; // ISO timestamp
  limit?: number;
  offset?: number;
}

/**
 * Query parameters for fetching notes
 */
export interface ClientNoteQueryParams {
  booking_id?: string;
  client_id?: string;
  is_public?: boolean;
  since?: string; // ISO timestamp
  limit?: number;
  offset?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Permission levels for notes operations
 */
export type PermissionLevel = "none" | "read" | "write" | "admin";

/**
 * Context for permission checking
 */
export interface PermissionContext {
  user_id: string;
  user_role: "user" | "admin";
  resource_owner_id?: string;
  resource_type: "reflection" | "client_note";
  action: "read" | "write" | "delete" | "publish";
}

/**
 * Permission result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  level: PermissionLevel;
}

/**
 * Change event for real-time updates
 */
export interface NoteChangeEvent {
  type: "reflection_updated" | "note_created" | "note_updated" | "status_changed";
  entity_type: "reflection" | "note";
  entity_id: string;
  booking_id: string;
  changed_at: string;
  changed_by: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Summary of changes for audit reporting
 */
export interface ChangeSummary {
  table: string;
  record_id: string;
  action: AuditAction;
  field_count: number;
  changed_fields: string[];
  timestamp: string;
  changed_by: string | null;
}
