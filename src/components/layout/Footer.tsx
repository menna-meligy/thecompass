"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Mail, Phone, Send, Share2, MessageCircle, Play, Rss } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const locale = useLocale();
  const year = new Date().getFullYear();
  const isRtl = locale === "ar";

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) { setSubscribed(true); setEmail(""); }
  }

  const links = [
    { href: `/${locale}`,           label: nav("home") },
    { href: `/${locale}/workshops`, label: nav("workshops") },
    { href: `/${locale}/vlogs`,     label: nav("vlogs") },
    { href: `/${locale}/auth`,      label: nav("login") },
  ];

  const socials = [
    { Icon: MessageCircle, href: "#", label: "Instagram" },
    { Icon: Share2,        href: "#", label: "Twitter/X" },
    { Icon: Play,          href: "#", label: "YouTube" },
    { Icon: Rss,           href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="relative overflow-hidden" style={{ background: "#080f1d" }}>

      {/* ── Top gold accent line ── */}
      <div style={{ height: "1px", background: "linear-gradient(to right, transparent, #F59E0B, transparent)", opacity: 0.5 }} />

      {/* ── Compass watermark (background) ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none select-none"
        style={{ opacity: 0.03 }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="compass-fp" x="0" y="0" width="260" height="260" patternUnits="userSpaceOnUse">
              <circle cx="130" cy="130" r="120" stroke="#F59E0B" strokeWidth="1" fill="none" />
              <circle cx="130" cy="130" r="88"  stroke="#F59E0B" strokeWidth="0.6" fill="none" />
              <circle cx="130" cy="130" r="55"  stroke="#F59E0B" strokeWidth="0.4" fill="none" />
              <polygon points="130,8 138,118 130,130 122,118"  fill="#F59E0B" />
              <polygon points="130,252 138,142 130,130 122,142" fill="#F59E0B" opacity="0.6" />
              <polygon points="8,130 118,122 130,130 118,138"  fill="#F59E0B" opacity="0.6" />
              <polygon points="252,130 142,122 130,130 142,138" fill="#F59E0B" />
              <circle cx="130" cy="130" r="5" fill="#F59E0B" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#compass-fp)" />
        </svg>
      </div>

      {/* ── Star dots ── */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[12%] left-[8%]  w-0.5 h-0.5 rounded-full bg-white/30" />
        <div className="absolute top-[22%] left-[30%] w-1   h-1   rounded-full bg-[#F59E0B]/40" />
        <div className="absolute top-[8%]  left-[60%] w-0.5 h-0.5 rounded-full bg-white/25" />
        <div className="absolute top-[30%] left-[82%] w-1   h-1   rounded-full bg-white/20" />
        <div className="absolute top-[65%] left-[15%] w-0.5 h-0.5 rounded-full bg-[#F59E0B]/30" />
        <div className="absolute top-[75%] left-[70%] w-0.5 h-0.5 rounded-full bg-white/20" />
        <div className="absolute top-[90%] left-[45%] w-1   h-1   rounded-full bg-[#F59E0B]/25" />
      </div>

      {/* ── Main grid ── */}
      <div className="relative" style={{ maxWidth: "80rem", margin: "0 auto", padding: "4rem 1.5rem 2rem" }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand column — spans 5 cols */}
          <div className="md:col-span-5">
            {/* Logo + name */}
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo.svg" alt="البوصلة" className="h-11 w-auto" loading="lazy" />
              <div>
                <div className="text-white font-black text-lg leading-none">
                  {isRtl ? "البوصلة" : "The Compass"}
                </div>
                <div className="text-[#F59E0B]/60 text-xs mt-0.5">
                  {isRtl ? "دليلك نحو أهدافك" : "Your compass to your goals"}
                </div>
              </div>
            </div>

            {/* Gold divider */}
            <div style={{ width: "40px", height: "2px", background: "#F59E0B", opacity: 0.5, marginBottom: "1.25rem" }} />

            <p className="text-white/45 text-sm leading-relaxed mb-7" style={{ maxWidth: "22rem" }}>
              {t("tagline")}
            </p>

            {/* Social icons */}
            <div className="flex gap-2.5">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-[#F59E0B] transition-all duration-200 hover:-translate-y-0.5"
                  style={{ border: "1px solid rgba(245,158,11,0.12)", borderRadius: "6px" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.45)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.12)")}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links — spans 3 cols */}
          <div className="md:col-span-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F59E0B]/50 mb-5">
              {t("links")}
            </h4>
            <ul className="space-y-3">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/45 hover:text-white transition-colors duration-150 flex items-center gap-2 group"
                  >
                    <div
                      className="w-1 h-1 rounded-full flex-shrink-0 transition-colors duration-150 group-hover:bg-[#F59E0B]"
                      style={{ background: "rgba(245,158,11,0.3)" }}
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + newsletter — spans 4 cols */}
          <div className="md:col-span-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F59E0B]/50 mb-5">
              {t("contact")}
            </h4>

            <ul className="space-y-3 mb-7">
              <li>
                <a
                  href="mailto:thecompass555@gmail.com"
                  className="flex items-center gap-3 text-sm text-white/45 hover:text-white transition-colors group"
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-colors duration-150"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "6px" }}
                  >
                    <Mail className="h-3.5 w-3.5 text-[#F59E0B]/60" />
                  </div>
                  thecompass555@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+201027857707"
                  className="flex items-center gap-3 text-sm text-white/45 hover:text-white transition-colors group"
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-colors duration-150"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "6px" }}
                  >
                    <Phone className="h-3.5 w-3.5 text-[#F59E0B]/60" />
                  </div>
                  01027857707
                </a>
              </li>
            </ul>

            {/* Newsletter */}
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F59E0B]/50 mb-3">
              {isRtl ? "النشرة البريدية" : "Newsletter"}
            </h5>
            {subscribed ? (
              <div className="flex items-center gap-2 text-[#F59E0B] text-sm font-semibold">
                <span>✓</span>
                <span>{isRtl ? "شكراً على اشتراكك!" : "Thanks for subscribing!"}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRtl ? "بريدك الإلكتروني" : "Your email"}
                  required
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    borderRadius: "4px",
                    color: "white",
                    fontSize: "0.8rem",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(245,158,11,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(245,158,11,0.15)")}
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  style={{
                    width: "36px",
                    height: "36px",
                    flexShrink: 0,
                    background: "#F59E0B",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FBBF24")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#F59E0B")}
                >
                  <Send className={`h-3.5 w-3.5 text-[#0f172a] ${isRtl ? "rotate-180" : ""}`} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="mt-12 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(245,158,11,0.10)" }}
        >
          <p className="text-white/25 text-xs">
            © {year} {isRtl ? "البوصلة" : "The Compass"} · {t("rights")}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-white/25">
            <Link href={`/${locale}/privacy`} className="hover:text-white/60 transition-colors">
              {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <span style={{ opacity: 0.3 }}>·</span>
            <Link href={`/${locale}/terms`} className="hover:text-white/60 transition-colors">
              {isRtl ? "شروط الاستخدام" : "Terms of Use"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
