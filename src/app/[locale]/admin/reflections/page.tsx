"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  Calendar,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Archive,
  Trash2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type ReflectionStatus = "all" | "recent" | "archived";

interface ReflectionRow {
  id: string;
  booking_id: string;
  client_id: string;
  mentor_id: string;
  encouragement_ar: string | null;
  encouragement_en: string | null;
  private_notes: string | null;
  submitted_at: string;
  user?: { full_name?: string; email?: string };
  session?: {
    starts_at?: string;
    workshop?: { title_ar?: string; title_en?: string };
  };
}

const FILTER_TABS: { key: ReflectionStatus; labelAr: string; labelEn: string }[] = [
  { key: "all", labelAr: "الكل", labelEn: "All" },
  { key: "recent", labelAr: "الأحدث", labelEn: "Recent" },
  { key: "archived", labelAr: "مؤرشفة", labelEn: "Archived" },
];

export default function AdminReflectionsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [reflections, setReflections] = useState<ReflectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReflectionStatus>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("session_reflections")
      .select(
        `
        id,
        booking_id,
        client_id,
        mentor_id,
        encouragement_ar,
        encouragement_en,
        private_notes,
        submitted_at,
        user:profiles(full_name, email),
        booking:bookings(
          session:sessions(starts_at, workshop:workshops(title_ar, title_en))
        )
      `
      )
      .order("submitted_at", { ascending: false });

    setReflections((data as unknown as ReflectionRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = reflections.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const name = r.user?.full_name?.toLowerCase() || "";
      const email = r.user?.email?.toLowerCase() || "";
      const title =
        (isAr
          ? r.session?.workshop?.title_ar
          : r.session?.workshop?.title_en
        )?.toLowerCase() || "";

      if (!name.includes(q) && !email.includes(q) && !title.includes(q))
        return false;
    }

    // Filter by date for "recent" (last 7 days)
    if (filter === "recent") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const submittedDate = new Date(r.submitted_at);
      if (submittedDate < sevenDaysAgo) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "النمو والتقييم" : "Growth & Feedback"}
        </p>
        <h1 className="text-2xl font-black text-white">
          {isAr ? "💭 رسائل التشجيع" : "💭 Reflections"}
        </h1>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300 text-sm">
          <span className="flex-1">{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-amber-300/60 hover:text-amber-200"
            aria-label="dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => {
            let count = reflections.length;
            if (tab.key === "recent") {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              count = reflections.filter(
                (r) => new Date(r.submitted_at) >= sevenDaysAgo
              ).length;
            }

            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  filter === tab.key
                    ? "bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)] text-[#F59E0B]"
                    : "bg-transparent border-white/5 text-white/40 hover:text-white/70 hover:border-white/10"
                )}
              >
                {isAr ? tab.labelAr : tab.labelEn}
                {count > 0 && <span className="ms-1.5 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث..." : "Search..."}
            className="ps-9 pe-4 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-[rgba(245,158,11,0.3)] w-52"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "العميل" : "Client"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الجلسة" : "Session"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الموعد" : "Date"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الرسالة" : "Message"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-white/25 text-sm">
                    {isAr ? "لا توجد رسائل" : "No reflections found"}
                  </td>
                </tr>
              ) : (
                filtered.map((reflection) => {
                  const title = isAr
                    ? reflection.session?.workshop?.title_ar
                    : reflection.session?.workshop?.title_en;
                  const sessionDate = reflection.session?.starts_at
                    ? new Date(reflection.session.starts_at).toLocaleDateString(
                        isAr ? "ar-EG" : "en-US",
                        { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                      )
                    : "-";

                  const message = isAr
                    ? reflection.encouragement_ar
                    : reflection.encouragement_en;

                  return (
                    <tr
                      key={reflection.id}
                      className="border-b border-white/3 hover:bg-white/2 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="text-white text-sm font-semibold">
                          {reflection.user?.full_name || "-"}
                        </p>
                        <p className="text-white/35 text-xs">
                          {reflection.user?.email || ""}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-white/80 text-sm truncate max-w-[160px]">
                          {title || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-white/50 text-xs">{sessionDate}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-white/60 text-sm truncate max-w-[200px]">
                          {message?.substring(0, 50)}
                          {message && message.length > 50 ? "..." : ""}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/${locale}/admin/reflections/${reflection.id}`}
                            title={isAr ? "عرض التفاصيل" : "View details"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">
            {isAr ? "لا توجد رسائل" : "No reflections found"}
          </div>
        ) : (
          filtered.map((reflection) => {
            const title = isAr
              ? reflection.session?.workshop?.title_ar
              : reflection.session?.workshop?.title_en;
            const sessionDate = reflection.session?.starts_at
              ? new Date(reflection.session.starts_at).toLocaleDateString(
                  isAr ? "ar-EG" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : "-";

            const message = isAr
              ? reflection.encouragement_ar
              : reflection.encouragement_en;

            return (
              <div
                key={reflection.id}
                className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {reflection.user?.full_name || "-"}
                    </p>
                    <p className="text-white/35 text-xs truncate">
                      {reflection.user?.email || ""}
                    </p>
                  </div>
                </div>
                <p className="text-white/80 text-sm mb-1">{title}</p>
                <p className="text-white/60 text-xs mb-1 line-clamp-2">
                  {message?.substring(0, 100)}
                  {message && message.length > 100 ? "..." : ""}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{sessionDate}</span>
                  <Link
                    href={`/${locale}/admin/reflections/${reflection.id}`}
                    className="px-2 py-1 rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    {isAr ? "عرض" : "View"}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stats */}
      {!loading && reflections.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-[#F59E0B]">{reflections.length}</p>
            <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
              {isAr ? "إجمالي الرسائل" : "Total Reflections"}
            </p>
          </div>
          <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">
              {
                reflections.filter(
                  (r) =>
                    new Date(r.submitted_at).getTime() >
                    Date.now() - 7 * 24 * 60 * 60 * 1000
                ).length
              }
            </p>
            <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
              {isAr ? "هذا الأسبوع" : "This Week"}
            </p>
          </div>
          <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-amber-400">
              {reflections.filter((r) => r.private_notes).length}
            </p>
            <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
              {isAr ? "بملاحظات خاصة" : "With Private Notes"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
