import { createClient } from "@/lib/supabase/server";

export async function initializeStorageBuckets() {
  try {
    const supabase = await createClient();

    // Try to create the 'proofs' bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    const proofsBucketExists = buckets?.some((b) => b.name === "proofs");

    if (!proofsBucketExists) {
      const { data, error } = await supabase.storage.createBucket("proofs", {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });

      if (error) {
        console.error("Failed to create proofs bucket:", error);
      } else {
        console.log("✓ Created 'proofs' storage bucket");
      }
    } else {
      console.log("✓ 'proofs' storage bucket already exists");
    }
  } catch (error) {
    console.error("Storage initialization error:", error);
  }
}
