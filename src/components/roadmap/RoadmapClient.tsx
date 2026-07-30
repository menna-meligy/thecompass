"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import HorizontalRoadmap from "./HorizontalRoadmap";
import type { SessionMilestone } from "./HorizontalRoadmap";
import KanbanBoard from "./KanbanBoard";

export type Status = "todo" | "in_progress" | "done";
export interface Task {
  id: string;
  title: string;
  icon: string;
  status: Status;
  position: number;
  pinned?: boolean; // registration node — can't be deleted/moved
}

const STORAGE_KEY = "albosla_kanban_v2";
const REGISTRATION_TASK: Task = {
  id: "reg-node",
  title: "Joined The Compass",
  icon: "🧭",
  status: "done",
  position: 0,
  pinned: true,
};

function loadLocal(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [REGISTRATION_TASK];
    const parsed = JSON.parse(raw) as Task[];
    if (!parsed.find((t) => t.id === "reg-node")) {
      return [REGISTRATION_TASK, ...parsed];
    }
    return parsed;
  } catch {
    return [REGISTRATION_TASK];
  }
}

function saveLocal(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

interface Props {
  userId: string;
  locale: string;
  isAdmin?: boolean;
  targetUserId?: string;
  clientName?: string;
}

export default function RoadmapClient({ userId, locale, isAdmin = false, targetUserId, clientName }: Props) {
  const isAr = locale === "ar";
  const regTitle = isAr ? "انضميت للبوصلة" : "Joined The Compass";

  // Mentee tasks
  const [menteeTasks, setMenteeTasksState] = useState<Task[]>([REGISTRATION_TASK]);
  const [menteeUseDB, setMenteeUseDB] = useState(false);

  // Mentor tasks
  const [mentorTasks, setMentorTasksState] = useState<Task[]>([]);

  // Session milestones from confirmed bookings
  const [sessionMilestones, setSessionMilestones] = useState<SessionMilestone[]>([]);

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"mentee" | "mentor">("mentee");

  const supabase = createClient();
  const uid = targetUserId || userId;

  useEffect(() => {
    async function load() {
      // Load mentee tasks (track = 'mentee' or NULL for backwards compat)
      const { data: menteeData, error: menteeError } = await (supabase as any)
        .from("user_tasks")
        .select("*")
        .eq("user_id", uid)
        .or("track.eq.mentee,track.is.null")
        .order("position");

      if (!menteeError && menteeData && menteeData.length > 0) {
        const withReg = menteeData.find((t: Task) => t.id === "reg-node")
          ? menteeData
          : [REGISTRATION_TASK, ...menteeData];
        setMenteeTasksState(withReg);
        setMenteeUseDB(true);
      } else {
        const local = loadLocal();
        setMenteeTasksState(local);
      }

      // Load mentor tasks
      const { data: mentorData } = await (supabase as any)
        .from("user_tasks")
        .select("*")
        .eq("user_id", uid)
        .eq("track", "mentor")
        .order("position");

      if (mentorData && mentorData.length > 0) {
        setMentorTasksState(mentorData as Task[]);
      }

      // Load confirmed bookings for session milestones
      const { data: confirmedBookings } = await (supabase as any)
        .from("bookings")
        .select("*, session:sessions(*, workshop:workshops(*))")
        .eq("user_id", uid)
        .eq("status", "confirmed");

      if (confirmedBookings && confirmedBookings.length > 0) {
        const milestones: SessionMilestone[] = confirmedBookings.map((booking: {
          id: string;
          session?: {
            starts_at?: string;
            workshop?: { title_ar?: string; title_en?: string };
          };
        }) => {
          const title = (isAr
            ? booking.session?.workshop?.title_ar
            : booking.session?.workshop?.title_en)
            || (isAr ? "جلسة" : "Session");
          return {
            id: booking.id,
            title,
            date: booking.session?.starts_at || new Date().toISOString(),
            icon: "📅",
          };
        });
        setSessionMilestones(milestones);
      }

      setReady(true);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Mentee tasks setter
  const setMenteeTasks = useCallback((updated: (prev: Task[]) => Task[]) => {
    setMenteeTasksState((prev) => {
      const next = updated(prev);
      if (!menteeUseDB) saveLocal(next);
      return next;
    });
  }, [menteeUseDB]);

  // Mentor tasks setter — saves with track='mentor', user_id=uid
  const setMentorTasks = useCallback((updated: (prev: Task[]) => Task[]) => {
    setMentorTasksState((prev) => {
      const next = updated(prev);
      // Persist to DB async (fire-and-forget)
      (async () => {
        for (const task of next) {
          await (supabase as any).from("user_tasks").upsert({
            id: task.id,
            user_id: uid,
            title: task.title,
            icon: task.icon,
            status: task.status,
            position: task.position,
            pinned: task.pinned || false,
            track: "mentor",
          }, { onConflict: "id" });
        }
        // Remove deleted tasks
        const nextIds = next.map((t) => t.id);
        const removed = prev.filter((t) => !nextIds.includes(t.id));
        for (const task of removed) {
          await (supabase as any).from("user_tasks").delete().eq("id", task.id);
        }
      })();
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const menteeDisplay = menteeTasks.map((t) => (t.id === "reg-node" ? { ...t, title: regTitle } : t));
  const doneTasks = menteeDisplay.filter((t) => t.status === "done");

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Tab labels
  const tab1Label = isAdmin
    ? (isAr ? "أهداف العميل" : "Client's Goals")
    : (isAr ? "أهدافي" : "My Goals");
  const tab2Label = isAdmin
    ? (isAr ? "ملاحظاتي (المنتور)" : "My Notes (Mentor)")
    : (isAr ? "ملاحظات المنتور" : "Mentor Notes");

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col">
      {/* Client name header (admin view) */}
      {isAdmin && clientName && (
        <div style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid rgba(245,158,11,0.08)",
          background: "rgba(13,21,38,0.7)",
        }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: "1rem", color: "#0f172a", flexShrink: 0,
            }}>
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>{clientName}</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
                {isAr ? "لوحة الرحلة" : "Journey Board"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP: Horizontal Roadmap ── */}
      <div
        className="sticky top-0 z-10 flex-shrink-0"
        style={{
          background: "rgba(13,21,38,0.97)",
          borderBottom: "1px solid rgba(245,158,11,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <HorizontalRoadmap doneTasks={doneTasks} sessions={sessionMilestones} locale={locale} />
      </div>

      {/* ── BOTTOM: Tabs + Kanban ── */}
      <div className="flex-1 overflow-auto" style={{ padding: "1.5rem 1.5rem 2rem" }}>
        {/* Tab bar */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
          {([
            { key: "mentee" as const, label: tab1Label },
            { key: "mentor" as const, label: tab2Label },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab.key ? "#F59E0B" : "transparent"}`,
                color: activeTab === tab.key ? "#F59E0B" : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "mentee" && (
          <KanbanBoard
            tasks={menteeDisplay}
            setTasks={setMenteeTasks}
            userId={userId}
            locale={locale}
            useDB={menteeUseDB}
            readOnly={isAdmin}
            trackLabel={isAdmin ? (isAr ? "أهداف العميل" : "Client's Goals") : (isAr ? "أهدافي" : "My Goals")}
            trackColor="#F59E0B"
          />
        )}

        {activeTab === "mentor" && (
          <>
            {!isAdmin && mentorTasks.length === 0 ? (
              <div style={{
                background: "rgba(139,92,246,0.06)",
                border: "1px solid rgba(139,92,246,0.15)",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📝</div>
                <p style={{ color: "rgba(167,139,250,0.7)", fontSize: "0.9rem", fontWeight: 600 }}>
                  {isAr ? "لسه مفيش ملاحظات من المنتور" : "No notes from mentor yet"}
                </p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem", marginTop: "6px" }}>
                  {isAr ? "ملاحظات المنتور هتظهر هنا بعد أول جلسة ليك" : "Mentor notes will appear here after your first session"}
                </p>
              </div>
            ) : (
              <KanbanBoard
                tasks={mentorTasks}
                setTasks={setMentorTasks}
                userId={userId}
                locale={locale}
                useDB={true}
                readOnly={!isAdmin}
                trackLabel={isAdmin ? (isAr ? "ملاحظاتي (المنتور)" : "Mentor Notes") : (isAr ? "ملاحظات المنتور" : "Mentor Notes")}
                trackColor="#A78BFA"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
