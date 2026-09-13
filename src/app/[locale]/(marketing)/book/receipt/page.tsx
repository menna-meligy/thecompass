"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Upload, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

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
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const supabase = createClient();

  // Calculate time remaining (48 hours from now)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

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

    setFile(selectedFile);

    // Upload to Supabase
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth`);
        return;
      }

      const fileName = `receipt_${user.id}_${Date.now()}.${selectedFile.name.split(".").pop()}`;
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, selectedFile);

      if (error) throw error;

      // Store receipt metadata in database
      const { error: dbError } = await supabase.from("pending_receipts").insert({
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
      alert(isAr ? "فشل رفع الملف" : "File upload failed");
    } finally {
      setUploading(false);
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
              ? "تم استقبال إيصالك. سيقوم الفريق بالتحقق منه خلال 48 ساعة"
              : "Receipt uploaded successfully. Our team will review and confirm it within 48 hours"}
          </p>

          <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-[#F59E0B] font-bold">
                {isAr ? "الوقت المتبقي" : "Time Remaining"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/5 rounded p-2">
                <div className="text-2xl font-black text-white">
                  {String(timeRemaining.days).padStart(2, "0")}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {isAr ? "أيام" : "Days"}
                </div>
              </div>
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
            {isAr ? "العودة للداشبورد" : "Return to Dashboard"}
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

          <div className="border-2 border-dashed border-[rgba(245,158,11,0.3)] rounded-xl p-8 text-center mb-4 hover:border-[rgba(245,158,11,0.5)] transition cursor-pointer">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-[#F59E0B] mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">
                {isAr ? "اضغط لاختيار ملف" : "Click to select a file"}
              </p>
              <p className="text-white/50 text-sm">
                {isAr ? "أو اسحب الملف هنا" : "or drag and drop"}
              </p>
              <p className="text-white/30 text-xs mt-2">
                {isAr ? "صور أو PDF فقط" : "Images or PDF only"}
              </p>
            </label>
          </div>

          {file && (
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
