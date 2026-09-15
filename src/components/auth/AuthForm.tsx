"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type AuthMode = "login" | "register" | "magic" | "forgot" | "reset";

const loginSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(6, "wrongPassword"),
});

const registerSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(6, "passwordMin"),
  full_name: z.string().min(1, "nameRequired"),
});

const magicSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
});

const forgotSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
});

const resetSchema = z.object({
  // Supabase mints an 8-digit recovery code, and the length is a project
  // setting — pinning this to exactly 6 made the code impossible to enter.
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6,10}$/, "invalidOrExpiredCode")),
  password: z.string().min(6, "passwordMin"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type MagicData = z.infer<typeof magicSchema>;
type ForgotData = z.infer<typeof forgotSchema>;
type ResetData = z.infer<typeof resetSchema>;

// Maps a raw Supabase Auth error to a translated, user-safe message.
// Supabase's own error text (e.g. "Invalid login credentials") is English-only
// and exposes internal wording we don't want surfaced verbatim.
function authErrorKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "wrongPassword";
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "emailAlreadyRegistered";
  }
  if (m.includes("token has expired") || m.includes("invalid") && m.includes("otp")) {
    return "invalidOrExpiredCode";
  }
  if (m.includes("rate limit") || m.includes("too many")) return "rateLimited";
  return "generic";
}

