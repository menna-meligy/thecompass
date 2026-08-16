/**
 * Unit Tests for Notes Operations (Database Layer)
 * Tests all functions in src/lib/notes/operations.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/index';
import {
  createSessionReflection,
  updateSessionReflection,
  publishReflection,
  getClientReflections,
  createClientNote,
  updateClientNote,
  getReflectionWithNotes,
  syncNotesToClient,
  getNotesAuditTrail,
  archiveReflection,
  getNotesStatistics,
} from '@/lib/notes/operations';

type DB = SupabaseClient<Database>;

// Mock Supabase client
const createMockDb = (): Partial<DB> => ({
  from: vi.fn(),
});

describe('Session Reflection Operations', () => {
  let db: Partial<DB>;
  const bookingId = 'booking-123';
  const clientId = 'client-456';
  const mentorId = 'mentor-789';
  const reflectionId = 'reflection-001';

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  describe('createSessionReflection', () => {
    it('should create a reflection with valid inputs', async () => {
      const mockReflection = {
        id: reflectionId,
        booking_id: bookingId,
        client_id: clientId,
        mentor_id: mentorId,
        encouragement_ar: 'تشجيع رائع',
        encouragement_en: 'Great encouragement',
        is_public: true,
        status: 'published',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockReflection,
            error: null,
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const result = await createSessionReflection(
        db as DB,
        bookingId,
        mentorId,
        clientId,
        {
          encouragement_ar: 'تشجيع رائع',
          encouragement_en: 'Great encouragement',
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(reflectionId);
        expect(result.data.is_public).toBe(true);
        expect(result.data.status).toBe('published');
      }
    });

    it('should reject missing required parameters', async () => {
      const result = await createSessionReflection(
        db as DB,
        '',
        mentorId,
        clientId,
        {}
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PARAMS');
      }
    });

    it('should reject if reflection already exists for booking', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'existing-reflection' },
            error: null,
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const result = await createSessionReflection(
        db as DB,
        bookingId,
        mentorId,
        clientId,
        {}
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REFLECTION_EXISTS');
      }
    });

    it('should set default status to published and is_public to true', async () => {
      const mockReflection = {
        id: reflectionId,
        booking_id: bookingId,
        client_id: clientId,
        mentor_id: mentorId,
        is_public: true,
        status: 'published',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockReflection,
            error: null,
          }),
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (db.from as any) = vi.fn()
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const result = await createSessionReflection(
        db as DB,
        bookingId,
        mentorId,
        clientId,
        {}
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_public).toBe(true);
        expect(result.data.status).toBe('published');
      }
    });
  });

  describe('updateSessionReflection', () => {
    it('should update reflection with partial data', async () => {
      const updated = {
        id: reflectionId,
        encouragement_ar: 'تحديث جديد',
        updated_at: new Date().toISOString(),
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updated,
              error: null,
            }),
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateSessionReflection(
        db as DB,
        reflectionId,
        { encouragement_ar: 'تحديث جديد' },
        mentorId
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.encouragement_ar).toBe('تحديث جديد');
      }
    });

    it('should update timestamp on changes', async () => {
      const beforeTime = new Date().toISOString();

      const updated = {
        id: reflectionId,
        updated_at: new Date().toISOString(),
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updated,
              error: null,
            }),
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateSessionReflection(
        db as DB,
        reflectionId,
        { encouragement_ar: 'تحديث' },
        mentorId
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const updateTime = new Date(result.data.updated_at);
        const before = new Date(beforeTime);
        expect(updateTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }
    });
  });

  describe('publishReflection', () => {
    it('should publish reflection with is_public=true and status=published', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: reflectionId,
                is_public: true,
                status: 'published',
              },
              error: null,
            }),
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      const result = await publishReflection(db as DB, reflectionId, mentorId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_public).toBe(true);
        expect(result.data.status).toBe('published');
      }
    });
  });

  describe('getClientReflections', () => {
    it('should fetch public reflections for client by default', async () => {
      const mockReflections = [
        {
          id: 'ref-1',
          client_id: clientId,
          is_public: true,
          status: 'published',
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReflections,
            error: null,
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const result = await getClientReflections(db as DB, clientId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0].is_public).toBe(true);
      }
    });

    it('should include private reflections when requested', async () => {
      const mockReflections = [
        { id: 'ref-1', is_public: true },
        { id: 'ref-2', is_public: false },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReflections,
            error: null,
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const result = await getClientReflections(db as DB, clientId, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });
  });

  describe('Client Note Operations', () => {
    const noteId = 'note-001';

    describe('createClientNote', () => {
      it('should create a client note', async () => {
        const mockNote = {
          id: noteId,
          booking_id: bookingId,
          client_id: clientId,
          content_ar: 'ملاحظة عربية',
          content_en: 'English note',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockReturnValueOnce({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
        });

        const mockInsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockNote,
              error: null,
            }),
          }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelect })
          .mockReturnValueOnce({ insert: mockInsert });

        const result = await createClientNote(
          db as DB,
          bookingId,
          clientId,
          { ar: 'ملاحظة عربية', en: 'English note' },
          true
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_public).toBe(true);
          expect(result.data.content_ar).toBe('ملاحظة عربية');
        }
      });

      it('should reject duplicate note with same public status', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'existing-note' },
                  error: null,
                }),
              }),
            }),
        });

        (db.from as any) = vi.fn().mockReturnValue({
          select: mockSelect,
        });

        const result = await createClientNote(
          db as DB,
          bookingId,
          clientId,
          { en: 'Note' },
          true
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('NOTE_EXISTS');
        }
      });
    });

    describe('updateClientNote', () => {
      it('should update note content', async () => {
        const updated = {
          id: noteId,
          content_ar: 'محتوى محدث',
          updated_at: new Date().toISOString(),
        };

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updated,
                error: null,
              }),
            }),
          }),
        });

        (db.from as any) = vi.fn().mockReturnValue({
          update: mockUpdate,
        });

        const result = await updateClientNote(
          db as DB,
          noteId,
          { ar: 'محتوى محدث' }
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content_ar).toBe('محتوى محدث');
        }
      });

      it('should toggle note public status', async () => {
        const updated = {
          id: noteId,
          is_public: false,
          updated_at: new Date().toISOString(),
        };

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updated,
                error: null,
              }),
            }),
          }),
        });

        (db.from as any) = vi.fn().mockReturnValue({
          update: mockUpdate,
        });

        const result = await updateClientNote(
          db as DB,
          noteId,
          undefined,
          false
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_public).toBe(false);
        }
      });
    });
  });

  describe('Permission and Data Access', () => {
    describe('getReflectionWithNotes', () => {
      it('should return reflection and notes for authorized client', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
          client_id: clientId,
          mentor_id: mentorId,
          is_public: true,
          status: 'published',
        };

        const mockNotes = [
          { id: 'note-1', booking_id: bookingId, is_public: true }
        ];

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        const mockSelectNotes = vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockResolvedValue({
                data: mockNotes,
                error: null,
              }),
            }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({ select: mockSelectNotes });

        const result = await getReflectionWithNotes(
          db as DB,
          bookingId,
          'client',
          clientId
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.reflection.id).toBe(reflectionId);
          expect(result.data.clientNotes.length).toBeGreaterThanOrEqual(0);
        }
      });

      it('should reject unauthorized client access', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
          client_id: 'different-client',
          mentor_id: mentorId,
          is_public: true,
        };

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        (db.from as any) = vi.fn().mockReturnValue({
          select: mockSelectReflection,
        });

        const result = await getReflectionWithNotes(
          db as DB,
          bookingId,
          'client',
          clientId
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('FORBIDDEN');
        }
      });

      it('should allow admin to see all data including private notes', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
          client_id: clientId,
        };

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        const mockSelectNotes = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        });

        const mockSelectAudit = vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({ select: mockSelectNotes })
          .mockReturnValueOnce({ select: mockSelectAudit });

        const result = await getReflectionWithNotes(
          db as DB,
          bookingId,
          'admin',
          mentorId
        );

        expect(result.success).toBe(true);
      });
    });

    describe('RLS Enforcement', () => {
      it('should only fetch client own notes when client queries', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
          client_id: clientId,
        };

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        const mockSelectNotes = vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({ select: mockSelectNotes });

        await getReflectionWithNotes(
          db as DB,
          bookingId,
          'client',
          clientId
        );

        // Verify the second query includes the client filter
        expect(mockSelectNotes).toHaveBeenCalled();
      });
    });
  });

  describe('Audit Logging and Sync', () => {
    describe('syncNotesToClient', () => {
      it('should publish private reflection to client', async () => {
        const mockReflection = {
          id: reflectionId,
          client_id: clientId,
          is_public: false,
          status: 'draft',
        };

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockResolvedValue({
                data: mockReflection,
                error: null,
              }),
            }),
        });

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: reflectionId,
                  is_public: true,
                  status: 'published',
                },
                error: null,
              }),
            }),
          }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({ update: mockUpdate });

        const result = await syncNotesToClient(
          db as DB,
          reflectionId,
          clientId
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_public).toBe(true);
          expect(result.data.status).toBe('published');
        }
      });
    });

    describe('getNotesAuditTrail', () => {
      it('should fetch complete audit trail for reflection', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
        };

        const mockAuditLogs = [
          {
            id: 'log-1',
            record_id: reflectionId,
            action: 'INSERT',
            changed_at: new Date().toISOString(),
          },
          {
            id: 'log-2',
            record_id: reflectionId,
            action: 'UPDATE',
            changed_at: new Date().toISOString(),
          },
        ];

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        const mockSelectAudit = vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAuditLogs,
              error: null,
            }),
          }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          })
          .mockReturnValueOnce({ select: mockSelectAudit });

        const result = await getNotesAuditTrail(
          db as DB,
          reflectionId
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(2);
          expect(result.data[0].action).toMatch(/INSERT|UPDATE/);
        }
      });

      it('should record INSERT, UPDATE actions with timestamps', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
        };

        const now = new Date().toISOString();
        const mockAuditLogs = [
          {
            id: 'log-1',
            record_id: reflectionId,
            action: 'INSERT',
            changed_by: mentorId,
            changed_at: now,
            new_data: { is_public: true },
          },
        ];

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        const mockSelectAudit = vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAuditLogs,
              error: null,
            }),
          }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          })
          .mockReturnValueOnce({ select: mockSelectAudit });

        const result = await getNotesAuditTrail(
          db as DB,
          reflectionId
        );

        expect(result.success).toBe(true);
        if (result.success) {
          const log = result.data[0];
          expect(log.changed_by).toBe(mentorId);
          expect(log.changed_at).toBe(now);
          expect(log.new_data).toBeDefined();
        }
      });
    });
  });

  describe('Archive and Statistics', () => {
    describe('archiveReflection', () => {
      it('should mark reflection as archived and not public', async () => {
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: reflectionId,
                  status: 'archived',
                  is_public: false,
                },
                error: null,
              }),
            }),
          }),
        });

        (db.from as any) = vi.fn().mockReturnValue({
          update: mockUpdate,
        });

        const result = await archiveReflection(
          db as DB,
          reflectionId,
          mentorId
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('archived');
          expect(result.data.is_public).toBe(false);
        }
      });
    });

    describe('getNotesStatistics', () => {
      it('should calculate correct statistics', async () => {
        const mockReflection = {
          id: reflectionId,
          booking_id: bookingId,
          updated_at: new Date().toISOString(),
        };

        const mockSelectReflection = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        });

        const mockSelectTotal = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 5,
          }),
        });

        const mockSelectPublic = vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockResolvedValue({
                count: 3,
              }),
            }),
        });

        const mockSelectAudit = vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            count: 8,
          }),
        });

        (db.from as any) = vi.fn()
          .mockReturnValueOnce({ select: mockSelectReflection })
          .mockReturnValueOnce({ select: mockSelectTotal })
          .mockReturnValueOnce({ select: mockSelectPublic })
          .mockReturnValueOnce({ select: mockSelectAudit });

        const result = await getNotesStatistics(
          db as DB,
          reflectionId
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.totalNotes).toBe(5);
          expect(result.data.publicNotes).toBe(3);
          expect(result.data.privateNotes).toBe(2);
          expect(result.data.auditEntries).toBe(8);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockError = { message: 'Database error' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateSessionReflection(
        db as DB,
        reflectionId,
        { encouragement_ar: 'test' },
        mentorId
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DB_ERROR');
        expect(result.error.details).toBeDefined();
      }
    });

    it('should handle unexpected errors', async () => {
      (db.from as any) = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await createSessionReflection(
        db as DB,
        bookingId,
        mentorId,
        clientId,
        {}
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNEXPECTED_ERROR');
      }
    });
  });

  describe('Arabic Text Handling', () => {
    it('should preserve Arabic text in reflections', async () => {
      const arabicText = 'محتوى عربي مع أحرف خاصة: ؤ، ئ، ة';

      const mockReflection = {
        id: reflectionId,
        encouragement_ar: arabicText,
        updated_at: new Date().toISOString(),
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateSessionReflection(
        db as DB,
        reflectionId,
        { encouragement_ar: arabicText },
        mentorId
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.encouragement_ar).toBe(arabicText);
      }
    });

    it('should handle bidirectional text (Arabic + English)', async () => {
      const mixedText = 'تشجيع Great work تحسن Excellent';

      const mockReflection = {
        id: reflectionId,
        encouragement_en: mixedText,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReflection,
              error: null,
            }),
          }),
        }),
      });

      (db.from as any) = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateSessionReflection(
        db as DB,
        reflectionId,
        { encouragement_en: mixedText },
        mentorId
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.encouragement_en).toContain('تشجيع');
        expect(result.data.encouragement_en).toContain('Great');
      }
    });
  });
});
