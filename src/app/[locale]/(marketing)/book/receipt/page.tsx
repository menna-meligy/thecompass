"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Upload, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface ValidationError {
  type: "date" | "price" | "generic";
  message: string;
}

const SUPPORT_PHONE = "01223810409";

export default function ReceiptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("booking");
  const isAr = locale === "ar";

  const slotDate = searchParams.get("date");
  const slotTime = searchParams.get("time");
  const slotEndTime = searchParams.get("endTime");
  const price = searchParams.get("price");
  const workshopTitle = searchParams.get("title");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth`);
      }
    }
    checkAuth();
  }, [router, locale, supabase.auth]);

  // Calculate time remaining (24 hours from now)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const diff = deadline.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Verify file is an image or PDF
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(selectedFile.type)) {
      alert(isAr ? "يرجى اختيار صورة أو ملف PDF" : "Please select an image or PDF file");
      return;
    }

    // Verify file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert(isAr ? "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" : "File is too large (max 10MB)");
      return;
    }

    setFile(selectedFile);
    setValidating(true);
    setValidationErrors([]);

    try {
      // Perform OCR validation on image files
      if (selectedFile.type.startsWith("image/")) {
        const { parseReceipt, validateReceipt, ocrReceipt } = await import("@/lib/payments/receipt");

        try {
          const ocrText = await ocrReceipt(selectedFile);
          const parsed = parseReceipt(ocrText);
          const expectedAmount = parseFloat(price || "0");
          const errors = validateReceipt(parsed, { expectedAmount });

          if (errors.length > 0) {
            // Map error codes to display messages
            const messageMap: Record<string, { ar: string; en: string }> = {
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

            // Show validation errors with support contact
            setValidationErrors(errors.map(code => ({
              type: "generic" as const,
              message: isAr ? messageMap[code]?.ar || code : messageMap[code]?.en || code
            })));

            setFile(null);
            setValidating(false);
            return;
          }
        } catch (ocrError) {
          console.warn("OCR validation warning (continuing with upload):", ocrError);
          // Continue with upload even if OCR fails - admin will review manually
        }
      }

      // Clear validation errors and proceed with upload
      setValidationErrors([]);
      setValidating(false);
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth`);
        return;
      }

      const fileExt = selectedFile.name.split(".").pop() || "bin";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, selectedFile);

      if (error) throw error;

      // Store receipt metadata in database
      const { error: dbError } = await (supabase as any).from("pending_receipts").insert({
        user_id: user.id,
        slot_date: slotDate,
        slot_time: slotTime,
        workshop_title: workshopTitle,
        price: parseFloat(price || "0"),
        receipt_url: data.path,
        status: "pending",
        uploaded_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      setUploadedReceipt(fileName);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(isAr ? "فشل رفع الملف، يرجى المحاولة مرة أخرى" : "File upload failed, please try again");
      setFile(null);
    } finally {
      setUploading(false);
      setValidating(false);
    }
  };

  if (uploadedReceipt) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />

          <h1 className="text-2xl font-black text-white mb-2">
            {isAr ? "شكراً لك!" : "Thank You!"}
          </h1>

          <p className="text-white/70 mb-6">
            {isAr
              ? "تم استقبال إيصالك. سيقوم الفريق بالتحقق منه وتأكيده خلال 24 ساعة"
              : "Receipt uploaded successfully. Our team will review and confirm it within 24 hours"}
          </p>

          <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-[#F59E0B] font-bold">
                {isAr ? "سيتم التحقق خلال" : "Will be checked in"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/5 rounded p-2">
                <div className="text-2xl font-black text-white">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {isAr ? "ساعات" : "Hours"}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-2xl font-black text-white">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {isAr ? "دقائق" : "Mins"}
                </div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-2xl font-black text-white">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {isAr ? "ثواني" : "Secs"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/60 mb-6">
            <p>• {isAr ? "تاريخ الجلسة" : "Session Date"}: {slotDate}</p>
            <p>• {isAr ? "الوقت" : "Time"}: {slotTime}</p>
            <p>• {isAr ? "السعر" : "Price"}: {price} {isAr ? "ج.م" : "EGP"}</p>
          </div>

          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="w-full py-3 bg-[#F59E0B] text-[#0f172a] font-bold rounded-lg hover:bg-[#f5b342] transition"
          >
            {isAr ? "العودة إلى لوحة التحكم" : "Return to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            {isAr ? "تأكيد الحجز" : "Confirm Booking"}
          </h1>
          <p className="text-white/50">
            {isAr ? "يرجى رفع إيصال الدفع للتحقق" : "Please upload your payment receipt"}
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-300 text-sm font-semibold mb-2">
                    {isAr ? "⚠️ مشكلة في التحقق من الإيصال" : "⚠️ Receipt Verification Failed"}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {validationErrors.map((error, idx) => (
                      <li key={idx} className="text-red-200 flex items-start gap-2">
                        <span className="text-red-400 font-bold mt-0.5">•</span>
                        <span>{error.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-300 text-sm font-semibold mb-1.5">
                {isAr ? "📞 الرجاء الاتصال بفريق الدعم:" : "📞 Please contact support:"}
              </p>
              <a href={`tel:${SUPPORT_PHONE}`} className="text-sm font-mono font-bold text-amber-300 hover:text-amber-200">
                {SUPPORT_PHONE}
              </a>
            </div>
          </div>
        )}

        {/* Slot Details */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {isAr ? "تفاصيل الجلسة" : "Session Details"}
          </h2>
          <div className="space-y-3 text-white/70">
            <p>
              <span className="text-white font-bold">{isAr ? "الورشة: " : "Workshop: "}</span>
              {workshopTitle}
            </p>
            <p>
              <span className="text-white font-bold">{isAr ? "التاريخ: " : "Date: "}</span>
              {slotDate}
            </p>
            <p>
              <span className="text-white font-bold">{isAr ? "الوقت: " : "Time: "}</span>
              {slotTime} - {slotEndTime}
            </p>
            <p>
              <span className="text-white font-bold text-lg text-[#F59E0B]">
                {isAr ? "السعر: " : "Price: "}
              </span>
              <span className="text-white font-bold text-lg text-[#F59E0B]">{price} {isAr ? "ج.م" : "EGP"}</span>
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {isAr ? "رفع الإيصال" : "Upload Receipt"}
          </h2>

          <div className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition cursor-pointer ${
            validating ? "border-amber-400/50 bg-amber-400/5" : "border-[rgba(245,158,11,0.3)] hover:border-[rgba(245,158,11,0.5)]"
          }`}>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={uploading || validating}
              className="hidden"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="cursor-pointer block">
              {validating ? (
                <>
                  <Loader2 className="w-8 h-8 text-[#F59E0B] mx-auto mb-3 animate-spin" />
                  <p className="text-white font-semibold mb-1">
                    {isAr ? "جاري التحقق من الإيصال..." : "Verifying receipt..."}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[#F59E0B] mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">
                    {isAr ? "اضغط لاختيار ملف" : "Click to select a file"}
                  </p>
                  <p className="text-white/50 text-sm">
                    {isAr ? "أو اسحب الملف هنا" : "or drag and drop"}
                  </p>
                </>
              )}
              <p className="text-white/30 text-xs mt-2">
                {isAr ? "صور أو PDF فقط" : "Images or PDF only"}
              </p>
            </label>
          </div>

          {file && !validationErrors.length && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-300 text-sm">
                {isAr ? "✓ تم تحديد الملف: " : "✓ File selected: "} {file.name}
              </p>
            </div>
          )}

          {uploading && (
            <div className="text-center mb-4">
              <p className="text-white/70">
                {isAr ? "جاري الرفع..." : "Uploading..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
