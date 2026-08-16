"use client";

import { useState } from "react";
import { BookOpen, User } from "lucide-react";

interface SessionTabsProps {
  workshopContent: React.ReactNode;
  individualContent: React.ReactNode;
  isArabic?: boolean;
}

export default function SessionTabs({
  workshopContent,
  individualContent,
  isArabic = false,
}: SessionTabsProps) {
  const [activeTab, setActiveTab] = useState<"workshop" | "individual">("workshop");

  const tabs = [
    {
      id: "workshop",
      label: isArabic ? "الورش" : "Workshops",
      icon: BookOpen,
      content: workshopContent,
    },
    {
      id: "individual",
      label: isArabic ? "جلسات فردية" : "Individual Sessions",
      icon: User,
      content: individualContent,
    },
  ];

  return (
    <div style={{ background: "#0f172a", borderRadius: "12px", overflow: "hidden" }}>
      {/* Tab buttons */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(245,158,11,0.2)",
          background: "rgba(15,23,42,0.8)",
        }}
        dir={isArabic ? "rtl" : "ltr"}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === (tab.id as "workshop" | "individual");

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "workshop" | "individual")}
              style={{
                flex: 1,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: isActive ? "rgba(245,158,11,0.1)" : "transparent",
                border: "none",
                color: isActive ? "#F59E0B" : "rgba(255,255,255,0.5)",
                fontWeight: isActive ? "700" : "600",
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s",
                borderBottom: isActive ? "2px solid #F59E0B" : "2px solid transparent",
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: "24px" }}>{tabs.find((t) => t.id === activeTab)?.content}</div>
    </div>
  );
}
