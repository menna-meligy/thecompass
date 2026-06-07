"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import HorizontalRoadmap from "./HorizontalRoadmap";
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
  title: "Joined ElBosla",
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
    // ensure registration task is always present in done
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
}

export default function RoadmapClient({ userId, locale }: Props) {
  const [tasks, setTasksState] = useState<Task[]>([REGISTRATION_TASK]);
  const [useDB, setUseDB] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await (supabase as any)
        .from("user_tasks")
        .select("*")
        .eq("user_id", userId)
        .order("position");

      if (!error && data && data.length > 0) {
        const withReg = data.find((t: Task) => t.id === "reg-node")
          ? data
          : [REGISTRATION_TASK, ...data];
        setTasksState(withReg);
        setUseDB(true);
      } else {
        const local = loadLocal();
        setTasksState(local);
      }
      setReady(true);
    }
    load();
  }, [userId]);

  const setTasks = useCallback(async (updated: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksState((prev) => {
      const next = typeof updated === "function" ? updated(prev) : updated;
      if (!useDB) saveLocal(next);
      return next;
    });
  }, [useDB]);

  const doneTasks = tasks.filter((t) => t.status === "done");

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col">
      {/* ── TOP: Horizontal Roadmap ── */}
      <div
        className="sticky top-0 z-10 flex-shrink-0"
        style={{
          background: "rgba(13,21,38,0.97)",
          borderBottom: "1px solid rgba(245,158,11,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <HorizontalRoadmap doneTasks={doneTasks} locale={locale} />
      </div>

      {/* ── BOTTOM: Full Kanban ── */}
      <div className="flex-1 overflow-auto" style={{ padding: "2rem 1.5rem" }}>
        <KanbanBoard
          tasks={tasks}
          setTasks={setTasks}
          userId={userId}
          locale={locale}
          useDB={useDB}
        />
      </div>
    </div>
  );
}
