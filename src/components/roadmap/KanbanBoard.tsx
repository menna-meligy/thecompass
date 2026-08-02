"use client";

import { useState, useRef } from "react";
import { Plus, X, GripVertical, ChevronDown, ChevronUp, Trophy, Lock, Check, Flag } from "lucide-react";
import type { Task, Status, TaskStep } from "./RoadmapClient";

const EMOJIS = ["🎯","🚀","📚","💡","🔥","⚡","🌟","🎓","💪","🧭","📝","✅","🏆","🌱","🔑","💎","🗺️","🎨","🤝","📊"];

const COLS: { id: Status; labelEn: string; labelAr: string; color: string; border: string; bg: string }[] = [
  { id: "todo",        labelEn: "To Do",       labelAr: "المهام",   color:"#94A3B8", border:"rgba(148,163,184,0.15)", bg:"rgba(148,163,184,0.04)" },
  { id: "in_progress", labelEn: "In Progress", labelAr: "جاري",    color:"#F59E0B", border:"rgba(245,158,11,0.20)",  bg:"rgba(245,158,11,0.04)"  },
  { id: "done",        labelEn: "Done",         labelAr: "مكتمل",   color:"#22C55E", border:"rgba(34,197,94,0.20)",  bg:"rgba(34,197,94,0.04)"   },
];

const uid4 = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

interface Props {
  tasks: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  userId: string;
  locale: string;
  useDB?: boolean;
  readOnly?: boolean;
  trackLabel?: string;
  trackColor?: string;
}

