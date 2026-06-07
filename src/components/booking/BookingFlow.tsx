"use client";

import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Copy, ExternalLink, Upload, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PHONE = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01093036736";
const CALENDLY_GENERAL = process.env.NEXT_PUBLIC_CALENDLY_GENERAL || "https://calendly.com/thecompass555";
const CALENDLY_WORKSHOP = process.env.NEXT_PUBLIC_CALENDLY_WORKSHOP || "https://calendly.com/thecompass555";

type Step = "payment" | "proof" | "calendly";

interface Props {
  sessionId: string;
  workshopTitle: string;
  price: number;
  isGeneralSession?: boolean;
  userId: string;
}

export default function BookingFlow({ sessionId, workshopTitle, price, isGeneralSession = false, userId }: Props) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [step, setStep] = useState<Step>("payment");
  const [selectedMethod, setSelectedMethod] = useState<"instapay" | "vodafone_cash" | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingCreated, setBookingCreated] = useState(false);

  // Proof step
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // ── Step indicators ──────────────────────────────────────
  const STEPS = [
    { id: "payment", label: isAr ? t("stepPayment") : t("stepPayment"), num: 1 },
    { id: "proof",   label: isAr ? t("stepProof")   : t("stepProof"),   num: 2 },
    { id: "calendly",label: isAr ? t("stepCalendly"): t("stepCalendly"), num: 3 },
  ] as const;

  function StepBar() {
    const stepIdx = step === "payment" ? 0 : step === "proof" ? 1 : 2;
    return (
      <div className="flex items-center justify-center mb-10" dir={isAr ? "rtl" : "ltr"}>
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div style={{
                width:"36px", height:"36px", borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:"0.85rem",
                background: i < stepIdx ? "#22C55E" : i === stepIdx ? "#F59E0B" : "rgba(148,163,184,0.10)",
                color: i <= stepIdx ? "#0f172a" : "rgba(255,255,255,0.25)",
                border: i === stepIdx ? "2px solid #F59E0B" : "none",
                boxShadow: i === stepIdx ? "0 0 12px rgba(245,158,11,0.4)" : "none",
              }}>
                {i < stepIdx ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span style={{ fontSize:"0.65rem", fontWeight:600, color: i === stepIdx ? "#F59E0B" : "rgba(255,255,255,0.25)", whiteSpace:"nowrap" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width:"40px", height:"2px", margin:"0 4px", marginBottom:"18px",
                background: i < stepIdx ? "#22C55E" : "rgba(148,163,184,0.12)" }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Copy number ──────────────────────────────────────────
  function copyNumber() {
    navigator.clipboard.writeText(PHONE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Create booking record ────────────────────────────────
  async function createBooking() {
    if (!selectedMethod) return;
    setUploading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          payment_method: selectedMethod,
          amount: price,
        }),
      });
      const data = await res.json();
      if (data.booking_id) {
        setBookingId(data.booking_id);
        setBookingCreated(true);
        setStep("proof");
      }
    } finally {
      setUploading(false);
    }
  }

  // ── File pick + verify ───────────────────────────────────
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
    setVerifyStatus("idle");
  }

  async function verifyAndUpload() {
    if (!proofFile || !bookingId) return;
    setVerifying(true);
    setVerifyStatus("idle");

    try {
      // Upload to Supabase storage
      const path = `payments/${bookingId}-${Date.now()}.${proofFile.name.split(".").pop()}`;
      const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      // Call OCR API route
      const form = new FormData();
      form.append("file", proofFile);
      form.append("phone", PHONE);
      form.append("booking_id", bookingId);
      form.append("proof_url", publicUrl);

      const res = await fetch("/api/payments/verify-screenshot", { method: "POST", body: form });
      const result = await res.json();

      if (result.verified) {
        setVerifyStatus("ok");
        // update booking with proof
        await supabase.from("payments").update({ proof_url: publicUrl }).eq("booking_id", bookingId);
        setTimeout(() => setStep("calendly"), 1500);
      } else {
        setVerifyStatus("fail");
      }
    } catch {
      setVerifyStatus("fail");
    } finally {
      setVerifying(false);
    }
  }

  // ── PAYMENT STEP ─────────────────────────────────────────
  if (step === "payment") {
    return (
      <div>
        <StepBar />

        <div style={{ background:"rgba(30,41,59,0.5)", border:"1px solid rgba(245,158,11,0.12)", borderRadius:"10px", padding:"20px", marginBottom:"20px" }}>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>
            {isAr ? "المبلغ المطلوب" : "Amount Due"}
          </p>
          <p style={{ color:"#F59E0B", fontWeight:900, fontSize:"1.8rem" }}>
            {price === 0 ? (isAr ? "مجاني" : "Free") : `${price.toLocaleString()} ${isAr ? "جنيه" : "EGP"}`}
          </p>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:"0.8rem", marginTop:"2px" }}>{workshopTitle}</p>
        </div>

        {/* Payment methods */}
        <div className="space-y-3 mb-6">
          {(["instapay", "vodafone_cash"] as const).map((method) => {
            const isSelected = selectedMethod === method;
            const isInstapay = method === "instapay";
            const appUrl = isInstapay
              ? `https://instapay.com.eg`
              : `https://vodafone.com.eg/ar/Pages/VFCash.aspx`;
            const label = isInstapay ? (isAr ? "إنستاباي" : "InstaPay") : (isAr ? "فودافون كاش" : "Vodafone Cash");
            const icon = isInstapay ? "💳" : "📱";

            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:"14px",
                  padding:"16px", borderRadius:"8px", cursor:"pointer", textAlign:"start",
                  background: isSelected ? "rgba(245,158,11,0.10)" : "rgba(15,23,42,0.6)",
                  border: `1.5px solid ${isSelected ? "#F59E0B" : "rgba(245,158,11,0.15)"}`,
                  transition:"all 0.15s",
                }}
              >
                <div style={{ fontSize:"1.5rem", width:"40px", height:"40px", borderRadius:"8px", background:"rgba(245,158,11,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color: isSelected ? "#F59E0B" : "rgba(255,255,255,0.85)", fontSize:"0.9rem" }}>{label}</div>
                  <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.35)", fontFamily:"monospace", marginTop:"2px" }}>{PHONE}</div>
                </div>
                <div style={{ width:"20px", height:"20px", borderRadius:"50%", border:`2px solid ${isSelected ? "#F59E0B" : "rgba(148,163,184,0.25)"}`, background: isSelected ? "#F59E0B" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {isSelected && <Check className="h-3 w-3 text-[#0f172a]" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* When method selected: show number + open app */}
        {selectedMethod && (
          <div style={{ padding:"18px", borderRadius:"10px", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.20)", marginBottom:"20px" }}>
            <p style={{ color:"rgba(255,255,255,0.55)", fontSize:"0.8rem", marginBottom:"10px" }}>
              {isAr ? "رقم التحويل:" : "Transfer to:"}
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
              <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:"1.4rem", color:"#F59E0B", letterSpacing:"0.05em" }}>{PHONE}</span>
              <button onClick={copyNumber} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"6px 10px", borderRadius:"6px", background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"#F59E0B", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("copied") : t("copyNumber")}
              </button>
            </div>
            <a
              href={selectedMethod === "instapay" ? "https://instapay.com.eg" : "https://vodafone.com.eg/ar/Pages/VFCash.aspx"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"10px 18px", borderRadius:"6px", background:"#F59E0B", color:"#0f172a", fontWeight:800, fontSize:"0.85rem", textDecoration:"none" }}
            >
              <ExternalLink className="h-4 w-4" />
              {t("openApp")} {selectedMethod === "instapay" ? "InstaPay" : "Vodafone Cash"}
            </a>
          </div>
        )}

        <button
          onClick={createBooking}
          disabled={!selectedMethod || uploading}
          style={{
            width:"100%", padding:"14px", borderRadius:"8px",
            background: selectedMethod && !uploading ? "#F59E0B" : "rgba(148,163,184,0.15)",
            color: selectedMethod && !uploading ? "#0f172a" : "rgba(255,255,255,0.25)",
            fontWeight:900, fontSize:"0.95rem", cursor: selectedMethod && !uploading ? "pointer" : "not-allowed",
            border:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
            transition:"all 0.2s",
          }}
        >
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />{isAr ? "جاري..." : "Processing..."}</> : isAr ? "تم التحويل — رفع الإيصال" : "I Transferred — Upload Receipt"}
        </button>
      </div>
    );
  }

  // ── PROOF STEP ───────────────────────────────────────────
  if (step === "proof") {
    return (
      <div>
        <StepBar />

        <div style={{ marginBottom:"20px" }}>
          <h2 style={{ color:"white", fontWeight:900, fontSize:"1.1rem", marginBottom:"6px" }}>{t("proofTitle")}</h2>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.85rem", lineHeight:1.6 }}>{t("proofInstructions")}</p>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border:`2px dashed ${proofFile ? "rgba(245,158,11,0.5)" : "rgba(148,163,184,0.20)"}`,
            borderRadius:"10px",
            padding:"32px 20px",
            textAlign:"center",
            cursor:"pointer",
            background: proofFile ? "rgba(245,158,11,0.04)" : "rgba(15,23,42,0.4)",
            marginBottom:"16px",
            transition:"all 0.15s",
          }}
        >
          {proofPreview ? (
            <div className="relative">
              <img src={proofPreview} alt="Receipt" style={{ maxHeight:"200px", maxWidth:"100%", borderRadius:"6px", margin:"0 auto", display:"block" }} />
              <button
                onClick={(e) => { e.stopPropagation(); setProofFile(null); setProofPreview(null); setVerifyStatus("idle"); }}
                style={{ position:"absolute", top:"-8px", right:"-8px", width:"24px", height:"24px", borderRadius:"50%", background:"#0f172a", border:"1px solid rgba(255,255,255,0.2)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-3" style={{ color:"rgba(148,163,184,0.4)" }} />
              <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.85rem" }}>{isAr ? "انقر لاختيار الصورة" : "Click to choose image"}</p>
              <p style={{ color:"rgba(255,255,255,0.2)", fontSize:"0.72rem", marginTop:"4px" }}>PNG, JPG — {isAr ? "صورة واضحة للإيصال" : "clear screenshot of receipt"}</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

        {/* Verify status */}
        {verifyStatus === "ok" && (
          <div style={{ padding:"12px 16px", borderRadius:"8px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#86EFAC", fontSize:"0.85rem", display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
            <Check className="h-4 w-4 flex-shrink-0" />{t("verifiedOk")}
          </div>
        )}
        {verifyStatus === "fail" && (
          <div style={{ padding:"12px 16px", borderRadius:"8px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.20)", color:"#FCA5A5", fontSize:"0.83rem", marginBottom:"16px", lineHeight:1.5 }}>
            {t("verifiedFail")}
          </div>
        )}

        <button
          onClick={verifyAndUpload}
          disabled={!proofFile || verifying || verifyStatus === "ok"}
          style={{
            width:"100%", padding:"14px", borderRadius:"8px", border:"none",
            background: proofFile && !verifying && verifyStatus !== "ok" ? "#F59E0B" : "rgba(148,163,184,0.15)",
            color: proofFile && !verifying && verifyStatus !== "ok" ? "#0f172a" : "rgba(255,255,255,0.25)",
            fontWeight:900, fontSize:"0.95rem",
            cursor: proofFile && !verifying && verifyStatus !== "ok" ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
          }}
        >
          {verifying
            ? <><Loader2 className="h-4 w-4 animate-spin" />{t("verifying")}</>
            : verifyStatus === "ok"
            ? <><Check className="h-4 w-4" />{isAr ? "تم التحقق" : "Verified"}</>
            : isAr ? "تحقق وتابع" : "Verify & Continue"}
        </button>
      </div>
    );
  }

  // ── CALENDLY STEP ────────────────────────────────────────
  const calendlyUrl = isGeneralSession ? CALENDLY_GENERAL : CALENDLY_WORKSHOP;

  return (
    <div>
      <StepBar />

      <div style={{ textAlign:"center", marginBottom:"24px" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"12px" }}>🎉</div>
        <h2 style={{ color:"white", fontWeight:900, fontSize:"1.2rem", marginBottom:"8px" }}>
          {isAr ? "تم قبول الدفع! اختر موعدك" : "Payment received! Pick your timeslot"}
        </h2>
        <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.85rem" }}>
          {isAr
            ? "اضغط على الزر لاختيار موعدك عبر Calendly"
            : "Click below to choose your session time via Calendly"}
        </p>
      </div>

      <a
        href={calendlyUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
          width:"100%", padding:"16px", borderRadius:"8px",
          background:"#F59E0B", color:"#0f172a", fontWeight:900, fontSize:"1rem",
          textDecoration:"none", boxShadow:"0 4px 24px rgba(245,158,11,0.4)",
        }}
      >
        <ExternalLink className="h-5 w-5" />
        {t("continueToCalendly")}
      </a>

      <p style={{ textAlign:"center", color:"rgba(255,255,255,0.2)", fontSize:"0.75rem", marginTop:"16px" }}>
        {isAr ? "سيتم إعلامك بتأكيد الحجز خلال 24 ساعة" : "You'll receive a booking confirmation within 24 hours"}
      </p>
    </div>
  );
}
