import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  try {
    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file from storage
    const { data, error } = await supabase.storage
      .from("receipts")
      .download(path);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Return the file
    const buffer = await data.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": data.type,
        "Content-Disposition": `inline; filename="${path.split("/").pop()}"`,
      },
    });
  } catch (error) {
    console.error("Download failed:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
