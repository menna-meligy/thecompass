import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, error: null };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const adminClient = await createAdminClient();

  const { data: skills, error: dbError } = await adminClient
    .from("skills")
    .select("*")
    .order("sort_order", { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ skills });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json() as {
    dimension: string;
    name_ar: string;
    name_en: string;
    description_ar?: string;
    description_en?: string;
    sort_order?: number;
  };

  const { dimension, name_ar, name_en, description_ar, description_en, sort_order } = body;

  if (!dimension || !name_ar || !name_en) {
    return NextResponse.json(
      { error: "Missing required fields: dimension, name_ar, name_en" },
      { status: 400 }
    );
  }

  const adminClient = await createAdminClient();

  const { data: skill, error: dbError } = await adminClient
    .from("skills")
    .insert({
      dimension,
      name_ar,
      name_en,
      description_ar: description_ar ?? "",
      description_en: description_en ?? "",
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ skill }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json() as {
    id: string;
    dimension?: string;
    name_ar?: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    sort_order?: number;
    is_active?: boolean;
  };

  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const { data: skill, error: dbError } = await adminClient
    .from("skills")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ skill });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json() as { id: string };
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const { data: skill, error: dbError } = await adminClient
    .from("skills")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ skill });
}
