import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import RoadmapClient from "@/components/roadmap/RoadmapClient";

export default async function RoadmapPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  return <RoadmapClient userId={user.id} locale={locale} />;
}
