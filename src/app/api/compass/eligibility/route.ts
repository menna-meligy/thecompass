import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEligibilityData } from "@/lib/skills/operations";
import { computeEligibility } from "@/lib/skills/eligibility";
import type { EligibilityResult } from "@/lib/skills/types";

export async function GET(_req: NextRequest): Promise<NextResponse<{ eligibility: EligibilityResult } | { error: string }>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = await fetchEligibilityData(supabase, user.id);
    const eligibility = computeEligibility(input);

    return NextResponse.json({ eligibility });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
