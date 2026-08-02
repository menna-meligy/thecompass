"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Copy, ExternalLink, Upload, Loader2, X, Calendar, Clock, MapPin } from "lucide-react";
import QRCode from "qrcode";
import { ocrReceipt, parseReceipt } from "@/lib/payments/receipt";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const INSTAPAY_NUMBER = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01027857707";
const VODAFONE_NUMBER = process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01223810409";
// Merchant's own InstaPay payment link / Vodafone Cash link (set these to your
// account's real link so the button + QR open the app addressed to you).
// The merchant's own InstaPay payment link (from the InstaPay app). Only used when
// it's a real link — the generic ipn.eg is a bot-blocked "Request Rejected" page.
const rawInstapayLink = process.env.NEXT_PUBLIC_INSTAPAY_LINK || "";
const MERCHANT_INSTAPAY_LINK = rawInstapayLink && !rawInstapayLink.includes("ipn.eg") ? rawInstapayLink : "";
// Reliable "open InstaPay" destinations (both verified to load).
const INSTAPAY_IOS = "https://apps.apple.com/eg/app/instapay-egypt/id1592108795";
const INSTAPAY_ANDROID = "https://play.google.com/store/search?q=InstaPay%20Egypt&c=apps";
const VODAFONE_LINK = process.env.NEXT_PUBLIC_VODAFONE_LINK || "https://web.vodafone.com.eg/ar/vodafone-cash";

type Step = "payment" | "proof" | "confirmed";

interface Props {
  sessionId: string;
  workshopTitle: string;
  price: number;
  userId: string;
  sessionStartsAt?: string;
  sessionEndsAt?: string;
  sessionLocation?: string | null;
}

