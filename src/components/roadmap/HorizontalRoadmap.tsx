"use client";

import { Calendar } from "lucide-react";
import type { Task } from "./RoadmapClient";

export interface SessionMilestone {
  id: string;
  title: string;
  date: string; // ISO string
}

interface Props {
  doneTasks: Task[];
  sessions?: SessionMilestone[];
  locale: string;
}

type TimelineItem =
  | { kind: "task"; task: Task; idx: number }
  | { kind: "session"; session: SessionMilestone };

export default function HorizontalRoadmap({ doneTasks, sessions = [], locale }: Props) {
  const isAr = locale === "ar";

  // Build unified list: tasks in their original order, sessions appended (sorted by date)
  const taskItems: TimelineItem[] = doneTasks.map((task, idx) => ({ kind: "task", task, idx }));
  const sessionItems: TimelineItem[] = [...sessions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((session) => ({ kind: "session", session }));

  const allItems: TimelineItem[] = [...taskItems, ...sessionItems];
  const totalCount = allItems.length;

  return (
    <div style={{ padding: "16px 24px 14px" }}>
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(245,158,11,0.5)" }}>
          {isAr ? "مشوار إنجازاتك" : "Your Progress Path"}
        </span>
        <div style={{ flex: 1, height: "1px", background: "rgba(245,158,11,0.08)" }} />
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
          {doneTasks.length} {isAr ? "خلصان" : "completed"}
          {sessions.length > 0 && ` · ${sessions.length} ${isAr ? "جلسة" : "sessions"}`}
        </span>
      </div>

      {/* Horizontal scrollable nodes */}
      <div
        className="flex items-center gap-0 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {allItems.map((item, i) => {
          const isLast = i === totalCount - 1;
          const isFirst = i === 0;

          if (item.kind === "session") {
            const s = item.session;
            const formattedDate = (() => {
              try {
                return new Date(s.date).toLocaleDateString(
                  isAr ? "ar-EG" : "en-US",
                  { month: "short", day: "numeric" }
                );
              } catch {
                return "";
              }
            })();

            return (
              <div key={`session-${s.id}`} className="flex items-center flex-shrink-0">
                {/* Session node */}
                <div className="flex flex-col items-center" style={{ minWidth: "72px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "rgba(139,92,246,0.15)",
                      border: "2px solid rgba(139,92,246,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      boxShadow: "0 0 12px rgba(139,92,246,0.25)",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={16} style={{ color: "rgba(139,92,246,0.9)" }} />
                  </div>
                  {/* Title */}
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      color: "rgba(167,139,250,0.85)",
                      maxWidth: "68px",
                      textAlign: "center",
                      lineHeight: 1.3,
                      wordBreak: "break-word",
                    }}
                  >
                    {s.title}
                  </div>
                  {/* Date below label */}
                  {formattedDate && (
                    <div
                      style={{
                        marginTop: "2px",
                        fontSize: "0.58rem",
                        color: "#A78BFA",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      {formattedDate}
                    </div>
                  )}
                </div>

                {/* Connector */}
                {!isLast && (
                  <div style={{
                    height: "2px",
                    width: "32px",
                    flexShrink: 0,
                    background: "linear-gradient(to right, rgba(139,92,246,0.4), rgba(139,92,246,0.15))",
                    marginBottom: "26px",
                    marginInline: "2px",
                  }} />
                )}

                {isLast && (
                  <>
                    <div style={{ height: "2px", width: "32px", flexShrink: 0, background: "rgba(148,163,184,0.12)", marginBottom: "26px", marginInline: "2px" }} />
                    <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: "64px", opacity: 0.3 }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px dashed rgba(148,163,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "0.85rem" }}>＋</span>
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                        {isAr ? "اللي جاي" : "Next"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          }

          // task node
          const task = item.task;

          return (
            <div key={task.id} className="flex items-center flex-shrink-0">
              {/* Node */}
              <div className="flex flex-col items-center" style={{ minWidth: "72px" }}>
                {/* Circle */}
                <div
                  style={{
                    width: isFirst ? "42px" : "36px",
                    height: isFirst ? "42px" : "36px",
                    borderRadius: "50%",
                    background: isFirst
                      ? "linear-gradient(135deg, #F59E0B, #D97706)"
                      : "rgba(245,158,11,0.15)",
                    border: `2px solid ${isFirst ? "#F59E0B" : "rgba(245,158,11,0.4)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isFirst ? "1.1rem" : "1rem",
                    boxShadow: isFirst ? "0 0 16px rgba(245,158,11,0.45)" : "none",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  {task.icon}
                  {/* Completed tick */}
                  {!isFirst && (
                    <div style={{
                      position: "absolute", bottom: "-2px", right: "-2px",
                      width: "14px", height: "14px", borderRadius: "50%",
                      background: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
                {/* Label */}
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "0.62rem",
                    fontWeight: isFirst ? 700 : 600,
                    color: isFirst ? "#F59E0B" : "rgba(255,255,255,0.55)",
                    maxWidth: "68px",
                    textAlign: "center",
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {task.title}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  height: "2px",
                  width: "32px",
                  flexShrink: 0,
                  background: "linear-gradient(to right, rgba(245,158,11,0.5), rgba(245,158,11,0.2))",
                  marginBottom: "20px",
                  marginInline: "2px",
                }} />
              )}

              {/* Future placeholder after last */}
              {isLast && (
                <>
                  <div style={{ height: "2px", width: "32px", flexShrink: 0, background: "rgba(148,163,184,0.12)", marginBottom: "20px", marginInline: "2px" }} />
                  <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: "64px", opacity: 0.3 }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px dashed rgba(148,163,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.85rem" }}>＋</span>
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                      {isAr ? "اللي جاي" : "Next"}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {totalCount === 0 && (
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", padding: "8px 0" }}>
            {isAr ? "ضيف مهمة وكمّلها عشان تبدأ مشوارك" : "Complete a task to start your journey"}
          </div>
        )}
      </div>
    </div>
  );
}
