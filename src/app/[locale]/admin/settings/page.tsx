"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Save, User, CreditCard, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "profile" | "payment" | "notifications";

interface CoachProfile {
  full_name?: string;
  bio_ar?: string;
  bio_en?: string;
  phone?: string;
  email?: string;
  instagram_url?: string;
  linkedin_url?: string;
}

export default function SettingsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<CoachProfile>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data as CoachProfile);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("profiles").update(profile).eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TABS = [
    { key: "profile" as const, labelAr: "الملف الشخصي", labelEn: "Coach Profile", icon: User },
    { key: "payment" as const, labelAr: "بيانات الدفع", labelEn: "Payment Info", icon: CreditCard },
    { key: "notifications" as const, labelAr: "الإشعارات", labelEn: "Notifications", icon: Bell },
  ];

  const SaveButton = () => (
    <button
      onClick={saveProfile}
      disabled={saving}
      className={cn(
        "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
        saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.25)]"
      )}
    >
      <Save className="h-4 w-4" />
      {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : saved ? (isAr ? "تم ✓" : "Saved ✓") : (isAr ? "حفظ" : "Save")}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "النظام" : "System"}
        </p>
        <h1 className="text-2xl font-black text-white">{isAr ? "الإعدادات" : "Settings"}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
                tab === t.key ? "text-[#F59E0B] border-[#F59E0B]" : "text-white/40 border-transparent hover:text-white/60"
              )}
            >
              <Icon className="h-4 w-4" />
              {isAr ? t.labelAr : t.labelEn}
            </button>
          );
        })}
      </div>

      {/* Coach Profile */}
      {tab === "profile" && (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/40">{isAr ? "الاسم الكامل" : "Full name"}</label>
              <input
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/40">{isAr ? "رقم الهاتف" : "Phone"}</label>
              <input
                type="text"
                value={profile.phone || ""}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                dir="ltr"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-white/40">{isAr ? "نبذة بالعربية" : "Bio (Arabic)"}</label>
              <textarea
                value={profile.bio_ar || ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio_ar: e.target.value }))}
                rows={3}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)] resize-none"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-white/40">{isAr ? "نبذة بالإنجليزية" : "Bio (English)"}</label>
              <textarea
                value={profile.bio_en || ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio_en: e.target.value }))}
                rows={3}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)] resize-none"
                dir="ltr"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/40">Instagram</label>
              <input
                type="url"
                value={profile.instagram_url || ""}
                onChange={(e) => setProfile((p) => ({ ...p, instagram_url: e.target.value }))}
                placeholder="https://instagram.com/..."
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                dir="ltr"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/40">LinkedIn</label>
              <input
                type="url"
                value={profile.linkedin_url || ""}
                onChange={(e) => setProfile((p) => ({ ...p, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <SaveButton />
          </div>
        </div>
      )}

      {/* Payment info */}
      {tab === "payment" && (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-5">
          <p className="text-sm text-white/40">
            {isAr
              ? "بيانات الدفع محددة عبر متغيرات البيئة لأسباب أمنية. لتغييرها، قم بتحديث NEXT_PUBLIC_INSTAPAY_NUMBER في Vercel\u200E."
              : "Payment details are managed via environment variables for security. To change them, update NEXT_PUBLIC_INSTAPAY_NUMBER in Vercel."}
          </p>
          <div className="bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{isAr ? "رقم InstaPay" : "InstaPay number"}</span>
              <span className="text-sm font-mono text-white/70 bg-white/5 px-3 py-1 rounded-lg">
                {process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01093026726"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{isAr ? "رقم فودافون كاش" : "Vodafone Cash number"}</span>
              <span className="text-sm font-mono text-white/70 bg-white/5 px-3 py-1 rounded-lg">
                {process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01223810409"}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/25">
            {isAr ? "اسم الحساب واسم التحقق يتم إعدادهم عبر INSTAPAY_ACCOUNT_NAME في .env.local" : "Account name for OCR verification: set INSTAPAY_ACCOUNT_NAME in .env.local"}
          </p>
        </div>
      )}

      {/* Notifications placeholder */}
      {tab === "notifications" && (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
          <div className="text-center py-8">
            <Bell className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm font-medium">
              {isAr ? "إعدادات الإشعارات (قريباً)" : "Notification settings (coming soon)"}
            </p>
            <p className="text-white/20 text-xs mt-1">
              {isAr ? "سيتم ربط الإشعارات بالبريد الإلكتروني قريباً" : "Email notifications will be configured here"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
