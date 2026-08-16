"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type AuthMode = "login" | "register" | "magic";

const loginSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(6, "passwordMin"),
});

const registerSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(6, "passwordMin"),
  full_name: z.string().min(1, "nameRequired"),
});

const magicSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type MagicData = z.infer<typeof magicSchema>;

export function AuthForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const magicForm = useForm<MagicData>({
    resolver: zodResolver(magicSchema),
  });

  async function handleLogin(data: LoginData) {
    setLoading(true);
    setError(null);
    const { data: authData, error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      setError(error.message);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      const dest = profile?.role === "admin" ? `/${locale}/admin` : `/${locale}/dashboard`;
      router.push(dest);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRegister(data: RegisterData) {
    setLoading(true);
    setError(null);
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        // Where the activation link lands after the user confirms their email.
        emailRedirectTo: `${window.location.origin}/${locale}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
    } else if (authData.session) {
      // Email confirmations disabled — session is already active, go straight in.
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } else {
      setMessage("تم إنشاء حسابك في البوصلة 🧭 — بعتنالك إيميل التفعيل، افتحه واضغط \"تفعيل الحساب\" عشان تبدأ رحلتك.");
    }
    setLoading(false);
  }

  async function handleMagicLink(data: MagicData) {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage(t("magicLinkSent"));
    }
    setLoading(false);
  }

  return (
    <div className="w-full" style={{ maxWidth: "440px" }}>
      {/* Logo + title */}
      <div className="text-center mb-8">
        <img src="/logo.svg" alt="البوصلة" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-xl font-black text-white">البوصلة</h1>
        <p className="text-white/40 text-xs mt-1">منصة التطوير الشخصي والمهني</p>
      </div>

      {/* Card */}
      <div style={{ background: "rgba(15,23,42,0.75)", border: "1px solid rgba(245,158,11,0.18)", backdropFilter: "blur(20px)", borderRadius: "10px", padding: "2rem" }}>

      {/* Mode tabs */}
      <div className="flex mb-6" style={{ border: "1px solid rgba(245,158,11,0.15)", borderRadius: "6px", padding: "4px", background: "rgba(15,23,42,0.5)" }}>
        {(["login", "register", "magic"] as AuthMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold transition-all ${
              mode === m
                ? "bg-[#F59E0B] text-[#0f172a] font-bold"
                : "text-white/40 hover:text-white/70"
            }`}
            style={{ borderRadius: "4px" }}
          >
            {m === "login" ? t("login") : m === "register" ? t("register") : t("magicLink")}
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-4 p-3 bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.25)] rounded-lg text-green-400 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-[rgba(220,38,38,0.12)] border border-[rgba(220,38,38,0.25)] rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {mode === "login" && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
          <Input
            label={t("email")}
            type="email"
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register("password")}
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            {t("login")}
          </Button>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
          <Input
            label={t("fullName")}
            error={registerForm.formState.errors.full_name?.message}
            {...registerForm.register("full_name")}
          />
          <Input
            label={t("email")}
            type="email"
            error={registerForm.formState.errors.email?.message}
            {...registerForm.register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            error={registerForm.formState.errors.password?.message}
            {...registerForm.register("password")}
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            {t("register")}
          </Button>
        </form>
      )}

      {mode === "magic" && (
        <form onSubmit={magicForm.handleSubmit(handleMagicLink)} className="space-y-4">
          <Input
            label={t("email")}
            type="email"
            error={magicForm.formState.errors.email?.message}
            {...magicForm.register("email")}
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            {t("sendMagicLink")}
          </Button>
        </form>
      )}

      </div>{/* end card */}
    </div>
  );
}

export default AuthForm;
