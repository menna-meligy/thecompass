import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateClientNote } from "@/lib/notes/operations";
import { logError } from "@/lib/observability/logger";

interface UpdateNoteBody {
  content_ar?: string;
  content_en?: string;
  is_public?: boolean;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const noteId = params.id;

    // Parse and validate body
    const body = await req.json() as UpdateNoteBody;
    const { content_ar, content_en, is_public } = body;

    // Build content object (only include fields that are provided)
    const content: { ar?: string; en?: string } = {};
    if (content_ar !== undefined) content.ar = content_ar;
    if (content_en !== undefined) content.en = content_en;

    if (Object.keys(content).length > 0) {
      if ((content.ar ?? "").trim().length === 0 || (content.en ?? "").trim().length === 0) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
    }

    // Verify note exists and belongs to client
    const { data: note, error: fetchError } = await userClient
      .from("client_notes")
      .select("id, client_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !note || note.client_id !== user.id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Update note
    const result = await updateClientNote(
      userClient,
      noteId,
      Object.keys(content).length > 0 ? content : undefined,
      is_public
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: result.data.id,
      updated_at: result.data.updated_at,
    });
  } catch (err) {
    logError(err, {
      where: "api/client/notes/[id]:PUT",
      op: "updateNote",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const noteId = params.id;

    // Verify note exists and belongs to client
    const { data: note, error: fetchError } = await userClient
      .from("client_notes")
      .select("id, client_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !note || note.client_id !== user.id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Delete note
    const { error: deleteError } = await userClient
      .from("client_notes")
      .delete()
      .eq("id", noteId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    logError(err, {
      where: "api/client/notes/[id]:DELETE",
      op: "deleteNote",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
