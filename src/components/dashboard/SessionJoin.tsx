"use client";

import { useEffect, useState } from "react";
import { Video, ArrowRight } from "lucide-react";
import { joinState, meetingLink, linkAppearsNote, type JoinState } from "@/lib/meeting";

interface Props {
  startsAt: string;
  bookingLink?: string | null;
  locale: string;
}

/**
 * The join door for one confirmed booking.
 *
 * Re-evaluates on a timer so a client already sitting on the page sees the
 * button appear at the right minute instead of having to reload.
 */
export default function SessionJoin({ startsAt, bookingLink, locale }: Props) {
  const isAr = locale === "ar";
  const [state, setState] = useState<JoinState>(() => joinState(startsAt));

  useEffect(() => {
    const id = setInterval(() => setState(joinState(startsAt)), 20_000);
    return () => clearInterval(id);
  }, [startsAt]);

  if (state === "over") return null;

  if (state === "open") {
    return (
      <a
        href={meetingLink(bookingLink)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 16px", borderRadius: "10px",
          background: "#22C55E", textDecoration: "none", marginBottom: "12px",
        }}
        className="hover:brightness-110 transition"
      >
        <Video className="h-5 w-5" style={{ color: "#0f172a", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 900 }}>
            {isAr ? "ادخل الجلسة دلوقتي" : "Join your session now"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "rgba(15,23,42,0.75)", marginTop: "1px" }}>
            {isAr ? "المنتور مستنيك 👋" : "Your mentor is waiting 👋"}
          </p>
        </div>
        <ArrowRight
          className="h-4 w-4"
          style={{ color: "#0f172a", flexShrink: 0, transform: isAr ? "rotate(180deg)" : undefined }}
        />
      </a>
    );
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "12px 14px", borderRadius: "8px",
        background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.28)",
        marginBottom: "12px",
      }}
    >
      <Video className="h-4 w-4 text-blue-400" style={{ flexShrink: 0, marginTop: "2px" }} />
      <p style={{ fontSize: "0.8rem", color: "#BFDBFE", lineHeight: 1.6 }}>{linkAppearsNote(isAr)}</p>
    </div>
  );
}
