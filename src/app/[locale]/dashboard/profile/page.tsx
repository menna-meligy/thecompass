"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { Profile } from "@/types/index";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/${locale}/auth`);
        return;
      }
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data as Profile);
            form.reset({
              full_name: data.full_name || "",
              phone: data.phone || "",
            });
          }
        });
    });
  }, []);

  async function handleSave(data: ProfileData) {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("profiles").update(data).eq("id", profile.id);
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">{t("title")}</h1>

        <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.15)] rounded-2xl p-6">
          {/* Avatar with initials */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[rgba(148,163,184,0.10)]">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B0000] to-[#C41E3A] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {profile?.full_name
                ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                : "؟"}
            </div>
            <div>
              <div className="font-semibold text-white">{profile?.full_name || "—"}</div>
              <div className="text-sm text-white/50">{profile?.email}</div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-1">{t("email")}</label>
              <p className="text-white/70 text-sm bg-white/5 rounded-lg px-3 py-2">{profile?.email}</p>
            </div>

            <Input
              label={t("fullName")}
              error={form.formState.errors.full_name?.message}
              {...form.register("full_name")}
            />

            <Input
              label={t("phone")}
              type="tel"
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />

            {saved && (
              <div className="text-green-400 text-sm">{t("saved")}</div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {t("save")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
