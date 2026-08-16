import { getTranslations, getLocale } from "next-intl/server";
import ArticleCard from "@/components/content/ArticleCard";
import { getAllArticles } from "@/content/articles";

export default async function VlogsPage() {
  const t = await getTranslations("vlogs");
  const locale = await getLocale();
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Page header */}
      <div style={{ background: "#0d1526", borderBottom: "1px solid rgba(245,158,11,0.10)" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "3rem 1.5rem 2.5rem" }}>
          <div style={{ width: "40px", height: "3px", background: "#F59E0B", opacity: 0.7, marginBottom: "1rem" }} />
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{t("title")}</h1>
          <p className="text-white/45 text-base">{t("subtitle")}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ border: "1px dashed rgba(245,158,11,0.15)", borderRadius: "10px", background: "rgba(30,41,59,0.2)" }}>
            <p className="text-white/40 font-semibold text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
