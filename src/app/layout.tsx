import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "البوصلة | Al-Bosla",
  description: "منصة تدريب وتطوير ذاتي | Coaching & Self-Development Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-[#F9F7F4]"
      >
        {children}
      </body>
    </html>
  );
}
