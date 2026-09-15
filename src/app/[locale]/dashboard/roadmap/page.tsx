import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import RoadmapClient from "@/components/roadmap/RoadmapClient";

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  // The dashboard's mentor-notes card links in with ?tab=mentor so the client
  // lands on the notes instead of having to discover the second tab.
  const { tab } = await searchParams;

  return (
    <RoadmapClient
      userId={user.id}
      locale={locale}
      initialTab={tab === "mentor" ? "mentor" : "mentee"}
    />
  );
}
