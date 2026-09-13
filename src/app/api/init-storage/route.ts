import { initializeStorageBuckets } from "@/lib/init-storage";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await initializeStorageBuckets();
    return NextResponse.json({ success: true, message: "Storage buckets initialized" });
  } catch (error) {
    console.error("Storage init error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize storage" },
      { status: 500 }
    );
  }
}

// Also run on GET for debugging/manual triggers
export async function GET() {
  return POST();
}
