import raw from "./articles.data.json";
import type { Motif } from "@/components/content/ContentGraphic";

/**
 * The content library. Article prose (hook / sections / takeaway) lives in
 * articles.data.json; presentation metadata (titles, excerpt, date, accent,
 * and which graphic motif each section uses) lives here and is merged in.
 */

export interface ArticleStat {
  value: string;
  unit_ar?: string;
  unit_en?: string;
  label_ar: string;
  label_en: string;
}

export interface ArticleSection {
  heading_ar: string;
  heading_en: string;
  paras_ar: string[];
  paras_en: string[];
  science_ar: string;
  science_en: string;
  stat?: ArticleStat;
  motif: Motif;
}

export interface Article {
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  date: string; // ISO (YYYY-MM-DD)
  readMinutes: number;
  accent: string;
  heroMotif: Motif;
  hook_ar: string[];
  hook_en: string[];
  sections: ArticleSection[];
  takeaway_ar: string[];
  takeaway_en: string[];
}

interface Meta {
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  date: string;
  accent: string;
  heroMotif: Motif;
  sectionMotifs: Motif[];
}

// Ordered newest-first for display.
const META: Record<string, Meta> = {
  "find-your-compass": {
    title_ar: "إزاي تلاقي بوصلتك في شغلك",
    title_en: "Finding Your Compass at Work",
    excerpt_ar: "مش كل حد لازم يكون عارف طريقه من الأول. اتعلّم تسأل الأسئلة الصح عشان توصل للاتجاه اللي يناسبك إنت.",
    excerpt_en: "Not everyone has it figured out from day one. Learn to ask the right questions to find the direction that fits you.",
    date: "2026-07-30",
    accent: "#F59E0B",
    heroMotif: "compass",
    sectionMotifs: ["idea", "target", "identity", "map"],
  },
  "feeling-lost": {
    title_ar: "لما تحس إنك تايه في مسارك المهني",
    title_en: "When You Feel Lost in Your Career",
    excerpt_ar: "التوهان مش معناه إنك فاشل، معناه إنك محتاج توقف شوية وتراجع. الخطوات اللي بتطلّعك من نفس المكان.",
    excerpt_en: "Feeling lost doesn't mean you're failing — it means it's time to pause and reassess. The steps that get you unstuck.",
    date: "2026-07-30",
    accent: "#22D3EE",
    heroMotif: "map",
    sectionMotifs: ["brain", "seed", "target", "growth"],
  },
  "professional-identity": {
    title_ar: "إزاي تبني هويتك المهنية",
    title_en: "Building Your Professional Identity",
    excerpt_ar: "هويتك المهنية مش بس الـCV بتاعك، هي إزاي بتتكلم عن نفسك وإزاي الناس بتحس بيك في أول خمس دقايق.",
    excerpt_en: "Your professional identity isn't just your CV — it's how you talk about yourself and how people read you.",
    date: "2026-07-30",
    accent: "#A78BFA",
    heroMotif: "identity",
    sectionMotifs: ["spark", "identity", "target"],
  },
  "salary-negotiation": {
    title_ar: "التفاوض على راتبك من غير خوف",
    title_en: "Negotiating Your Salary Without Fear",
    excerpt_ar: "كتير مننا بيوافق على أول رقم بس عشان مش عايز يبان طماع. اتفاوض بثقة واحترافية من غير ما تحس بالذنب.",
    excerpt_en: "A lot of us accept the first number to avoid seeming greedy. Negotiate with confidence — without the guilt.",
    date: "2026-07-30",
    accent: "#FBBF24",
    heroMotif: "scale",
    sectionMotifs: ["coins", "scale", "target", "spark"],
  },
  "work-life-balance": {
    title_ar: "التوازن بين شغلك وحياتك",
    title_en: "Balancing Your Work and Your Life",
    excerpt_ar: "النجاح المهني من غير توازن بيتعب في الآخر. إزاي تحافظ على طاقتك وحماسك من غير ما تحرق نفسك.",
    excerpt_en: "Career success without balance eventually wears you down. Protect your energy without burning out.",
    date: "2026-07-30",
    accent: "#34D399",
    heroMotif: "balance",
    sectionMotifs: ["brain", "loop", "balance", "seed"],
  },
  "career-change": {
    title_ar: "قبل ما تغيّر مسارك المهني بالكامل",
    title_en: "Before You Make a Full Career Change",
    excerpt_ar: "تغيير المسار قرار كبير، ولازم ياخد وقته. الأسئلة اللي لازم تجاوب عليها بصدق قبل ما تاخد الخطوة.",
    excerpt_en: "Changing your path is a big decision. The questions to answer honestly before you take the leap.",
    date: "2026-07-30",
    accent: "#FB923C",
    heroMotif: "fork",
    sectionMotifs: ["brain", "seed", "map", "target"],
  },
  "daily-productivity": {
    title_ar: "3 حيل تزوّد إنتاجيتك اليومية",
    title_en: "3 Techniques to Improve Your Daily Productivity",
    excerpt_ar: "3 حيل بسيطة وفعّالة تزوّد إنتاجيتك في اليوم — بالعلم مش بالكلام.",
    excerpt_en: "Three simple, effective techniques that genuinely boost your output — grounded in science.",
    date: "2026-05-31",
    accent: "#60A5FA",
    heroMotif: "timer",
    sectionMotifs: ["timer", "brain", "loop"],
  },
  "healthy-habits": {
    title_ar: "إزاي تبني عادات صحية تفضل معاك",
    title_en: "How to Build Lasting Healthy Habits",
    excerpt_ar: "اعرف العلم اللي ورا بناء العادات وإزاي تخليها تفضل معاك طول العمر — وليه الـ21 يوم كلام فاضي.",
    excerpt_en: "The science behind building habits that last — and why the 21-day rule is a myth.",
    date: "2026-05-31",
    accent: "#4ADE80",
    heroMotif: "loop",
    sectionMotifs: ["loop", "brain", "seed", "growth"],
  },
};

type RawBody = {
  readMinutes: number;
  hook_ar: string[];
  hook_en: string[];
  sections: Omit<ArticleSection, "motif">[];
  takeaway_ar: string[];
  takeaway_en: string[];
};

const RAW = raw as unknown as Record<string, RawBody>;

export const ARTICLES: Article[] = Object.keys(META)
  .filter((slug) => RAW[slug])
  .map((slug) => {
    const m = META[slug];
    const b = RAW[slug];
    return {
      slug,
      title_ar: m.title_ar,
      title_en: m.title_en,
      excerpt_ar: m.excerpt_ar,
      excerpt_en: m.excerpt_en,
      date: m.date,
      readMinutes: b.readMinutes,
      accent: m.accent,
      heroMotif: m.heroMotif,
      hook_ar: b.hook_ar,
      hook_en: b.hook_en,
      sections: b.sections.map((s, i) => ({ ...s, motif: m.sectionMotifs[i % m.sectionMotifs.length] })),
      takeaway_ar: b.takeaway_ar,
      takeaway_en: b.takeaway_en,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export function getAllArticles(): Article[] {
  return ARTICLES;
}

export function getArticle(slug: string): Article | null {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}
