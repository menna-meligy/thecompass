"use client";

import { useState, useRef } from "react";
import { Plus, X, GripVertical, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import type { Task, Status } from "./RoadmapClient";

const EMOJIS = ["🎯","🚀","📚","💡","🔥","⚡","🌟","🎓","💪","🧭","📝","✅","🏆","🌱","🔑","💎","🗺️","🎨","🤝","📊"];

const COLS: { id: Status; labelEn: string; labelAr: string; color: string; border: string; bg: string }[] = [
  { id: "todo",        labelEn: "To Do",       labelAr: "المهام",   color:"#94A3B8", border:"rgba(148,163,184,0.15)", bg:"rgba(148,163,184,0.04)" },
  { id: "in_progress", labelEn: "In Progress", labelAr: "جاري",    color:"#F59E0B", border:"rgba(245,158,11,0.20)",  bg:"rgba(245,158,11,0.04)"  },
  { id: "done",        labelEn: "Done",         labelAr: "مكتمل",   color:"#22C55E", border:"rgba(34,197,94,0.20)",  bg:"rgba(34,197,94,0.04)"   },
];

interface Props {
  tasks: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  userId: string;
  locale: string;
  useDB?: boolean;
}

export default function KanbanBoard({ tasks, setTasks, locale }: Props) {
  const isAr = locale === "ar";
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [showEmojis, setShowEmojis] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addTask(status: Status) {
    if (!newTitle.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      icon: newIcon,
      status,
      position: tasks.filter((t) => t.status === status).length,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTitle(""); setNewIcon("🎯"); setAddingTo(null); setShowEmojis(false);
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function moveTask(id: string, newStatus: Status) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
  }

  function onDragStart(id: string) { setDragging(id); }
  function onDragOver(e: React.DragEvent, status: Status) { e.preventDefault(); setDragOver(status); }
  function onDrop(status: Status) {
    if (dragging) moveTask(dragging, status);
    setDragging(null); setDragOver(null);
  }

  const total = tasks.filter((t) => !t.pinned).length;
  const doneCount = tasks.filter((t) => t.status === "done" && !t.pinned).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="text-white font-black text-xl">{isAr ? "لوحة الأهداف" : "Goals Board"}</h2>
        {total > 0 && (
          <div className="flex items-center gap-1.5 ms-2">
            <Trophy className="h-3.5 w-3.5 text-[#F59E0B]" />
            <span style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.45)" }}>
              {doneCount}/{total} {isAr ? "مكتمل" : "done"}
            </span>
          </div>
        )}
        <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.2)", marginInlineStart:"auto" }}>
          {isAr ? "اسحب البطاقات بين الأعمدة" : "Drag cards between columns"}
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id).sort((a, b) => a.position - b.position);
          const isOver = dragOver === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDrop={() => onDrop(col.id)}
              style={{
                borderRadius: "10px",
                border: `1.5px solid ${isOver ? col.color : col.border}`,
                background: isOver ? col.bg : "rgba(13,21,38,0.5)",
                minHeight: "360px",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.15s",
              }}
            >
              {/* Column header */}
              <div style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${col.border}`,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: col.bg,
                borderRadius: "9px 9px 0 0",
              }}>
                <div style={{ width:"10px", height:"10px", borderRadius:"50%", background: col.color, flexShrink:0 }} />
                <span style={{ color: col.color, fontWeight:800, fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  {isAr ? col.labelAr : col.labelEn}
                </span>
                <span style={{
                  marginInlineStart: "auto",
                  background: `${col.color}18`,
                  color: col.color,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!task.pinned}
                    onDragStart={() => !task.pinned && onDragStart(task.id)}
                    style={{
                      background: task.pinned ? "rgba(245,158,11,0.08)" : "rgba(30,41,59,0.8)",
                      border: `1px solid ${task.pinned ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.10)"}`,
                      borderRadius: "8px",
                      padding: "11px 13px",
                      cursor: task.pinned ? "default" : "grab",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      opacity: dragging === task.id ? 0.35 : 1,
                      transition: "opacity 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {!task.pinned && <GripVertical className="h-3.5 w-3.5 flex-shrink-0" style={{ color:"rgba(255,255,255,0.15)" }} />}
                    {task.pinned && <span style={{ fontSize:"0.7rem", color:"rgba(245,158,11,0.5)", flexShrink:0 }}>📌</span>}
                    <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{task.icon}</span>
                    <span style={{
                      flex: 1,
                      fontSize: "0.875rem",
                      fontWeight: task.pinned ? 700 : 500,
                      color: task.pinned ? "#F59E0B" : "rgba(255,255,255,0.82)",
                      minWidth: 0,
                      wordBreak: "break-word",
                      lineHeight: 1.4,
                    }}>
                      {task.title}
                    </span>
                    {!task.pinned && (
                      <button
                        onClick={() => removeTask(task.id)}
                        style={{ flexShrink:0, cursor:"pointer", color:"rgba(255,255,255,0.18)", lineHeight:1, background:"none", border:"none", padding:0 }}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add card input */}
                {addingTo === col.id ? (
                  <div style={{
                    background: "rgba(15,23,42,0.8)",
                    border: "1.5px solid rgba(245,158,11,0.30)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}>
                    {/* Emoji picker toggle */}
                    <button
                      onClick={() => setShowEmojis(!showEmojis)}
                      style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"8px", cursor:"pointer", background:"none", border:"none", color:"rgba(255,255,255,0.45)", fontSize:"0.78rem" }}
                    >
                      <span style={{fontSize:"1.15rem"}}>{newIcon}</span>
                      {showEmojis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span>{isAr ? "اختر أيقونة" : "Pick icon"}</span>
                    </button>

                    {showEmojis && (
                      <div style={{
                        display:"flex", flexWrap:"wrap", gap:"3px", padding:"8px",
                        background:"rgba(13,21,38,0.9)", borderRadius:"6px",
                        border:"1px solid rgba(245,158,11,0.15)", marginBottom:"8px",
                      }}>
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            onClick={() => { setNewIcon(e); setShowEmojis(false); }}
                            style={{
                              fontSize:"1.1rem", padding:"5px 6px", borderRadius:"5px", cursor:"pointer",
                              background: newIcon===e ? "rgba(245,158,11,0.2)" : "transparent",
                              border: newIcon===e ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
                            }}
                          >{e}</button>
                        ))}
                      </div>
                    )}

                    <input
                      ref={inputRef}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask(col.id);
                        if (e.key === "Escape") { setAddingTo(null); setNewTitle(""); setShowEmojis(false); }
                      }}
                      placeholder={isAr ? "اكتب عنوان المهمة..." : "Task title..."}
                      style={{
                        width:"100%", background:"transparent", border:"none", outline:"none",
                        color:"white", fontSize:"0.875rem", marginBottom:"10px", lineHeight:1.5,
                      }}
                      autoFocus
                    />

                    <div style={{ display:"flex", gap:"6px" }}>
                      <button
                        onClick={() => addTask(col.id)}
                        style={{
                          flex:1, padding:"7px", borderRadius:"6px",
                          background:"#F59E0B", color:"#0f172a", fontWeight:800,
                          fontSize:"0.8rem", cursor:"pointer", border:"none",
                        }}
                      >
                        {isAr ? "إضافة" : "Add"}
                      </button>
                      <button
                        onClick={() => { setAddingTo(null); setNewTitle(""); setShowEmojis(false); }}
                        style={{
                          padding:"7px 12px", borderRadius:"6px",
                          background:"rgba(148,163,184,0.08)", color:"rgba(255,255,255,0.4)",
                          fontSize:"0.8rem", cursor:"pointer", border:"1px solid rgba(148,163,184,0.12)",
                        }}
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingTo(col.id);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    style={{
                      display:"flex", alignItems:"center", gap:"6px",
                      width:"100%", padding:"9px 12px", borderRadius:"8px",
                      border:"1.5px dashed rgba(148,163,184,0.12)",
                      color:"rgba(255,255,255,0.25)", fontSize:"0.82rem",
                      cursor:"pointer", background:"transparent", transition:"all 0.15s",
                    }}
                    className="hover:border-[rgba(245,158,11,0.3)] hover:text-[#F59E0B]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isAr ? "إضافة مهمة" : "Add task"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
