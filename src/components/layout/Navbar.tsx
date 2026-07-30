"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Menu, X, Globe, User, LogOut, LayoutDashboard, ShieldCheck, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/index";

interface NavbarProps {
  user: Profile | null;
}

export function Navbar({ user }: NavbarProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  const otherLocale = locale === "ar" ? "en" : "ar";

  /* ── Scroll detection ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Close user menu on outside click ── */
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* ── Lock body scroll when mobile menu open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function switchLocale() {
    const path = window.location.pathname;
    const newPath = path.replace(`/${locale}`, `/${otherLocale}`);
    router.push(newPath);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/workshops`, label: t("workshops") },
    { href: `/${locale}/vlogs`, label: t("vlogs") },
  ];

  const isActive = (href: string) => pathname === href;

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")
    : "U";

  return (
    <>
      <nav
        className={`
          sticky top-0 z-50 transition-all duration-300
          ${scrolled
            ? "bg-[#0f172a]/80 backdrop-blur-xl border-b border-[rgba(245,158,11,0.12)] shadow-[0_2px_32px_rgba(0,0,0,0.4)]"
            : "bg-transparent border-b border-transparent"
          }
        `}
      >
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 1.5rem" }}>
          {/* 3-column grid: logo | tabs | actions — true centering */}
          <div className="hidden md:grid items-center h-16" style={{ gridTemplateColumns: "1fr auto 1fr" }}>

            {/* ── Logo — LEFT ── */}
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 group justify-self-start"
              aria-label="البوصلة"
            >
              <img
                src="/logo.svg"
                alt="البوصلة"
                className="h-11 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </Link>

            {/* ── Desktop nav links — CENTER ── */}
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link relative px-2 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActive(link.href) ? "text-white" : "text-white/65 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#F59E0B]" />
                  )}
                </Link>
              ))}
            </div>

            {/* ── Right actions — RIGHT ── */}
            <div className="flex items-center gap-3 justify-self-end">
              {/* Language pill */}
              <button
                onClick={switchLocale}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-bold border border-[rgba(245,158,11,0.35)] text-[#F59E0B] hover:bg-[#F59E0B] hover:text-[#0f172a] transition-all duration-200 whitespace-nowrap"
                style={{ borderRadius: "6px", padding: "9px 14px" }}
                aria-label="Switch language"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{otherLocale === "en" ? "EN" : "ع"}</span>
              </button>

              {user ? (
                /* ── User dropdown ── */
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="
                      flex items-center gap-2 px-3 py-1.5 rounded-xl
                      border border-[rgba(245,158,11,0.25)] hover:border-[rgba(245,158,11,0.6)]
                      bg-[rgba(15,23,42,0.6)] hover:bg-[rgba(15,23,42,0.8)]
                      transition-all duration-200 group
                    "
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name ?? "User"}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#d97706] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-white max-w-[100px] truncate">
                      {user.full_name?.split(" ")[0]}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-[#F59E0B] transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div
                      className="
                        absolute end-0 mt-2 w-52
                        rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                        border border-[rgba(245,158,11,0.18)]
                        overflow-hidden
                        animate-fade-in-up
                        z-50
                      "
                      style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(16px)" }}
                    >
                      {/* User info header */}
                      <div
                        className="px-4 py-3 border-b border-[rgba(245,158,11,0.12)]"
                        style={{ background: "rgba(245,158,11,0.06)" }}
                      >
                        <div className="text-sm font-bold text-white">{user.full_name}</div>
                        <div className="text-xs text-white/50 truncate">{user.email}</div>
                      </div>

                      <div className="py-1.5">
                        <Link
                          href={`/${locale}/dashboard`}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[rgba(245,158,11,0.08)] transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4 text-[#F59E0B]" />
                          {t("dashboard")}
                        </Link>

                        {user.role === "admin" && (
                          <Link
                            href={`/${locale}/admin`}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-[rgba(245,158,11,0.08)] transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                            {t("admin")}
                          </Link>
                        )}

                        <div className="my-1 mx-3 h-px bg-[rgba(245,158,11,0.12)]" />

                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          {t("logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/${locale}/auth`}
                  className="inline-flex items-center justify-center text-sm font-bold bg-[#F59E0B] text-[#0f172a] hover:bg-[#FBBF24] transition-colors shadow-[0_2px_12px_rgba(245,158,11,0.30)] whitespace-nowrap"
                  style={{ borderRadius: "6px", padding: "9px 22px" }}
                >
                  {t("login")}
                </Link>
              )}
            </div>
          </div>

          {/* ── Mobile header row (visible only on mobile) ── */}
          <div className="md:hidden flex items-center justify-between h-16">
            <Link href={`/${locale}`} aria-label="البوصلة">
              <img src="/logo.svg" alt="البوصلة" className="h-10 w-auto" />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-[#F59E0B] hover:bg-[rgba(245,158,11,0.1)] transition-colors"
              style={{ borderRadius: "6px" }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile full-screen menu ── */}
      <div
        className={`
          fixed inset-0 z-40 md:hidden
          transition-all duration-300 ease-in-out
          ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-in panel */}
        <div
          className={`
            absolute inset-y-0 end-0 w-80 max-w-[90vw]
            bg-[#0f172a] shadow-2xl
            border-s border-[rgba(245,158,11,0.15)]
            transition-transform duration-300 ease-in-out
          `}
          style={{
            transform: mobileOpen
              ? "translateX(0)"
              : locale === "ar" ? "translateX(-100%)" : "translateX(100%)"
          }}
        >
          {/* Header at top */}
          <div
            className="h-40 relative flex flex-col justify-end p-5"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(15,23,42,0.95) 100%)",
              borderBottom: "1px solid rgba(245,158,11,0.15)"
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 end-4 p-1.5 rounded-full bg-[rgba(245,158,11,0.1)] text-[#F59E0B] hover:bg-[rgba(245,158,11,0.2)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img src="/logo.svg" alt="البوصلة" className="h-10 w-auto mb-2" />
          </div>

          <div className="p-5 overflow-y-auto h-[calc(100vh-10rem)]">
            {/* Nav links */}
            <nav className="space-y-1 mb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors
                    ${isActive(link.href)
                      ? "bg-[rgba(245,158,11,0.1)] text-white border border-[rgba(245,158,11,0.25)]"
                      : "text-white/70 hover:bg-[rgba(245,158,11,0.06)] hover:text-white"
                    }
                  `}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="ms-auto w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  )}
                </Link>
              ))}
            </nav>

            <div className="h-px bg-[rgba(245,158,11,0.12)] mb-6" />

            {/* User section */}
            {user ? (
              <div className="space-y-1">
                {/* User info */}
                <div
                  className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border border-[rgba(245,158,11,0.15)]"
                  style={{ background: "rgba(245,158,11,0.06)" }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#d97706] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">{user.full_name}</div>
                    <div className="text-xs text-white/50 truncate">{user.email}</div>
                  </div>
                </div>

                <Link
                  href={`/${locale}/dashboard`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-[rgba(245,158,11,0.08)] hover:text-white transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#F59E0B]" />
                  {t("dashboard")}
                </Link>

                {user.role === "admin" && (
                  <Link
                    href={`/${locale}/admin`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-[rgba(245,158,11,0.08)] hover:text-white transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                    {t("admin")}
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </div>
            ) : (
              <Link
                href={`/${locale}/auth`}
                onClick={() => setMobileOpen(false)}
                className="
                  flex items-center justify-center gap-2 w-full rounded-md
                  bg-[#F59E0B] text-[#0f172a] font-bold text-sm
                  hover:bg-[#FBBF24] transition-colors
                  shadow-[0_2px_16px_rgba(245,158,11,0.35)]
                "
                style={{ padding: "12px 16px" }}
              >
                {t("login")}
              </Link>
            )}

            <div className="h-px bg-[rgba(245,158,11,0.12)] my-5" />

            {/* Language toggle */}
            <button
              onClick={() => { switchLocale(); setMobileOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 w-full rounded-xl text-sm font-medium text-white/70 hover:bg-[rgba(245,158,11,0.08)] hover:text-white transition-colors"
            >
              <Globe className="h-4 w-4 text-[#F59E0B]" />
              <span>{otherLocale === "en" ? "Switch to English" : "التبديل للعربية"}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
