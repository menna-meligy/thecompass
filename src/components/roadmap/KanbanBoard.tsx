"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EMOJIS = ["🎯","🚀","📚","💡","🔥","⚡","🌟","🎓","💪","🧭","📝","✅","🎯","🏆","🌱","🔑","💎","🗺️","⚔️","🛡️"];

type Status = "todo" | "in_progress" | "done";
interface Task { id: string; title: string; icon: string; status: Status; position: number; }

const STORAGE_KEY = "albosla_kanban_tasks";
const COLS: { id: Status; label: string; labelAr: string; color: string; bg: string }[] = [
  { id: "todo",        label: "To Do",      labelAr: "قائمة المهام", color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
  { id: "in_progress", label: "In Progress", labelAr: "جاري",         color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { id: "done",        label: "Done",        labelAr: "مكتمل",        color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
];

function loadLocal(): Task[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveLocal(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

export default function KanbanBoard({ userId, locale }: { userId: string; locale: string }) {
  const isAr = locale === "ar";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [showEmojis, setShowEmojis] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [useDB, setUseDB] = useState(false);
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tasks
  useEffect(() => {
    async function load() {
      const { data, error } = await (supabase as any).from("user_tasks").select("*").eq("user_id", userId).order("position");
      if (!error && data) { setTasks(data as Task[]); setUseDB(true); }
      else { setTasks(loadLocal()); }
    }
    load();
  }, [userId]);

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    if (!useDB) saveLocal(updated);
  }, [useDB]);

  async function addTask(status: Status) {
    if (!newTitle.trim()) return;
    const task: Task = { id: crypto.randomUUID(), title: newTitle.trim(), icon: newIcon, status, position: tasks.filter(t=>t.status===status).length };
    if (useDB) {
      const { data, error } = await (supabase as any).from("user_tasks").insert({ user_id: userId, ...task }).select().single();
      if (!error && data) persist([...tasks, data as Task]);
    } else {
      persist([...tasks, task]);
    }
    setNewTitle(""); setNewIcon("🎯"); setAddingTo(null); setShowEmojis(false);
  }

  async function removeTask(id: string) {
    if (useDB) await (supabase as any).from("user_tasks").delete().eq("id", id);
    persist(tasks.filter(t => t.id !== id));
  }

  async function moveTask(id: string, newStatus: Status) {
    const updated = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
    persist(updated);
    if (useDB) await (supabase as any).from("user_tasks").update({ status: newStatus }).eq("id", id);
  }

  function onDragStart(id: string) { setDragging(id); }
  function onDragOver(e: React.DragEvent, status: Status) { e.preventDefault(); setDragOver(status); }
  function onDrop(status: Status) { if (dragging) moveTask(dragging, status); setDragging(null); setDragOver(null); }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div style={{ width:"3px", height:"24px", background:"#F59E0B", borderRadius:"2px" }} />
        <h2 className="text-white font-black text-lg">{isAr ? "لوحة الأهداف" : "Goals Board"}</h2>
        <span className="text-white/30 text-xs ms-auto">{tasks.filter(t=>t.status==="done").length}/{tasks.length} {isAr ? "مكتمل" : "done"}</span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id).sort((a,b)=>a.position-b.position);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={() => onDrop(col.id)}
              style={{
                borderRadius:"10px",
                border: `1px solid ${isOver ? col.color : "rgba(148,163,184,0.10)"}`,
                background: isOver ? col.bg : "rgba(15,23,42,0.4)",
                transition:"all 0.2s",
                minHeight:"200px",
                display:"flex", flexDirection:"column",
              }}
            >
              {/* Column header */}
              <div style={{ padding:"12px 14px 10px", borderBottom:"1px solid rgba(148,163,184,0.08)", display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: col.color, flexShrink:0 }} />
                <span style={{ color: col.color, fontWeight:700, fontSize:"0.8rem", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  {isAr ? col.labelAr : col.label}
                </span>
                <span style={{ marginInlineStart:"auto", background:"rgba(148,163,184,0.12)", color:"rgba(255,255,255,0.4)", fontSize:"0.7rem", fontWeight:700, padding:"2px 7px", borderRadius:"10px" }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding:"10px", flex:1, display:"flex", flexDirection:"column", gap:"8px" }}>
                {colTasks.map(task => (
                  <div key={task.id}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                    style={{
                      background:"rgba(30,41,59,0.7)", border:"1px solid rgba(245,158,11,0.12)",
                      borderRadius:"8px", padding:"10px 12px", cursor:"grab",
                      display:"flex", alignItems:"center", gap:"10px",
                      opacity: dragging === task.id ? 0.4 : 1,
                      transition:"opacity 0.15s",
                    }}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />
                    <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{task.icon}</span>
                    <span style={{ flex:1, fontSize:"0.85rem", color:"rgba(255,255,255,0.8)", fontWeight:500, minWidth:0, wordBreak:"break-word" }}>{task.title}</span>
                    <button onClick={() => removeTask(task.id)} style={{ flexShrink:0, color:"rgba(255,255,255,0.2)", cursor:"pointer", lineHeight:1 }} className="hover:text-red-400 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add card */}
                {addingTo === col.id ? (
                  <div style={{ background:"rgba(30,41,59,0.8)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"8px", padding:"12px" }}>
                    {/* Emoji picker */}
                    <div style={{ marginBottom:"8px" }}>
                      <button onClick={() => setShowEmojis(!showEmojis)} style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"0.8rem", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
                        <span style={{fontSize:"1.2rem"}}>{newIcon}</span>
                        {showEmojis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {showEmojis && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginTop:"6px", padding:"8px", background:"rgba(15,23,42,0.8)", borderRadius:"6px", border:"1px solid rgba(245,158,11,0.15)" }}>
                          {EMOJIS.map(e => (
                            <button key={e} onClick={() => { setNewIcon(e); setShowEmojis(false); }}
                              style={{ fontSize:"1.1rem", padding:"4px", borderRadius:"4px", cursor:"pointer", background: newIcon===e ? "rgba(245,158,11,0.2)" : "transparent" }}
                            >{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter") addTask(col.id); if (e.key==="Escape") { setAddingTo(null); setNewTitle(""); }}}
                      placeholder={isAr ? "عنوان المهمة..." : "Task title..."}
                      style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:"white", fontSize:"0.875rem", marginBottom:"10px" }}
                      autoFocus
                    />
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button onClick={() => addTask(col.id)}
                        style={{ flex:1, padding:"6px", borderRadius:"6px", background:"#F59E0B", color:"#0f172a", fontWeight:700, fontSize:"0.8rem", cursor:"pointer" }}>
                        {isAr ? "إضافة" : "Add"}
                      </button>
                      <button onClick={() => { setAddingTo(null); setNewTitle(""); }}
                        style={{ padding:"6px 10px", borderRadius:"6px", background:"rgba(148,163,184,0.1)", color:"rgba(255,255,255,0.5)", fontSize:"0.8rem", cursor:"pointer" }}>
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingTo(col.id); setTimeout(() => inputRef.current?.focus(), 50); }}
                    style={{ display:"flex", alignItems:"center", gap:"6px", width:"100%", padding:"8px 10px", borderRadius:"8px",
                      border:"1px dashed rgba(148,163,184,0.15)", color:"rgba(255,255,255,0.3)", fontSize:"0.8rem", cursor:"pointer",
                      background:"transparent", transition:"all 0.15s" }}
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

      {!useDB && (
        <p className="text-white/20 text-xs text-center mt-4">
          {isAr ? "💡 البيانات محفوظة محلياً" : "💡 Saved locally — run the SQL migration to sync across devices"}
        </p>
      )}
    </div>
  );
}
