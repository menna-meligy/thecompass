import AuthForm from "@/components/auth/AuthForm";

export default function AuthPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#0f172a" }}
    >
      {/* ── Large compass watermark ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: 0.04 }}
      >
        <svg viewBox="0 0 400 400" className="w-[700px] h-[700px]" fill="#F59E0B">
          <circle cx="200" cy="200" r="190" fill="none" stroke="#F59E0B" strokeWidth="5" />
          <circle cx="200" cy="200" r="155" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="110" fill="none" stroke="#F59E0B" strokeWidth="1" />
          <circle cx="200" cy="200" r="12" fill="#F59E0B" />
          <polygon points="200,15 188,110 200,85 212,110" fill="#F59E0B" />
          <polygon points="200,385 188,290 200,315 212,290" fill="#F59E0B" opacity="0.7" />
          <polygon points="385,200 290,188 315,200 290,212" fill="#F59E0B" />
          <polygon points="15,200 110,188 85,200 110,212" fill="#F59E0B" opacity="0.7" />
          <polygon points="200,15 204,108 200,85 196,108" fill="#F59E0B" opacity="0.5" transform="rotate(45 200 200)" />
          <polygon points="200,385 204,292 200,315 196,292" fill="#F59E0B" opacity="0.4" transform="rotate(45 200 200)" />
          <polygon points="385,200 292,204 315,200 292,196" fill="#F59E0B" opacity="0.5" transform="rotate(45 200 200)" />
          <polygon points="15,200 108,204 85,200 108,196" fill="#F59E0B" opacity="0.4" transform="rotate(45 200 200)" />
          <line x1="200" y1="40" x2="200" y2="60" stroke="#F59E0B" strokeWidth="3" />
          <line x1="200" y1="340" x2="200" y2="360" stroke="#F59E0B" strokeWidth="3" />
          <line x1="40" y1="200" x2="60" y2="200" stroke="#F59E0B" strokeWidth="3" />
          <line x1="340" y1="200" x2="360" y2="200" stroke="#F59E0B" strokeWidth="3" />
        </svg>
      </div>

      {/* ── Star dots ── */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[8%] w-1 h-1 rounded-full bg-white/30" />
        <div className="absolute top-[20%] left-[85%] w-0.5 h-0.5 rounded-full bg-[#F59E0B]/40" />
        <div className="absolute top-[70%] left-[12%] w-0.5 h-0.5 rounded-full bg-white/25" />
        <div className="absolute top-[80%] left-[88%] w-1 h-1 rounded-full bg-[#F59E0B]/30" />
        <div className="absolute top-[35%] left-[5%] w-0.5 h-0.5 rounded-full bg-white/20" />
        <div className="absolute top-[55%] left-[92%] w-0.5 h-0.5 rounded-full bg-white/20" />
      </div>

      {/* ── Centered content ── */}
      <div className="relative z-10 w-full" style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <AuthForm />
      </div>
    </div>
  );
}
