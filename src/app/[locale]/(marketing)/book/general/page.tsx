import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function GeneralSessionPage() {
  const locale = await getLocale();
  // Redirect to centralized availability system
  redirect(`/${locale}/book/availability`);
}
