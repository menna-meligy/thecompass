"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Upload, CheckCircle, AlertCircle, Image } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

interface ProofUploadProps {
  bookingId: string;
  onUpload: (url: string) => void;
}

export function ProofUpload({ bookingId, onUpload }: ProofUploadProps) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `payment-proofs/${bookingId}-${Date.now()}.${ext}`;

    const { error: uploadError, data } = await supabase.storage
      .from("proofs")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setPreview(null);
    } else {
      const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(data.path);
      onUpload(urlData.publicUrl);
      setUploaded(true);
    }

    setUploading(false);
  }

  if (uploaded) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{locale === "ar" ? "تم رفع الإيصال بنجاح!" : "Receipt uploaded successfully!"}</span>
        </div>
        {preview && (
          <img src={preview} alt="proof" className="h-24 rounded-lg object-cover border border-green-200" />
        )}
        <p className="text-xs text-green-600">
          {locale === "ar" ? "الآن اضغط تأكيد لإكمال الحجز" : "Now click Confirm to complete your booking"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{t("uploadProof")}</p>
      <p className="text-xs text-gray-500">{t("proofHint")}</p>

      {/* Drop zone */}
      <label
        className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? "border-gray-200 bg-gray-50 cursor-wait"
            : "border-gray-300 hover:border-[#8B0000] hover:bg-[#8B0000]/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {preview ? (
          <img src={preview} alt="preview" className="h-24 mx-auto rounded-lg object-cover mb-2" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-[#8B0000] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Image className="h-8 w-8" />
            )}
          </div>
        )}
        <p className="text-sm text-gray-500 mt-2">
          {uploading
            ? (locale === "ar" ? "جارٍ الرفع..." : "Uploading...")
            : (locale === "ar" ? "اضغط لاختيار صورة الإيصال" : "Click to choose receipt image")}
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF</p>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ProofUpload;
