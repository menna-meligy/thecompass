/**
 * Notes System - Public API
 * Bidirectional notes and audit logging for session reflections
 */

// Operations - core CRUD functions
export {
  createSessionReflection,
  updateSessionReflection,
  publishReflection,
  archiveReflection,
  getClientReflections,
  createClientNote,
  updateClientNote,
  getReflectionWithNotes,
  syncNotesToClient,
  getNotesAuditTrail,
  getNotesStatistics,
} from "./operations";

// Types
export type {
  SessionReflectionData,
  ClientNoteData,
  AuditLogEntry,
  ReflectionWithNotes,
  NotesError,
  Result,
} from "./operations";

export type {
  ReflectionStatus,
  AuditAction,
  BilingualContent,
  SessionReflection,
  ClientNote,
  ReflectionSkill,
  ReflectionMilestone,
  AuditLog,
  CreateSessionReflectionInput,
  UpdateSessionReflectionInput,
  CreateClientNoteInput,
  UpdateClientNoteInput,
  SyncResult,
  NotesStatistics,
  ReflectionView,
  ReflectionQueryParams,
  ClientNoteQueryParams,
  PaginationMeta,
  PaginatedResult,
  PermissionLevel,
  PermissionContext,
  PermissionResult,
  NoteChangeEvent,
  ChangeSummary,
} from "./types";