export function AuthForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Send people back where they were headed (e.g. the booking calendar they
  // clicked a time on) instead of dumping them on the dashboard.
  const redirectTo = (() => {
    const raw = searchParams.get("redirect");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  })();
  const [mode, setMode] = useState<AuthMode>("login");
  // Until React has hydrated, submitting posts the form the browser-native way —
  // which sends the password up in the query string. Hold the button until the
  // client-side handler is actually attached.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  const supabase = createClient();

  // Translates a form field's zod error key ("emailRequired", "passwordMin", ...)
  // into display text. Field errors are keys, not messages — see zod schemas above.
  const fieldError = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const magicForm = useForm<MagicData>({
    resolver: zodResolver(magicSchema),
  });

  const forgotForm = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
  });

  const resetForm = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  });

  function switchMode(m: AuthMode) {
    setMode(m);
    setError(null);
    setMessage(null);
  }

  async function handleLogin(data: LoginData) {
    setLoading(true);
    setError(null);
    const { data: authData, error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      setError(t(`errors.${authErrorKey(error.message)}`));
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      const dest =
        redirectTo ??
        (profile?.role === "admin" ? `/${locale}/admin` : `/${locale}/dashboard`);
      router.push(dest);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRegister(data: RegisterData) {
    setLoading(true);
    setError(null);

    // Check first, before ever calling signUp(). If this email belongs to an
    // unconfirmed account, signUp() itself would silently delete that account
    // and create a fresh one in its place (a real Supabase Auth behavior) —
    // wiping the person's profile and progress. Blocking here is what
    // prevents that.
    const checkRes = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    const checkResult = await checkRes.json().catch(() => ({ exists: false }));
    if (checkResult.exists) {
      setError(t("errors.emailAlreadyRegistered"));
      setLoading(false);
      return;
    }

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
      setError(t(`errors.${authErrorKey(error.message)}`));
    } else if (authData.session) {
      // Email confirmations disabled — session is already active, go straight in.
      router.push(redirectTo ?? `/${locale}/dashboard`);
      router.refresh();
    } else if (authData.user?.identities?.length === 0) {
      // Supabase returns a fake "success" (no error, no session) when the email
      // already belongs to a confirmed account, to avoid leaking which emails
      // are registered. Detect it via the empty identities array and tell the
      // person honestly instead of pretending we sent them an activation email.
      setError(t("errors.emailAlreadyRegistered"));
    } else {
      setMessage(t("accountCreatedCheckEmail"));
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
      setError(t(`errors.${authErrorKey(error.message)}`));
    } else {
      setMessage(t("magicLinkSent"));
    }
    setLoading(false);
  }

  async function handleForgotPassword(data: ForgotData) {
    setLoading(true);
    setError(null);
    // Not supabase.auth.resetPasswordForEmail: that goes through Supabase's
    // shared mailer, which rate-limits to a few messages an hour and was
    // failing with a 429 the client only ever saw as "something went wrong".
    try {
      const res = await fetch("/api/auth/reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (res.status === 429) {
        setError(t("errors.rateLimited"));
      } else if (res.status === 502) {
        // The code was minted but no mail could be delivered — telling them to
        // "try again" would loop them forever, so hand them a person instead.
        setError(t("errors.resetSendFailed"));
      } else if (!res.ok) {
        setError(t("errors.generic"));
      } else {
        setResetEmail(data.email);
        setMessage(t("resetCodeSent"));
        setMode("reset");
      }
    } catch {
      setError(t("errors.generic"));
    }
    setLoading(false);
  }

  async function handleResetPassword(data: ResetData) {
    if (!resetEmail) return;
    setLoading(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: data.code,
      type: "recovery",
    });
    if (verifyError) {
      setError(t(`errors.${authErrorKey(verifyError.message)}`));
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (updateError) {
      setError(t(`errors.${authErrorKey(updateError.message)}`));
      setLoading(false);
      return;
    }
    setMessage(t("passwordUpdated"));
    router.push(redirectTo ?? `/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <div className="w-full" style={{ maxWidth: "440px" }}>
      {/* Logo + title */}
      <div className="text-center mb-8">
        <img src="/logo.svg" alt="البوصلة" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-black text-white">البوصلة</h1>
        <p className="text-white/70 text-sm mt-1.5">منصة التطوير الشخصي والمهني</p>
      </div>

      {/* Card */}
      <div style={{ background: "rgba(15,23,42,0.75)", border: "1px solid rgba(245,158,11,0.18)", backdropFilter: "blur(20px)", borderRadius: "10px", padding: "2rem" }}>

      {/* Mode tabs */}
      {(mode === "login" || mode === "register" || mode === "magic") && (
        <div className="flex mb-6" style={{ border: "1px solid rgba(245,158,11,0.15)", borderRadius: "6px", padding: "4px", background: "rgba(15,23,42,0.5)" }}>
          {(["login", "register", "magic"] as AuthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 text-[0.95rem] font-bold transition-all ${
                mode === m
                  ? "bg-[#F59E0B] text-[#0f172a]"
                  : "text-white/65 hover:text-white"
              }`}
              style={{ borderRadius: "4px" }}
            >
              {m === "login" ? t("login") : m === "register" ? t("register") : t("magicLink")}
            </button>
          ))}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.25)] rounded-lg text-green-400 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-[rgba(220,38,38,0.12)] border border-[rgba(220,38,38,0.25)] rounded-lg text-red-400 text-sm">
          {error}
          {/* The message tells them to recover the password — give them the
              button rather than making them find it. */}
          {error === t("errors.emailAlreadyRegistered") && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F59E0B] text-[#0f172a] hover:brightness-110 transition"
              >
                {t("forgotPassword")}
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 border border-white/15 hover:text-white hover:border-white/30 transition"
              >
                {t("login")}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "login" && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
          <Input
            label={t("email")}
            type="email"
            error={fieldError(loginForm.formState.errors.email?.message)}
            {...loginForm.register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            error={fieldError(loginForm.formState.errors.password?.message)}
            {...loginForm.register("password")}
          />
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="text-xs text-white/40 hover:text-[#F59E0B] transition-colors"
          >
            {t("forgotPassword")}
          </button>
          <Button type="submit" loading={loading} disabled={!ready} className="w-full" size="lg">
            {t("login")}
          </Button>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
          <Input
            label={t("fullName")}
            error={fieldError(registerForm.formState.errors.full_name?.message)}
            {...registerForm.register("full_name")}
          />
          <Input
            label={t("email")}
            type="email"
            error={fieldError(registerForm.formState.errors.email?.message)}
            {...registerForm.register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            error={fieldError(registerForm.formState.errors.password?.message)}
            {...registerForm.register("password")}
          />
          <Button type="submit" loading={loading} disabled={!ready} className="w-full" size="lg">
            {t("register")}
          </Button>
        </form>
      )}

      {mode === "magic" && (
        <form onSubmit={magicForm.handleSubmit(handleMagicLink)} className="space-y-4">
          <Input
            label={t("email")}
            type="email"
            error={fieldError(magicForm.formState.errors.email?.message)}
            {...magicForm.register("email")}
          />
          <Button type="submit" loading={loading} disabled={!ready} className="w-full" size="lg">
            {t("sendMagicLink")}
          </Button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
          <p className="text-white/75 text-[0.95rem] leading-relaxed">{t("forgotPasswordPrompt")}</p>
          <Input
            label={t("email")}
            type="email"
            error={fieldError(forgotForm.formState.errors.email?.message)}
            {...forgotForm.register("email")}
          />
          <Button type="submit" loading={loading} disabled={!ready} className="w-full" size="lg">
            {t("sendResetCode")}
          </Button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="text-xs text-white/40 hover:text-[#F59E0B] transition-colors block mx-auto"
          >
            {t("backToLogin")}
          </button>
        </form>
      )}

      {mode === "reset" && (
        <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
          <Input
            label={t("resetCode")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            error={fieldError(resetForm.formState.errors.code?.message)}
            {...resetForm.register("code")}
          />
          <Input
            label={t("newPassword")}
            type="password"
            error={fieldError(resetForm.formState.errors.password?.message)}
            {...resetForm.register("password")}
          />
          <Button type="submit" loading={loading} disabled={!ready} className="w-full" size="lg">
            {t("resetPassword")}
          </Button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="text-xs text-white/40 hover:text-[#F59E0B] transition-colors block mx-auto"
          >
            {t("backToLogin")}
          </button>
        </form>
      )}

      </div>{/* end card */}
    </div>
  );
}

export default AuthForm;
