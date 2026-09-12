"use client";

import { MessageSquare } from "lucide-react";

interface ClientNotesDisplayProps {
  clientNotes?: string | null;
  locale?: "ar" | "en";
}

export default function ClientNotesDisplay({
  clientNotes,
  locale = "en",
}: ClientNotesDisplayProps) {
  const isAr = locale === "ar";

  if (!clientNotes) {
    return null;
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-300 mb-1">
            {isAr ? "ملاحظات العميل" : "Client Notes"}
          </p>
          <p className="text-xs text-blue-100 whitespace-pre-wrap break-words">
            {clientNotes}
          </p>
        </div>
      </div>
    </div>
  );
}
