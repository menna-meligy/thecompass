"use client";

import { useTranslations, useLocale } from "next-intl";
import { CreditCard, Smartphone, Wallet, Check } from "lucide-react";
import type { PaymentMethod } from "@/types/index";

const instapayNumber = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01027857707";
const vodafoneNumber = process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01223810409";

interface PaymentSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentSelector({ selected, onSelect }: PaymentSelectorProps) {
  const t = useTranslations("booking");
  const locale = useLocale();

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; description: string; badge?: string }[] = [
    { id: "paymob",       label: t("paymob"),      icon: <CreditCard className="h-5 w-5" />, description: locale === "ar" ? "فيزا، ماستركارد، ميزة" : "Visa, Mastercard, Meeza" },
    { id: "instapay",     label: t("instapay"),    icon: <Smartphone className="h-5 w-5" />, description: instapayNumber,  badge: locale === "ar" ? "يدوي" : "Manual" },
    { id: "vodafone_cash",label: t("vodafoneCash"),icon: <Wallet    className="h-5 w-5" />, description: vodafoneNumber,  badge: locale === "ar" ? "يدوي" : "Manual" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">{t("payment")}</p>
      {methods.map((method) => {
        const isSelected = selected === method.id;
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            style={{
              display:"flex",alignItems:"center",gap:"12px",width:"100%",
              padding:"14px 16px",borderRadius:"8px",cursor:"pointer",textAlign:"start",
              background: isSelected ? "rgba(245,158,11,0.12)" : "rgba(15,23,42,0.6)",
              border: `1.5px solid ${isSelected ? "#F59E0B" : "rgba(245,158,11,0.18)"}`,
              transition:"all 0.2s",
            }}
          >
            <div style={{ width:"40px",height:"40px",borderRadius:"8px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
              background: isSelected ? "#F59E0B" : "rgba(245,158,11,0.08)",
              color: isSelected ? "#0f172a" : "rgba(245,158,11,0.7)",
            }}>{method.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                <span style={{fontWeight:700,fontSize:"0.875rem",color: isSelected ? "#F59E0B" : "rgba(255,255,255,0.85)"}}>{method.label}</span>
                {method.badge && <span style={{fontSize:"0.7rem",fontWeight:700,padding:"2px 8px",borderRadius:"4px",background:"rgba(245,158,11,0.15)",color:"#F59E0B"}}>{method.badge}</span>}
              </div>
              <div style={{fontSize:"0.75rem",fontFamily:"monospace",color: isSelected ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.35)"}}>{method.description}</div>
            </div>
            <div style={{ width:"22px",height:"22px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
              background: isSelected ? "#F59E0B" : "transparent",
              border: isSelected ? "none" : "1.5px solid rgba(148,163,184,0.25)",
            }}>{isSelected && <Check className="h-3 w-3 text-[#0f172a]" strokeWidth={3}/>}</div>
          </button>
        );
      })}

      {(selected === "instapay" || selected === "vodafone_cash") && (
        <div style={{padding:"16px",borderRadius:"8px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.20)",marginTop:"8px"}}>
          <p style={{fontWeight:700,fontSize:"0.875rem",color:"#F59E0B",marginBottom:"8px"}}>
            {locale === "ar" ? "📱 خطوات الدفع اليدوي:" : "📱 Manual Payment Steps:"}
          </p>
          <ol style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.55)",listStyle:"decimal",paddingInlineStart:"16px",display:"flex",flexDirection:"column",gap:"4px"}}>
            {locale === "ar" ? (<>
              <li>حوّل المبلغ إلى: <span style={{fontFamily:"monospace",fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{selected === "instapay" ? instapayNumber : vodafoneNumber}</span></li>
              <li>صوّر إيصال التحويل</li><li>ارفع الصورة في الخطوة التالية</li><li>انتظر التأكيد من الإدارة (خلال 24 ساعة)</li>
            </>) : (<>
              <li>Transfer to: <span style={{fontFamily:"monospace",fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{selected === "instapay" ? instapayNumber : vodafoneNumber}</span></li>
              <li>Screenshot the receipt</li><li>Upload it in the next step</li><li>Admin confirms within 24 hours</li>
            </>)}
          </ol>
        </div>
      )}
    </div>
  );
}

export default PaymentSelector;