export default function KanbanBoard({ tasks, setTasks, locale, readOnly = false, trackLabel, trackColor }: Props) {
  const isAr = locale === "ar";
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [showEmojis, setShowEmojis] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);
  const [newStep, setNewStep] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTask(status: Status) {
    if (readOnly || !newTitle.trim()) return;
    const newTask: Task = {
      id: uid4(), title: newTitle.trim(), icon: newIcon, status,
      position: tasks.filter((t) => t.status === status).length, steps: [],
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTitle(""); setNewIcon("🎯"); setAddingTo(null); setShowEmojis(false);
    setExpanded(newTask.id);
  }

  function removeTask(id: string) {
    if (readOnly) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function moveTask(id: string, newStatus: Status) {
    if (readOnly) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
  }

  // Derive a task's column from its steps: all done → done, some → in_progress, none → todo.
  function statusFromSteps(steps: TaskStep[], current: Status): Status {
    if (!steps.length) return current;
    const done = steps.filter((s) => s.done).length;
    if (done === steps.length) return "done";
    if (done > 0) return "in_progress";
    return "todo";
  }

  function updateSteps(taskId: string, fn: (steps: TaskStep[]) => TaskStep[]) {
    if (readOnly) return;
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const steps = fn(t.steps ?? []);
      return { ...t, steps, status: statusFromSteps(steps, t.status) };
    }));
  }
  const toggleStep = (taskId: string, stepId: string) =>
    updateSteps(taskId, (steps) => steps.map((s) => s.id === stepId ? { ...s, done: !s.done } : s));
  const removeStep = (taskId: string, stepId: string) =>
    updateSteps(taskId, (steps) => steps.filter((s) => s.id !== stepId));
  function addStep(taskId: string) {
    if (!newStep.trim()) return;
    updateSteps(taskId, (steps) => [...steps, { id: uid4(), title: newStep.trim(), done: false }]);
    setNewStep("");
  }

  function onDragStart(id: string) { if (!readOnly) setDragging(id); }
  function onDragOver(e: React.DragEvent, status: Status) { if (readOnly) return; e.preventDefault(); setDragOver(status); }
  function onDrop(status: Status) { if (readOnly) return; if (dragging) moveTask(dragging, status); setDragging(null); setDragOver(null); }

  const total = tasks.filter((t) => !t.pinned).length;
  const doneCount = tasks.filter((t) => t.status === "done" && !t.pinned).length;
  const headerAccent = trackColor || "#F59E0B";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="text-white font-black text-xl">{trackLabel || (isAr ? "لوحة الأهداف" : "Goals Board")}</h2>
        {total > 0 && (
          <div className="flex items-center gap-1.5 ms-2">
            <Trophy className="h-3.5 w-3.5" style={{ color: headerAccent }} />
            <span style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.45)" }}>{doneCount}/{total} {isAr ? "مكتمل" : "done"}</span>
          </div>
        )}
        {readOnly ? (
          <div className="flex items-center gap-1.5" style={{ marginInlineStart: "auto", padding: "3px 10px", borderRadius: "8px", background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.15)" }}>
            <Lock className="h-3 w-3" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{isAr ? "للعرض فقط" : "View only"}</span>
          </div>
        ) : (
          <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.25)", marginInlineStart:"auto" }}>
            {isAr ? "افتح أي مهمة وكمّل خطواتها" : "Open a task and complete its steps"}
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id).sort((a, b) => a.position - b.position);
          const isOver = !readOnly && dragOver === col.id;
          return (
            <div
              key={col.id}
              onDragOver={readOnly ? undefined : (e) => onDragOver(e, col.id)}
              onDrop={readOnly ? undefined : () => onDrop(col.id)}
              style={{ borderRadius: "10px", border: `1.5px solid ${isOver ? col.color : col.border}`, background: isOver ? col.bg : "rgba(13,21,38,0.5)", minHeight: "360px", display: "flex", flexDirection: "column", transition: "all 0.15s" }}
            >
              {/* Column header */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${col.border}`, display: "flex", alignItems: "center", gap: "8px", background: col.bg, borderRadius: "9px 9px 0 0" }}>
                <div style={{ width:"10px", height:"10px", borderRadius:"50%", background: col.color, flexShrink:0 }} />
                <span style={{ color: col.color, fontWeight:800, fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"0.08em" }}>{isAr ? col.labelAr : col.labelEn}</span>
                <span style={{ marginInlineStart: "auto", background: `${col.color}18`, color: col.color, fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                {colTasks.map((task) => {
                  const steps = task.steps ?? [];
                  const doneSteps = steps.filter((s) => s.done).length;
                  const pct = steps.length ? Math.round((doneSteps / steps.length) * 100) : 0;
                  const allDone = steps.length > 0 && doneSteps === steps.length;
                  const isOpen = expanded === task.id;
                  const canEdit = !task.pinned && !readOnly;
                  return (
                    <div
                      key={task.id}
                      draggable={canEdit && !isOpen}
                      onDragStart={() => canEdit && !isOpen && onDragStart(task.id)}
                      style={{
                        background: task.pinned ? "rgba(245,158,11,0.08)" : "rgba(30,41,59,0.85)",
                        border: `1px solid ${allDone ? "rgba(34,197,94,0.35)" : task.pinned ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.10)"}`,
                        borderRadius: "10px", overflow: "hidden",
                        opacity: dragging === task.id ? 0.35 : 1, transition: "opacity 0.15s, border-color 0.2s",
                      }}
                    >
                      {/* Card header row */}
                      <div
                        onClick={() => task.pinned ? null : setExpanded(isOpen ? null : task.id)}
                        style={{ padding: "11px 12px", display: "flex", alignItems: "center", gap: "9px", cursor: task.pinned ? "default" : "pointer" }}
                      >
                        {canEdit && !isOpen && <GripVertical className="h-3.5 w-3.5 flex-shrink-0" style={{ color:"rgba(255,255,255,0.15)" }} />}
                        {task.pinned && <span style={{ fontSize:"0.7rem", flexShrink:0 }}>📌</span>}
                        <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{task.icon}</span>
                        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: task.pinned ? 700 : 600, color: allDone ? "#86EFAC" : task.pinned ? "#F59E0B" : "rgba(255,255,255,0.9)", minWidth: 0, wordBreak: "break-word", lineHeight: 1.35 }}>
                          {task.title}
                        </span>
                        {allDone && <Trophy className="h-4 w-4 flex-shrink-0" style={{ color: "#22C55E" }} />}
                        {steps.length > 0 && !allDone && (
                          <span style={{ flexShrink:0, fontSize:"0.7rem", fontWeight:800, color: headerAccent, background:`${headerAccent}18`, padding:"1px 7px", borderRadius:"9px" }}>{doneSteps}/{steps.length}</span>
                        )}
                        {!task.pinned && (
                          isOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color:"rgba(255,255,255,0.4)" }} /> : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color:"rgba(255,255,255,0.3)" }} />
                        )}
                        {canEdit && (
                          <button onClick={(e) => { e.stopPropagation(); removeTask(task.id); }} style={{ flexShrink:0, cursor:"pointer", color:"rgba(255,255,255,0.18)", lineHeight:1, background:"none", border:"none", padding:0 }} className="hover:text-red-400 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Progress bar */}
                      {steps.length > 0 && (
                        <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", margin: "0 12px 10px" , borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: allDone ? "#22C55E" : headerAccent, borderRadius: "3px", transition: "width 0.3s" }} />
                        </div>
                      )}

                      {/* Expanded: the task's own mini-roadmap */}
                      {isOpen && !task.pinned && (
                        <div style={{ padding: "0 14px 14px" }}>
                          <div style={{ position: "relative", paddingInlineStart: "8px" }}>
                            {/* vertical path line */}
                            {steps.length > 0 && <div style={{ position: "absolute", insetInlineStart: "17px", top: "12px", bottom: "12px", width: "2px", background: "rgba(255,255,255,0.08)" }} />}
                            {steps.map((s, i) => (
                              <div key={s.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                                <button
                                  onClick={() => toggleStep(task.id, s.id)}
                                  disabled={readOnly}
                                  style={{
                                    width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, zIndex: 1,
                                    background: s.done ? "#22C55E" : "rgba(13,21,38,1)",
                                    border: `2px solid ${s.done ? "#22C55E" : "rgba(245,158,11,0.4)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: readOnly ? "default" : "pointer", padding: 0,
                                  }}
                                >
                                  {s.done ? <Check className="h-3 w-3" style={{ color: "#0f172a" }} strokeWidth={3} /> : <span style={{ fontSize: "0.6rem", color: "rgba(245,158,11,0.6)", fontWeight: 800 }}>{i + 1}</span>}
                                </button>
                                <span style={{ flex: 1, fontSize: "0.8rem", color: s.done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)", textDecoration: s.done ? "line-through" : "none", lineHeight: 1.4 }}>{s.title}</span>
                                {!readOnly && (
                                  <button onClick={() => removeStep(task.id, s.id)} style={{ flexShrink:0, background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.15)", padding:0 }} className="hover:text-red-400 transition-colors"><X className="h-3 w-3" /></button>
                                )}
                              </div>
                            ))}
                            {/* Finish flag */}
                            {steps.length > 0 && (
                              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                                <div style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, zIndex: 1, background: allDone ? "#22C55E" : "rgba(13,21,38,1)", border: `2px solid ${allDone ? "#22C55E" : "rgba(255,255,255,0.15)"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  <Flag className="h-3 w-3" style={{ color: allDone ? "#0f172a" : "rgba(255,255,255,0.3)" }} />
                                </div>
                                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: allDone ? "#86EFAC" : "rgba(255,255,255,0.3)" }}>
                                  {allDone ? (isAr ? "خلّصت المهمة دي! 🎉" : "Task complete! 🎉") : (isAr ? "خط النهاية" : "Finish")}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Add step */}
                          {!readOnly && (
                            addingStepTo === task.id ? (
                              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                                <input
                                  autoFocus value={newStep} onChange={(e) => setNewStep(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") addStep(task.id); if (e.key === "Escape") { setAddingStepTo(null); setNewStep(""); } }}
                                  placeholder={isAr ? "اكتب خطوة..." : "Add a step..."}
                                  style={{ flex: 1, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "6px", padding: "7px 10px", color: "white", fontSize: "0.8rem", outline: "none" }}
                                />
                                <button onClick={() => addStep(task.id)} style={{ padding: "7px 12px", borderRadius: "6px", background: "#F59E0B", color: "#0f172a", fontWeight: 800, fontSize: "0.78rem", border: "none", cursor: "pointer" }}>{isAr ? "إضافة" : "Add"}</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddingStepTo(task.id); setNewStep(""); }}
                                style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px dashed rgba(148,163,184,0.15)", color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", cursor: "pointer", background: "transparent" }}
                                className="hover:border-[rgba(245,158,11,0.3)] hover:text-[#F59E0B]"
                              >
                                <Plus className="h-3.5 w-3.5" />{isAr ? "إضافة خطوة" : "Add step"}
                              </button>
                            )
                          )}
                          {steps.length === 0 && readOnly && (
                            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", padding: "6px 0" }}>{isAr ? "لسه مفيش خطوات" : "No steps yet"}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add card */}
                {!readOnly && (
                  addingTo === col.id ? (
                    <div style={{ background: "rgba(15,23,42,0.8)", border: "1.5px solid rgba(245,158,11,0.30)", borderRadius: "8px", padding: "12px" }}>
                      <button onClick={() => setShowEmojis(!showEmojis)} style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"8px", cursor:"pointer", background:"none", border:"none", color:"rgba(255,255,255,0.45)", fontSize:"0.78rem" }}>
                        <span style={{fontSize:"1.15rem"}}>{newIcon}</span>
                        {showEmojis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span>{isAr ? "اختر أيقونة" : "Pick icon"}</span>
                      </button>
                      {showEmojis && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"3px", padding:"8px", background:"rgba(13,21,38,0.9)", borderRadius:"6px", border:"1px solid rgba(245,158,11,0.15)", marginBottom:"8px" }}>
                          {EMOJIS.map((e) => (
                            <button key={e} onClick={() => { setNewIcon(e); setShowEmojis(false); }} style={{ fontSize:"1.1rem", padding:"5px 6px", borderRadius:"5px", cursor:"pointer", background: newIcon===e ? "rgba(245,158,11,0.2)" : "transparent", border: newIcon===e ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent" }}>{e}</button>
                          ))}
                        </div>
                      )}
                      <input ref={inputRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(col.id); if (e.key === "Escape") { setAddingTo(null); setNewTitle(""); setShowEmojis(false); } }}
                        placeholder={isAr ? "اكتب عنوان المهمة..." : "Task title..."}
                        style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:"white", fontSize:"0.875rem", marginBottom:"10px", lineHeight:1.5 }} autoFocus />
                      <div style={{ display:"flex", gap:"6px" }}>
                        <button onClick={() => addTask(col.id)} style={{ flex:1, padding:"7px", borderRadius:"6px", background:"#F59E0B", color:"#0f172a", fontWeight:800, fontSize:"0.8rem", cursor:"pointer", border:"none" }}>{isAr ? "إضافة" : "Add"}</button>
                        <button onClick={() => { setAddingTo(null); setNewTitle(""); setShowEmojis(false); }} style={{ padding:"7px 12px", borderRadius:"6px", background:"rgba(148,163,184,0.08)", color:"rgba(255,255,255,0.4)", fontSize:"0.8rem", cursor:"pointer", border:"1px solid rgba(148,163,184,0.12)" }}>{isAr ? "إلغاء" : "Cancel"}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTo(col.id); setTimeout(() => inputRef.current?.focus(), 50); }}
                      style={{ display:"flex", alignItems:"center", gap:"6px", width:"100%", padding:"9px 12px", borderRadius:"8px", border:"1.5px dashed rgba(148,163,184,0.12)", color:"rgba(255,255,255,0.25)", fontSize:"0.82rem", cursor:"pointer", background:"transparent", transition:"all 0.15s" }}
                      className="hover:border-[rgba(245,158,11,0.3)] hover:text-[#F59E0B]">
                      <Plus className="h-3.5 w-3.5" />{isAr ? "إضافة مهمة" : "Add task"}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
