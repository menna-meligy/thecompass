/**
 * Arabic (RTL) email templates for pre-session reminders, styled to match the
 * البوصلة brand (dark + gold). Times are rendered in Africa/Cairo.
 */

export interface ReminderData {
  userName: string;
  workshopTitle: string;
  startsAt: string; // ISO
  locationOrLink?: string | null;
  appUrl?: string;
}

function formatCairo(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Africa/Cairo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isOnline(link?: string | null): link is string {
  return typeof link === "string" && link.startsWith("http");
}

function layout(inner: string): string {
  return `
  <div dir="rtl" style="font-family: Arial, 'Segoe UI', sans-serif; background:#0f172a; padding:28px 16px; margin:0;">
    <div style="max-width:560px; margin:0 auto; background:#0d1526; border:1px solid rgba(245,158,11,0.25); border-radius:16px; overflow:hidden;">
      <div style="background:linear-gradient(135deg, rgba(245,158,11,0.18), rgba(13,21,38,0.9)); padding:22px 28px;">
        <span style="color:#F59E0B; font-size:1.35rem; font-weight:900;">البوصلة 🧭</span>
      </div>
      <div style="padding:26px 28px; color:#e5e7eb;">
        ${inner}
      </div>
      <div style="padding:16px 28px; border-top:1px solid rgba(245,158,11,0.12);">
        <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">البوصلة — ليك طريق شبهك.. طريق مخصوص ليك</p>
      </div>
    </div>
  </div>`;
}

function ctaButton(link: string, label: string): string {
  return `<a href="${link}" style="display:inline-block; background:#F59E0B; color:#0f172a; font-weight:bold; text-decoration:none; padding:12px 26px; border-radius:12px; margin-top:8px;">${label}</a>`;
}

function detailsBox(when: string, link?: string | null): string {
  const linkRow = isOnline(link)
    ? `<tr><td style="padding:6px 0; color:#9ca3af;">اللينك</td><td><a href="${link}" style="color:#F59E0B;">${link}</a></td></tr>`
    : link
    ? `<tr><td style="padding:6px 0; color:#9ca3af;">المكان</td><td style="color:#fff;">${link}</td></tr>`
    : "";
  return `
    <table style="border-collapse:collapse; width:100%; font-size:14px; margin:14px 0;">
      <tr><td style="padding:6px 0; color:#9ca3af; width:70px;">الميعاد</td><td style="color:#fff; font-weight:bold;">${when}</td></tr>
      ${linkRow}
    </table>`;
}

/** 24 hours before. */
export function reminder1DayEmail(d: ReminderData): { subject: string; html: string } {
  const when = formatCairo(d.startsAt);
  const cta = isOnline(d.locationOrLink)
    ? ctaButton(d.locationOrLink, "افتح لينك الجلسة")
    : d.appUrl
    ? ctaButton(`${d.appUrl}/ar/dashboard`, "افتح لوحة التحكم")
    : "";
  return {
    subject: `تذكير: عندك جلسة بكرة — ${d.workshopTitle}`,
    html: layout(`
      <h2 style="color:#fff; margin:0 0 10px;">جلستك بكرة ⏰</h2>
      <p style="line-height:1.7; margin:0 0 6px;">أهلاً ${d.userName}،</p>
      <p style="line-height:1.7; margin:0;">فاكرينك بجلستك في <strong style="color:#F59E0B;">${d.workshopTitle}</strong> بكرة. جهّز نفسك واكتب أي حاجة عايز تسأل عنها.</p>
      ${detailsBox(when, d.locationOrLink)}
      ${cta}
    `),
  };
}

/** 30 minutes before. */
export function reminder30MinEmail(d: ReminderData): { subject: string; html: string } {
  const when = formatCairo(d.startsAt);
  const cta = isOnline(d.locationOrLink)
    ? ctaButton(d.locationOrLink, "انضم للجلسة دلوقتي")
    : d.appUrl
    ? ctaButton(`${d.appUrl}/ar/dashboard`, "افتح لوحة التحكم")
    : "";
  return {
    subject: `جلستك هتبدأ بعد شوية — ${d.workshopTitle}`,
    html: layout(`
      <h2 style="color:#fff; margin:0 0 10px;">الجلسة قرّبت 🚀</h2>
      <p style="line-height:1.7; margin:0 0 6px;">أهلاً ${d.userName}،</p>
      <p style="line-height:1.7; margin:0;">جلستك في <strong style="color:#F59E0B;">${d.workshopTitle}</strong> هتبدأ خلال حوالي ٣٠ دقيقة. ${isOnline(d.locationOrLink) ? "دخول من اللينك تحت." : ""}</p>
      ${detailsBox(when, d.locationOrLink)}
      ${cta}
    `),
  };
}

export interface ActivationEmailData {
  userName: string;
  activationLink: string;
}

/** Account activation email. */
export function activationEmail(d: ActivationEmailData): { subject: string; html: string } {
  return {
    subject: `تفعيل حسابك في البوصلة 🧭`,
    html: layout(`
      <h2 style="color:#fff; margin:0 0 10px;">أهلاً بيك في البوصلة 🧭</h2>
      <p style="line-height:1.7; margin:0 0 12px;">أهلاً ${d.userName}،</p>
      <p style="line-height:1.7; margin:0 0 12px;">شكراً على التسجيل معنا! عشان نتأكد إن البريد الإلكتروني بتاعك صحيح، لازم تضغط على الزرار تحت وتفعّل حسابك.</p>
      <div style="text-align: center; margin: 20px 0;">
        ${ctaButton(d.activationLink, "فعّل الحساب الآن")}
      </div>
      <p style="line-height:1.7; margin:0; font-size:13px; color:rgba(255,255,255,0.6);">اللينك صالح لمدة ٢٤ ساعة بس. لو لم تتسجل أنت بتاعك، متقلقش ولا حتحصل حاجة.</p>
    `),
  };
}

export interface PaymentReminderData {
  userName: string;
  workshopTitle: string;
  amount: string;
  hoursRemaining: number;
  appUrl?: string;
}

/** Payment reminder email - first reminder at 12 hours. */
export function paymentReminderEmail(d: PaymentReminderData): { subject: string; html: string } {
  return {
    subject: `⏰ تذكير: استكمل دفعتك لتأكيد جلستك — ${d.workshopTitle}`,
    html: layout(`
      <h2 style="color:#fff; margin:0 0 10px;">تذكير بالدفع ⏰</h2>
      <p style="line-height:1.7; margin:0 0 6px;">أهلاً ${d.userName}،</p>
      <p style="line-height:1.7; margin:0 0 12px;">اخترت جلسة في <strong style="color:#F59E0B;">${d.workshopTitle}</strong> بقيمة <strong style="color:#F59E0B;">${d.amount}</strong>، لكن لما تكملش الدفع فيها بعد!</p>
      <p style="line-height:1.7; margin:0 0 12px; color:#fca5a5;">⏳ عندك <strong style="color:#fca5a5;">${d.hoursRemaining} ساعات</strong> عشان تكمل الدفع وإلا هنلغي حجزك!</p>
      <div style="background:rgba(245,158,11,0.1); border-right:3px solid #F59E0B; padding:12px 16px; margin:14px 0; border-radius:4px;">
        <p style="color:#F59E0B; margin:0; font-weight:bold;">💡 استكمل الدفع دلوقتي عشان ما تخسر مكانك</p>
      </div>
      ${d.appUrl ? ctaButton(`${d.appUrl}/ar/dashboard/bookings`, "استكمل الدفع") : ""}
    `),
  };
}

/** Payment cancellation email - booking has been cancelled due to non-payment. */
export function paymentCancelledEmail(d: Omit<PaymentReminderData, 'hoursRemaining'>): { subject: string; html: string } {
  return {
    subject: `❌ تم إلغاء حجزك — لم تكمل الدفع في الوقت المحدد`,
    html: layout(`
      <h2 style="color:#fca5a5; margin:0 0 10px;">تم إلغاء الحجز ❌</h2>
      <p style="line-height:1.7; margin:0 0 6px;">أهلاً ${d.userName}،</p>
      <p style="line-height:1.7; margin:0 0 12px;">نأسف، لكن حجزك في <strong>${d.workshopTitle}</strong> تم إلغاؤه لأنك ما أكملتش الدفع في الوقت المحدد.</p>
      <p style="line-height:1.7; margin:0 0 12px;">لو بتفكر تحجز مرة ثانية، اضغط الزرار تحت وختار جلسة جديدة. 💪</p>
      ${d.appUrl ? ctaButton(`${d.appUrl}/ar/book/general`, "اختر جلسة جديدة") : ""}
    `),
  };
}
