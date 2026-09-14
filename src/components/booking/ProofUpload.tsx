"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Upload, CheckCircle, AlertCircle, Image, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { parseReceipt, validateReceipt } from "@/lib/payments/receipt";
import { ocrReceipt } from "@/lib/payments/receipt";

interface ProofUploadProps {
  bookingId: string;
  onUpload: (url: string) => void;
  expectedAmount?: number;
}

const SUPPORT_PHONE = "01223810409";

export function ProofUpload({ bookingId, onUpload, expectedAmount }: ProofUploadProps) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const getErrorMessage = (errorCode: string): string => {
    const messages: Record<string, { ar: string; en: string }> = {
      amount_unreadable: {
        ar: "لم نتمكن من قراءة المبلغ من الإيصال. يرجى التأكد من وضوح الصورة.",
        en: "Could not read amount from receipt. Please ensure image is clear."
      },
      amount_mismatch: {
        ar: "المبلغ على الإيصال لا يطابق سعر الحجز. يرجى الاتصال بالدعم.",
        en: "Receipt amount does not match booking price. Please contact support."
      },
      date_unreadable: {
        ar: "لم نتمكن من قراءة التاريخ من الإيصال. يرجى التأكد من وضوح الصورة.",
        en: "Could not read date from receipt. Please ensure image is clear."
      },
      date_too_old: {
        ar: "الإيصال قديم جداً (يجب أن يكون من اليوم أو أمس). يرجى التحقق من التاريخ.",
        en: "Receipt is too old (must be from today or yesterday). Please verify."
      },
      date_future: {
        ar: "تاريخ الإيصال في المستقبل. يرجى التحقق من التاريخ.",
        en: "Receipt date is in the future. Please verify."
      },
      reference_missing: {
        ar: "لم نتمكن من العثور على رقم التحويل. يرجى التأكد من وضوح الإيصال.",
        en: "Could not find transaction reference. Please ensure receipt is clear."
      }
    };
    const msg = messages[errorCode];
    return msg ? (locale === "ar" ? msg.ar : msg.en) : errorCode;
  };

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    }

    setUploading(true);
    setValidating(true);
    setError(null);
    setValidationErrors([]);

    try {
      // Validate receipt before uploading
      if (expectedAmount) {
        const ocrText = await ocrReceipt(file);
        const parsed = parseReceipt(ocrText);
        const errors = validateReceipt(parsed, { expectedAmount });

        if (errors.length > 0) {
          setValidationErrors(errors);
          setValidating(false);
          setUploading(false);
          return;
        }
      }

      setValidating(false);

      // Upload to storage
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `payment-proofs/${bookingId}-${Date.now()}.${ext}`;

      const { error: uploadError, data } = await supabase.storage
        .from("proofs")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        if (uploadError.message.includes("not found") || uploadError.message.includes("NoSuchBucket")) {
          setError(locale === "ar"
            ? "عذراً، خدمة التخزين غير متاحة حالياً. يرجى المحاولة مرة أخرى."
            : "Storage service is temporarily unavailable. Please try again.");
        } else {
          setError(uploadError.message);
        }
        setPreview(null);
      } else if (data) {
        const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(data.path);
        onUpload(urlData.publicUrl);
        setUploaded(true);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(locale === "ar"
        ? "حدث خطأ أثناء الرفع. يرجى المحاولة مرة أخرى."
        : "An error occurred during upload. Please try again.");
      setPreview(null);
    }

    setUploading(false);
  }

  if (uploaded) {
    return (
      <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{locale === "ar" ? "✓ تم التحقق من الإيصال بنجاح!" : "✓ Receipt verified successfully!"}</span>
        </div>
        {preview && (
          <img src={preview} alt="proof" className="h-24 rounded-lg object-cover border border-emerald-500/30" />
        )}
        <p className="text-xs text-emerald-300">
          {locale === "ar" ? "الإيصال صحيح! اضغط تأكيد لإكمال الحجز" : "Receipt is valid! Click Confirm to complete booking"}
        </p>
      </div>
    );
  }

  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white">{t("uploadProof")}</p>
      <p className="text-xs text-white/60">{t("proofHint")}</p>

      {/* Drop zone */}
      <label
        className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          uploading || validating
            ? "border-amber-400/30 bg-amber-400/5 cursor-wait"
            : hasValidationErrors
              ? "border-red-400/50 bg-red-400/5 cursor-pointer"
              : "border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={handleFileChange}
          disabled={uploading || validating}
        />
        {preview ? (
          <img src={preview} alt="preview" className="h-24 mx-auto rounded-lg object-cover mb-2" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-amber-400/60">
            {uploading || validating ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Image className="h-8 w-8" />
            )}
          </div>
        )}
        <p className="text-sm text-white/70 mt-2">
          {validating
            ? (locale === "ar" ? "جاري التحقق من الإيصال..." : "Verifying receipt...")
            : uploading
              ? (locale === "ar" ? "جارٍ الرفع..." : "Uploading...")
              : (locale === "ar" ? "اضغط لاختيار صورة الإيصال" : "Click to choose receipt image")}
        </p>
        <p className="text-xs text-white/50 mt-1">PNG, JPG, PDF</p>
      </label>

      {/* Validation errors */}
      {hasValidationErrors && (
        <div className="rounded-lg border border-red-400/50 bg-red-400/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300 mb-2">
                {locale === "ar" ? "⚠️ مشكلة في التحقق من الإيصال" : "⚠️ Receipt Verification Failed"}
              </p>
              <ul className="space-y-1.5 mb-3">
                {validationErrors.map((errorCode) => (
                  <li key={errorCode} className="text-xs text-red-200 flex items-start gap-2">
                    <span className="text-red-400 font-bold mt-0.5">•</span>
                    <span>{getErrorMessage(errorCode)}</span>
                  </li>
                ))}
              </ul>
              <div className="p-3 rounded bg-red-400/20 border border-red-400/30">
                <p className="text-xs text-red-100 mb-1.5">
                  {locale === "ar" ? "📞 الرجاء الاتصال بفريق الدعم:" : "📞 Please contact support:"}
                </p>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="text-sm font-mono font-bold text-red-300 hover:text-red-200 transition-colors"
                >
                  {SUPPORT_PHONE}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-300 text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/30">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ProofUpload;
