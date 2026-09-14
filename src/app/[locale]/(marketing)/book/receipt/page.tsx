import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

// Superseded. This page used to take a receipt with only date/time/price in the
// URL — no booking to attach it to — so it uploaded to the `proofs` bucket (which
// has no INSERT policy, hence "فشل رفع الملف") and then stapled the receipt onto
// whatever the user's most recent booking happened to be. Workshop booking now
// runs through BookingFlow (create booking -> upload -> verify-screenshot), the
// same path the individual session uses.
export default async function ReceiptPage() {
  const locale = await getLocale();
  redirect(`/${locale}/workshops`);
}
