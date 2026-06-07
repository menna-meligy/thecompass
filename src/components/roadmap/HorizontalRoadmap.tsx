"use client";

import type { Task } from "./RoadmapClient";

interface Props {
  doneTasks: Task[];
  locale: string;
}

export default function HorizontalRoadmap({ doneTasks, locale }: Props) {
  const isAr = locale === "ar";

  return (
    <div style={{ padding: "16px 24px 14px" }}>
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(245,158,11,0.5)" }}>
          {isAr ? "مسار إنجازاتك" : "Your Progress Path"}
        </span>
        <div style={{ flex: 1, height: "1px", background: "rgba(245,158,11,0.08)" }} />
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
          {doneTasks.length} {isAr ? "منجز" : "completed"}
        </span>
      </div>

      {/* Horizontal scrollable nodes */}
      <div
        className="flex items-center gap-0 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {doneTasks.map((task, i) => {
          const isLast = i === doneTasks.length - 1;
          const isFirst = i === 0;

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
                  <div style={{ height:"2px", width:"32px", flexShrink:0, background:"rgba(148,163,184,0.12)", marginBottom:"20px", marginInline:"2px" }} />
                  <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth:"64px", opacity:0.3 }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"1.5px dashed rgba(148,163,184,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:"0.85rem" }}>＋</span>
                    </div>
                    <div style={{ marginTop:"6px", fontSize:"0.6rem", color:"rgba(255,255,255,0.3)", textAlign:"center" }}>
                      {isAr ? "التالي" : "Next"}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {doneTasks.length === 0 && (
          <div style={{ color:"rgba(255,255,255,0.25)", fontSize:"0.75rem", padding:"8px 0" }}>
            {isAr ? "أضف مهمة وأكملها لتبدأ مسارك" : "Complete a task to start your journey"}
          </div>
        )}
      </div>
    </div>
  );
}
