import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebarWrapper from "@/components/layout/DashboardSidebarWrapper";

export default async function BookLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);
  return <DashboardSidebarWrapper locale={locale}>{children}</DashboardSidebarWrapper>;
}