export default function BookingFlow({
  sessionId,
  workshopTitle,
  price,
  sessionStartsAt,
  sessionEndsAt,
  sessionLocation,
}: Props) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [step, setStep] = useState<Step>("payment");
  const [selectedMethod, setSelectedMethod] = useState<"instapay" | "vodafone_cash" | null>(null);
  const PHONE = selectedMethod === "vodafone_cash" ? VODAFONE_NUMBER : INSTAPAY_NUMBER;

  // "Open InstaPay": use the merchant's real payment link if set, else the app store
  // (platform-aware) so the button always opens something that loads.
  const [instapayStore, setInstapayStore] = useState(INSTAPAY_IOS);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setInstapayStore(/android/i.test(ua) ? INSTAPAY_ANDROID : INSTAPAY_IOS);
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(ua));
  }, []);
  const instapayHref = MERCHANT_INSTAPAY_LINK || instapayStore;
  const payLink = selectedMethod === "vodafone_cash" ? VODAFONE_LINK : instapayHref;

  // QR only makes sense for a real InstaPay payment link (a QR of the store page is useless).
  const [instapayQr, setInstapayQr] = useState<string>("");
  useEffect(() => {
    if (!MERCHANT_INSTAPAY_LINK) { setInstapayQr(""); return; }
    QRCode.toDataURL(MERCHANT_INSTAPAY_LINK, { width: 220, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setInstapayQr)
      .catch(() => setInstapayQr(""));
  }, []);
  const [copied, setCopied] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Proof step
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "ok" | "invalid" | "fail">("idle");
  const [verifyErrors, setVerifyErrors] = useState<string[]>([]);
  const SUPPORT_PHONE = "01093026726";
  const [uploading, setUploading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // ── Step indicators ──────────────────────────────────────
  const STEPS = [
    { id: "payment",   label: t("stepPayment"),   num: 1 },
    { id: "proof",     label: t("stepProof"),     num: 2 },
    { id: "confirmed", label: t("stepConfirmed"), num: 3 },
  ] as const;

  function StepBar() {
    const stepIdx = step === "payment" ? 0 : step === "proof" ? 1 : 2;
    return (
      <div className="flex items-center justify-center mb-10" dir={isAr ? "rtl" : "ltr"}>
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.85rem",
                background: i < stepIdx ? "#22C55E" : i === stepIdx ? "#F59E0B" : "rgba(148,163,184,0.10)",
                color: i <= stepIdx ? "#0f172a" : "rgba(255,255,255,0.25)",
                border: i === stepIdx ? "2px solid #F59E0B" : "none",
                boxShadow: i === stepIdx ? "0 0 12px rgba(245,158,11,0.4)" : "none",
              }}>
                {i < stepIdx ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: i === stepIdx ? "#F59E0B" : "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: "40px", height: "2px", margin: "0 4px", marginBottom: "18px", background: i < stepIdx ? "#22C55E" : "rgba(148,163,184,0.12)" }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  function copyNumber() {
    navigator.clipboard.writeText(PHONE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function createBooking() {
    if (!selectedMethod) return;
    setUploading(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, payment_method: selectedMethod, amount: price }),
      });
      const data = await res.json();
      if (data.booking_id) {
        setBookingId(data.booking_id);
        setStep("proof");
      } else {
        setBookingError(data.error || (isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again"));
      }
    } catch {
      setBookingError(isAr ? "تعذر الاتصال بالخادم، تحقق من اتصالك" : "Could not connect, check your connection");
    } finally {
      setUploading(false);
    }
  }

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
      // Try uploading to storage (non-fatal)
      let publicUrl = "";
      try {
        const path = `payments/${bookingId}-${proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
        if (!uploadErr) {
          // proof_url is saved server-side in verify-screenshot (RLS blocks user updates).
          publicUrl = supabase.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl;
        }
      } catch {
        // Storage unavailable — continue without stored URL, admin reviews manually
      }

      // OCR the receipt in the browser and extract amount / date / reference.
      let ocr: { amount: number | null; date: Date | null; reference: string | null } = {
        amount: null, date: null, reference: null,
      };
      try {
        ocr = parseReceipt(await ocrReceipt(proofFile));
      } catch {
        // OCR failed → server sees missing values and returns "unreadable".
      }

      const form = new FormData();
      form.append("file", proofFile);
      form.append("booking_id", bookingId);
      if (publicUrl) form.append("proof_url", publicUrl);
      if (ocr.amount != null) form.append("ocr_amount", String(ocr.amount));
      if (ocr.date) form.append("ocr_date", ocr.date.toISOString());
      if (ocr.reference) form.append("ocr_reference", ocr.reference);

      const res = await fetch("/api/payments/verify-screenshot", { method: "POST", body: form });
      const result = await res.json();

      if (result.verified) {
        setVerifyStatus("ok");
        // Notify the admin that a payment is awaiting review (non-blocking).
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "admin_new_payment", booking_id: bookingId }),
        }).catch(() => {});
        setTimeout(() => setStep("confirmed"), 1200);
      } else {
        // Collect every failing check so we can tell the client exactly what's wrong.
        const KNOWN = ["amount_mismatch", "date_too_old", "date_future", "amount_unreadable", "date_unreadable", "reference_missing", "duplicate_reference", "duplicate_proof"];
        const errs: string[] = (Array.isArray(result.errors) ? result.errors : [result.error]).filter((e: string) => KNOWN.includes(e));
        if (errs.length > 0) {
          setVerifyErrors(errs);
          setVerifyStatus("invalid");
        } else {
          setVerifyStatus("fail");
        }
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

        <div style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: "10px", padding: "20px", marginBottom: "20px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
            {isAr ? "المبلغ المطلوب" : "Amount Due"}
          </p>
          <p style={{ color: "#F59E0B", fontWeight: 900, fontSize: "1.8rem" }}>
            {price === 0 ? (isAr ? "مجاني" : "Free") : `${price.toLocaleString()} ${isAr ? "جنيه" : "EGP"}`}
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginTop: "2px" }}>{workshopTitle}</p>
        </div>

        <div className="space-y-3 mb-6">
          {(["instapay", "vodafone_cash"] as const).map((method) => {
            const isSelected = selectedMethod === method;
            const isInstapay = method === "instapay";
            const label = isInstapay ? (isAr ? "إنستاباي" : "InstaPay") : (isAr ? "فودافون كاش" : "Vodafone Cash");
            const icon = isInstapay ? "💳" : "📱";
            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "14px",
                  padding: "16px", borderRadius: "8px", cursor: "pointer", textAlign: "start",
                  background: isSelected ? "rgba(245,158,11,0.10)" : "rgba(15,23,42,0.6)",
                  border: `1.5px solid ${isSelected ? "#F59E0B" : "rgba(245,158,11,0.15)"}`,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "1.5rem", width: "40px", height: "40px", borderRadius: "8px", background: "rgba(245,158,11,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: isSelected ? "#F59E0B" : "rgba(255,255,255,0.85)", fontSize: "0.9rem" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginTop: "2px" }}>{isInstapay ? INSTAPAY_NUMBER : VODAFONE_NUMBER}</div>
                </div>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${isSelected ? "#F59E0B" : "rgba(148,163,184,0.25)"}`, background: isSelected ? "#F59E0B" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isSelected && <Check className="h-3 w-3 text-[#0f172a]" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {selectedMethod && (
          <div style={{ padding: "18px", borderRadius: "10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.20)", marginBottom: "20px" }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", marginBottom: "10px" }}>
              {isAr ? "حوّل بالظبط " : "Transfer exactly "}
              <span style={{ color: "#F59E0B", fontWeight: 800 }}>{price.toLocaleString()} {isAr ? "جنيه" : "EGP"}</span>
              {isAr ? " على الرقم ده:" : " to this number:"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "1.4rem", color: "#F59E0B", letterSpacing: "0.05em" }}>{PHONE}</span>
              <button onClick={copyNumber} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "6px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("copied") : t("copyNumber")}
              </button>
            </div>

            {selectedMethod === "instapay" && instapayQr && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
                <img src={instapayQr} alt={isAr ? "كود QR للدفع بإنستاباي" : "InstaPay payment QR"} width={140} height={140} style={{ borderRadius: "8px" }} />
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
                  {isAr ? "امسح الكود من تطبيق إنستاباي" : "Scan with the InstaPay app"}
                </span>
              </div>
            )}

            {isMobile ? (
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "6px", background: "#F59E0B", color: "#0f172a", fontWeight: 800, fontSize: "0.85rem", textDecoration: "none" }}
              >
                <ExternalLink className="h-4 w-4" />
                {t("openApp")} {selectedMethod === "instapay" ? "InstaPay" : "Vodafone Cash"}
              </a>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", lineHeight: 1.7 }}>
                {isAr
                  ? `افتح تطبيق ${selectedMethod === "instapay" ? "إنستاباي" : "فودافون كاش"} من موبايلك وحوّل المبلغ على الرقم اللي فوق${selectedMethod === "instapay" && instapayQr ? "، أو امسح الكود" : ""}، وبعدين ارفع صورة التحويل هنا.`
                  : `Open ${selectedMethod === "instapay" ? "InstaPay" : "Vodafone Cash"} on your phone and transfer to the number above${selectedMethod === "instapay" && instapayQr ? ", or scan the QR" : ""}, then upload the receipt here.`}
              </p>
            )}
          </div>
        )}

        {bookingError && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#FCA5A5", fontSize: "0.83rem", marginBottom: "12px" }}>
            {bookingError}
          </div>
        )}

        <button
          onClick={createBooking}
          disabled={!selectedMethod || uploading}
          style={{
            width: "100%", padding: "14px", borderRadius: "8px",
            background: selectedMethod && !uploading ? "#F59E0B" : "rgba(148,163,184,0.15)",
            color: selectedMethod && !uploading ? "#0f172a" : "rgba(255,255,255,0.25)",
            fontWeight: 900, fontSize: "0.95rem", cursor: selectedMethod && !uploading ? "pointer" : "not-allowed",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.2s",
          }}
        >
          {uploading
            ? <><Loader2 className="h-4 w-4 animate-spin" />{isAr ? "جاري..." : "Processing..."}</>
            : isAr ? "تم التحويل، رفع الإيصال" : "I Transferred, Upload Receipt"}
        </button>
      </div>
    );
  }

  // ── PROOF STEP ───────────────────────────────────────────
  if (step === "proof") {
    const canSubmit = !!proofFile && !verifying && verifyStatus !== "ok";
    return (
      <div>
        <StepBar />

        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "1.1rem", marginBottom: "6px" }}>{t("proofTitle")}</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", lineHeight: 1.6 }}>{t("proofInstructions")}</p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${proofFile ? "rgba(245,158,11,0.5)" : "rgba(148,163,184,0.20)"}`,
            borderRadius: "10px", padding: "32px 20px", textAlign: "center", cursor: "pointer",
            background: proofFile ? "rgba(245,158,11,0.04)" : "rgba(15,23,42,0.4)",
            marginBottom: "16px", transition: "all 0.15s",
          }}
        >
          {proofPreview ? (
            <div className="relative">
              <img src={proofPreview} alt={isAr ? "إيصال الدفع" : "Payment receipt"} style={{ maxHeight: "200px", maxWidth: "100%", borderRadius: "6px", margin: "0 auto", display: "block" }} />
              <button
                onClick={(e) => { e.stopPropagation(); setProofFile(null); setProofPreview(null); setVerifyStatus("idle"); }}
                style={{ position: "absolute", top: "-8px", insetInlineEnd: "-8px", width: "24px", height: "24px", borderRadius: "50%", background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(148,163,184,0.4)" }} />
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{isAr ? "انقر لاختيار الصورة" : "Click to choose image"}</p>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", marginTop: "4px" }}>PNG, JPG: {isAr ? "صورة واضحة للإيصال" : "clear screenshot of receipt"}</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

        {verifyStatus === "ok" && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#86EFAC", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Check className="h-4 w-4 flex-shrink-0" />{t("verifiedOk")}
          </div>
        )}
        {verifyStatus === "invalid" && (() => {
          const M: Record<string, { ar: string; en: string }> = {
            amount_mismatch: { ar: `المبلغ غلط — المطلوب ${price.toLocaleString()} جنيه بالظبط.`, en: `Wrong amount — the exact price is ${price.toLocaleString()} EGP.` },
            date_too_old: { ar: "تاريخ التحويل مش تاريخ النهاردة — حوّل وارفع الإيصال في نفس اليوم.", en: "The transfer date isn't today — transfer and upload on the same day." },
            date_future: { ar: "تاريخ التحويل في الإيصال مش مظبوط.", en: "The transfer date on the receipt is invalid." },
            duplicate_reference: { ar: "رقم العملية ده مستخدم قبل كده — ارفع إيصال التحويل الخاص بالحجز ده.", en: "This transaction reference was already used — upload the receipt for this booking." },
            duplicate_proof: { ar: "الإيصال ده مستخدم قبل كده — ارفع إيصال التحويل الخاص بالحجز ده.", en: "This receipt was already used — upload the receipt for this booking." },
            amount_unreadable: { ar: "مقدرناش نقرا المبلغ من الصورة.", en: "We couldn't read the amount from the image." },
            date_unreadable: { ar: "مقدرناش نقرا التاريخ من الصورة.", en: "We couldn't read the date from the image." },
            reference_missing: { ar: "مقدرناش نلاقي رقم العملية في الصورة.", en: "We couldn't find the transaction reference in the image." },
          };
          const hasUnreadable = verifyErrors.some((e) => e.endsWith("unreadable") || e === "reference_missing");
          return (
            <div style={{ padding: "14px 16px", borderRadius: "8px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#FCA5A5", fontSize: "0.83rem", marginBottom: "16px", lineHeight: 1.6 }}>
              <p style={{ fontWeight: 800, marginBottom: "8px", color: "#F87171" }}>
                {isAr ? "الدفع مترفض — لازم تصلّح ده:" : "Payment rejected — you must fix this:"}
              </p>
              <ul style={{ margin: 0, paddingInlineStart: "18px", listStyle: "disc", display: "flex", flexDirection: "column", gap: "4px" }}>
                {verifyErrors.map((e) => (
                  <li key={e}>{M[e] ? (isAr ? M[e].ar : M[e].en) : e}</li>
                ))}
              </ul>
              {hasUnreadable && (
                <p style={{ marginTop: "8px", color: "rgba(255,255,255,0.5)" }}>
                  {isAr ? "ارفع صورة أوضح للإيصال كامل." : "Upload a clearer screenshot of the full receipt."}
                </p>
              )}
              <p style={{ marginTop: "10px", color: "rgba(255,255,255,0.6)" }}>
                {isAr ? `لو محتاج مساعدة كلّمنا على ${SUPPORT_PHONE}.` : `Need help? Call us on ${SUPPORT_PHONE}.`}
              </p>
            </div>
          );
        })()}
        {verifyStatus === "fail" && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#FCA5A5", fontSize: "0.83rem", marginBottom: "16px", lineHeight: 1.6 }}>
            {isAr
              ? `حصلت مشكلة وإحنا بنأكد الإيصال. جرّب تاني، ولو المشكلة فضلت كلّمنا على ${SUPPORT_PHONE}.`
              : `Something went wrong verifying the receipt. Please try again — if it persists, call us on ${SUPPORT_PHONE}.`}
          </div>
        )}

        <button
          onClick={verifyAndUpload}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "14px", borderRadius: "8px", border: "none",
            background: canSubmit ? "#F59E0B" : "rgba(148,163,184,0.15)",
            color: canSubmit ? "#0f172a" : "rgba(255,255,255,0.25)",
            fontWeight: 900, fontSize: "0.95rem",
            cursor: canSubmit ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
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

  // ── CONFIRMED STEP ───────────────────────────────────────
  const startDate = sessionStartsAt ? new Date(sessionStartsAt) : null;
  const endDate = sessionEndsAt ? new Date(sessionEndsAt) : null;
  const dateStr = startDate
    ? startDate.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;
  const timeStr = startDate
    ? startDate.toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
    : null;
  const endTimeStr = endDate
    ? endDate.toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
    : null;
  const isOnline = sessionLocation?.startsWith("http");

  return (
    <div>
      <StepBar />

      {/* Success header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h2 style={{ color: "white", fontWeight: 900, fontSize: "1.25rem", marginBottom: "8px" }}>
          {t("confirmTitle")}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", lineHeight: 1.6, maxWidth: "28rem", margin: "0 auto" }}>
          {t("confirmDesc")}
        </p>
      </div>

      {/* Appointment details card */}
      {(dateStr || sessionLocation) && (
        <div style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <p style={{ color: "rgba(245,158,11,0.65)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "14px" }}>
            {t("appointmentDetails")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dateStr && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "rgba(255,255,255,0.75)", fontSize: "0.87rem" }}>
                <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(245,158,11,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar className="h-3.5 w-3.5 text-[#F59E0B]" />
                </span>
                {dateStr}
              </div>
            )}
            {timeStr && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(245,158,11,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
                </span>
                {timeStr}{endTimeStr ? ` - ${endTimeStr}` : ""}
              </div>
            )}
            {sessionLocation && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
                <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(245,158,11,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MapPin className="h-3.5 w-3.5 text-[#F59E0B]" />
                </span>
                <span style={{ flex: 1 }}>
                  {isOnline ? (isAr ? "عبر الإنترنت" : "Online") : sessionLocation}
                </span>
                {isOnline && (
                  <a
                    href={sessionLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "5px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("joinMeeting")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Link
        href={`/${locale}/dashboard/bookings`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          width: "100%", padding: "14px", borderRadius: "8px",
          background: "#F59E0B", color: "#0f172a", fontWeight: 900, fontSize: "0.95rem",
          textDecoration: "none",
        }}
      >
        {t("goToBookings")}
      </Link>
    </div>
  );
}
