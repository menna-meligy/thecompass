/**
 * Practical Examples - Bidirectional Notes System
 * Copy-paste ready code snippets for common workflows
 */

import { createClient } from "@/lib/supabase/server";
import {
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
import type { SessionReflectionData, ClientNoteData, Result } from "./operations";

/**
 * WORKFLOW 1: Mentor Creates and Publishes a Session Reflection
 * ─────────────────────────────────────────────────────────────
 */
export async function workflowMentorCreatesReflection(
  bookingId: string,
  mentorId: string,
  clientId: string
) {
  const db = await createClient();

  // Step 1: Create reflection (initially as draft)
  const createResult = await createSessionReflection(db, bookingId, mentorId, clientId, {
    encouragement_ar: `شكراً على مشاركتك الفعالة في الجلسة. لاحظت تقدماً واضحاً في
      قدرتك على تحليل المشكلة من عدة زوايا. استمر في هذا النمط!`,
    encouragement_en:
      "Thank you for your active participation. I noticed clear progress in your analytical thinking. Keep this up!",
    private_notes:
      "Client showed interest in career pivot discussion. Recommend referencing workshop ID xyz for next session.",
    is_public: false,
    status: "draft",
  });

  if (!createResult.success) {
    console.error("Failed to create reflection:", createResult.error);
    return;
  }

  const reflection = createResult.data;
  console.log("✓ Reflection created as draft:", reflection.id);

  // Step 2: Mentor adds private notes
  const updateResult = await updateSessionReflection(
    db,
    reflection.id,
    {
      mentor_notes_ar: "التقدم الملحوظ في مهارات الاستماع الفعّال",
      mentor_notes_en: "Notable improvement in active listening skills",
    },
    mentorId
  );

  if (!updateResult.success) {
    console.error("Failed to update reflection:", updateResult.error);
    return;
  }

  console.log("✓ Private notes added");

  // Step 3: Publish (make visible to client)
  const publishResult = await publishReflection(db, reflection.id, mentorId);

  if (!publishResult.success) {
    console.error("Failed to publish:", publishResult.error);
    return;
  }

  console.log("✓ Reflection published and now visible to client");

  return reflection.id;
}

/**
 * WORKFLOW 2: Client Views Reflection and Responds with Notes
 * ───────────────────────────────────────────────────────────
 */
export async function workflowClientViewsAndResponds(
  reflectionId: string,
  bookingId: string,
  clientId: string
) {
  const db = await createClient();

  // Step 1: Client fetches their reflections
  const reflectionsResult = await getClientReflections(db, clientId);

  if (!reflectionsResult.success) {
    console.error("Failed to fetch reflections:", reflectionsResult.error);
    return;
  }

  const reflection = reflectionsResult.data.find((r) => r.id === reflectionId);
  if (!reflection) {
    console.error("Reflection not found");
    return;
  }

  console.log("✓ Client viewing reflection:");
  console.log("  Encouragement (AR):", reflection.encouragement_ar);
  console.log("  Encouragement (EN):", reflection.encouragement_en);

  // Step 2: Client creates public note (response visible to mentor)
  const publicNoteResult = await createClientNote(
    db,
    bookingId,
    clientId,
    {
      ar: "شكراً على الملاحظات. سأركز على تطوير مهارات الاستماع أكثر في المستقبل.",
      en: "Thank you for the feedback. I will focus on developing listening skills further.",
    },
    true // is_public
  );

  if (!publicNoteResult.success) {
    console.error("Failed to create public note:", publicNoteResult.error);
    return;
  }

  console.log("✓ Public note created (mentor can see this)");

  // Step 3: Client creates private note (for self-reflection)
  const privateNoteResult = await createClientNote(
    db,
    bookingId,
    clientId,
    {
      ar: "أشعر أن احتياجاتي لم تُفهم بشكل كامل. أريد متابعة هذا الموضوع.",
      en: "I feel my needs weren't fully understood. I want to follow up on this topic.",
    },
    false // is_public
  );

  if (!privateNoteResult.success) {
    console.error("Failed to create private note:", privateNoteResult.error);
    return;
  }

  console.log("✓ Private note created (only visible to you)");

  return {
    publicNote: publicNoteResult.data,
    privateNote: privateNoteResult.data,
  };
}

/**
 * WORKFLOW 3: Admin Reviews Complete Session Record
 * ──────────────────────────────────────────────────
 */
export async function workflowAdminReviewsSession(bookingId: string, adminId: string) {
  const db = await createClient();

  // Step 1: Get complete reflection with notes
  const viewResult = await getReflectionWithNotes(db, bookingId, "admin", adminId);

  if (!viewResult.success) {
    console.error("Failed to fetch reflection:", viewResult.error);
    return;
  }

  const { reflection, clientNotes, auditTrail } = viewResult.data;

  console.log("═══════════════════════════════════════════");
  console.log("SESSION REFLECTION REVIEW");
  console.log("═══════════════════════════════════════════\n");

  // Step 2: Display reflection
  console.log("REFLECTION:");
  console.log(`Status: ${reflection.status} (${reflection.is_public ? "Public" : "Private"})`);
  console.log(`Created: ${reflection.submitted_at}`);
  console.log(`Last Updated: ${reflection.updated_at}`);
  console.log("\nEncouragement (AR):", reflection.encouragement_ar);
  console.log("Encouragement (EN):", reflection.encouragement_en);
  console.log("\nMentor Notes (AR):", reflection.mentor_notes_ar);
  console.log("Mentor Notes (EN):", reflection.mentor_notes_en);

  // Step 3: Display client notes
  console.log("\n───────────────────────────────────────────");
  console.log("CLIENT NOTES:");
  clientNotes.forEach((note, idx) => {
    console.log(`\nNote ${idx + 1} (${note.is_public ? "Public" : "Private"}):`);
    console.log(`  AR: ${note.content_ar}`);
    console.log(`  EN: ${note.content_en}`);
    console.log(`  Created: ${note.created_at}`);
  });

  // Step 4: Display audit trail
  console.log("\n───────────────────────────────────────────");
  console.log("AUDIT TRAIL:");
  auditTrail.slice(0, 5).forEach((entry) => {
    console.log(`\n${entry.action} - ${entry.changed_at}`);
    console.log(`  By: ${entry.changed_by}`);
    if (entry.old_data) console.log(`  Before:`, entry.old_data);
    if (entry.new_data) console.log(`  After:`, entry.new_data);
  });

  // Step 5: Get statistics
  const statsResult = await getNotesStatistics(db, reflection.id);
  if (statsResult.success) {
    console.log("\n───────────────────────────────────────────");
    console.log("STATISTICS:");
    console.log(`Total notes: ${statsResult.data.totalNotes}`);
    console.log(
      `  Public: ${statsResult.data.publicNotes}, Private: ${statsResult.data.privateNotes}`
    );
    console.log(`Audit entries: ${statsResult.data.auditEntries}`);
  }

  return {
    reflection,
    clientNotes,
    auditTrail,
  };
}

/**
 * WORKFLOW 4: Bulk Reflection Creation for Group Session
 * ────────────────────────────────────────────────────────
 */
export async function workflowBulkCreateReflections(
  bookingIds: string[],
  mentorId: string,
  clientIds: string[],
  encouragement: { ar: string; en: string }
) {
  const db = await createClient();

  const results: Array<{
    bookingId: string;
    success: boolean;
    reflectionId?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < bookingIds.length; i++) {
    const bookingId = bookingIds[i];
    const clientId = clientIds[i];

    const result = await createSessionReflection(db, bookingId, mentorId, clientId, {
      encouragement_ar: encouragement.ar,
      encouragement_en: encouragement.en,
      is_public: false, // Start as draft
      status: "draft",
    });

    if (result.success) {
      results.push({
        bookingId,
        success: true,
        reflectionId: result.data.id,
      });
      console.log(`✓ Reflection created for booking ${bookingId}`);
    } else {
      results.push({
        bookingId,
        success: false,
        error: result.error.message,
      });
      console.error(`✗ Failed for booking ${bookingId}: ${result.error.message}`);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\nSummary: ${successCount}/${bookingIds.length} reflections created`);

  return results;
}

/**
 * WORKFLOW 5: Client Updates Their Notes
 * ────────────────────────────────────────
 */
export async function workflowClientUpdatesNotes(
  noteId: string,
  clientId: string,
  updatedContent: { ar?: string; en?: string }
) {
  const db = await createClient();

  const result = await updateClientNote(db, noteId, updatedContent);

  if (result.success) {
    console.log("✓ Note updated successfully");
    console.log(`  Updated at: ${result.data.updated_at}`);
    return result.data;
  } else {
    console.error("✗ Failed to update note:", result.error.message);
    return null;
  }
}

/**
 * WORKFLOW 6: Archive Old Reflections
 * ──────────────────────────────────────
 */
export async function workflowArchiveReflections(
  reflectionIds: string[],
  adminId: string
) {
  const db = await createClient();

  const results = await Promise.all(
    reflectionIds.map((id) => archiveReflection(db, id, adminId))
  );

  const successCount = results.filter((r) => r.success).length;
  console.log(`✓ Archived ${successCount}/${reflectionIds.length} reflections`);

  return results;
}

/**
 * WORKFLOW 7: Generate Audit Report
 * ──────────────────────────────────
 */
export async function workflowGenerateAuditReport(
  reflectionId: string,
  adminId: string
) {
  const db = await createClient();

  const auditResult = await getNotesAuditTrail(db, reflectionId);

  if (!auditResult.success) {
    console.error("Failed to fetch audit trail:", auditResult.error);
    return null;
  }

  const entries = auditResult.data;

  // Group by action
  const grouped = {
    INSERT: entries.filter((e) => e.action === "INSERT"),
    UPDATE: entries.filter((e) => e.action === "UPDATE"),
    DELETE: entries.filter((e) => e.action === "DELETE"),
  };

  console.log("AUDIT REPORT");
  console.log("═════════════════════════════════════════");
  console.log(`Total changes: ${entries.length}\n`);

  console.log(`Inserts: ${grouped.INSERT.length}`);
  console.log(`Updates: ${grouped.UPDATE.length}`);
  console.log(`Deletes: ${grouped.DELETE.length}\n`);

  // Show recent changes
  console.log("Recent Changes:");
  entries.slice(0, 10).forEach((entry) => {
    const date = new Date(entry.changed_at).toLocaleString();
    console.log(`  ${date} - ${entry.action} by ${entry.changed_by}`);
  });

  return {
    total: entries.length,
    grouped,
    entries,
  };
}

/**
 * WORKFLOW 8: Sync Reflection to Client
 * ──────────────────────────────────────
 */
export async function workflowSyncReflectionToClient(
  reflectionId: string,
  clientId: string,
  adminId: string
) {
  const db = await createClient();

  const syncResult = await syncNotesToClient(db, reflectionId, clientId);

  if (syncResult.success) {
    console.log("✓ Reflection synced to client");
    console.log(`  Now public: ${syncResult.data.is_public}`);
    console.log(`  Status: ${syncResult.data.status}`);
    return syncResult.data;
  } else {
    console.error("✗ Failed to sync:", syncResult.error.message);
    return null;
  }
}

/**
 * ERROR HANDLING TEMPLATE
 * ─────────────────────────
 */
export async function templateErrorHandling(bookingId: string) {
  const db = await createClient();

  const result = await getReflectionWithNotes(db, bookingId, "client", "user-123");

  if (!result.success) {
    // Handle specific error codes
    switch (result.error.code) {
      case "NOT_FOUND":
        console.error("No reflection found for this booking");
        break;
      case "FORBIDDEN":
        console.error("You don't have access to this reflection");
        break;
      case "DB_ERROR":
        console.error("Database error:", result.error.details);
        break;
      case "INVALID_PARAMS":
        console.error("Invalid parameters:", result.error.message);
        break;
      default:
        console.error("Unknown error:", result.error);
    }
    return;
  }

  // Safely access result data
  const { reflection, clientNotes, auditTrail } = result.data;
  console.log("Success:", reflection);
}

/**
 * TYPE SAFETY TEMPLATE
 * ─────────────────────
 */
export async function templateTypeScriptUsage(bookingId: string) {
  const db = await createClient();

  // Typed result handling
  const result: Result<SessionReflectionData> = await getReflectionWithNotes(
    db,
    bookingId,
    "admin",
    "admin-123"
  );

  if (result.success) {
    // TypeScript knows this is SessionReflectionData
    const reflection = result.data.reflection;
    console.log(reflection.encouragement_ar); // Type-safe access
  }
}

/**
 * BILINGUAL TEMPLATE
 * ──────────────────
 */
export function templateBilingualDisplay(reflection: SessionReflectionData) {
  // Safe fallback pattern
  const encouragement = {
    ar: reflection.encouragement_ar ?? reflection.encouragement_en ?? "No message",
    en: reflection.encouragement_en ?? reflection.encouragement_ar ?? "No message",
  };

  console.log("Arabic:", encouragement.ar);
  console.log("English:", encouragement.en);

  // Display user's preferred language
  const userLanguage = "ar" as const;
  const displayText =
    encouragement[userLanguage] || encouragement[userLanguage === "ar" ? "en" : "ar"];
  console.log("Displayed:", displayText);
}
