"use client";

import { useTranslations, useLocale } from "next-intl";
import { CreditCard, Smartphone, Wallet } from "lucide-react";
import type { PaymentMethod } from "@/types/index";
import { cn } from "@/lib/utils";

const instapayNumber = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "—";
const vodafoneNumber = process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "—";

interface PaymentSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentSelector({ selected, onSelect }: PaymentSelectorProps) {
  const t = useTranslations("booking");
  const locale = useLocale();

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; description: string; badge?: string }[] = [
    {
      id: "paymob",
      label: t("paymob"),
      icon: <CreditCard className="h-5 w-5" />,
      description: locale === "ar" ? "فيزا، ماستركارد، ميزة" : "Visa, Mastercard, Meeza",
    },
    {
      id: "instapay",
      label: t("instapay"),
      icon: <Smartphone className="h-5 w-5" />,
      description: instapayNumber,
      badge: locale === "ar" ? "يدوي" : "Manual",
    },
    {
      id: "vodafone_cash",
      label: t("vodafoneCash"),
      icon: <Wallet className="h-5 w-5" />,
      description: vodafoneNumber,
      badge: locale === "ar" ? "يدوي" : "Manual",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 mb-3">{t("payment")}</p>
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onSelect(method.id)}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-start",
            selected === method.id
              ? "border-[#8B0000] bg-[#8B0000]/5"
              : "border-gray-200 hover:border-[#8B0000]/40 hover:bg-gray-50"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            selected === method.id ? "bg-[#8B0000] text-white" : "bg-gray-100 text-gray-600"
          )}>
            {method.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">{method.label}</span>
              {method.badge && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {method.badge}
                </span>
              )}
            </div>
            <div className={cn("text-xs mt-0.5 font-mono", selected === method.id ? "text-[#8B0000]/80" : "text-gray-500")}>
              {method.description}
            </div>
          </div>
          {selected === method.id && (
            <div className="w-5 h-5 rounded-full bg-[#8B0000] flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}

      {/* Manual payment instruction */}
      {(selected === "instapay" || selected === "vodafone_cash") && (
        <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
          <p className="font-semibold">
            {locale === "ar" ? "📱 خطوات الدفع اليدوي:" : "📱 Manual Payment Steps:"}
          </p>
          <ol className="space-y-1 list-decimal list-inside text-xs text-amber-700">
            {locale === "ar" ? (
              <>
                <li>حوّل المبلغ إلى الرقم: <span className="font-mono font-bold">{selected === "instapay" ? instapayNumber : vodafoneNumber}</span></li>
                <li>صوّر إيصال التحويل</li>
                <li>ارفع الصورة في الخطوة التالية</li>
                <li>انتظر التأكيد من الإدارة (خلال 24 ساعة)</li>
              </>
            ) : (
              <>
                <li>Transfer to: <span className="font-mono font-bold">{selected === "instapay" ? instapayNumber : vodafoneNumber}</span></li>
                <li>Screenshot the transfer receipt</li>
                <li>Upload it in the next step</li>
                <li>Admin will confirm within 24 hours</li>
              </>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}

export default PaymentSelector;
