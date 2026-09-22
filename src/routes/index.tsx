import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CheckCircle2, DollarSign, Users } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { TopNav } from "@/components/shell/top-nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hema Gogo — Workspace Overview" },
      {
        name: "description",
        content:
          "Hema Gogo is a multi-tenant SaaS platform. Switch between isolated workspaces, search globally, and work in Arabic or English.",
      },
      { property: "og:title", content: "Hema Gogo — Workspace Overview" },
      {
        property: "og:description",
        content:
          "Multi-tenant SaaS dashboard with isolated workspaces, global search, and bilingual Arabic/English support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const stats = [
  { key: "statRevenue", value: "$48,210", delta: "+12.4%", icon: DollarSign },
  { key: "statUsers", value: "3,842", delta: "+8.1%", icon: Users },
  { key: "statTasks", value: "126", delta: "-4.0%", icon: CheckCircle2 },
  { key: "statUptime", value: "99.98%", delta: "+0.01%", icon: Activity },
] as const;

const activity = [
  { who: "Sara K.", what: "Closed deal — Nova Health", whatAr: "أغلقت صفقة — نوفا للصحة", when: "10:24" },
  { who: "Omar F.", what: "Deployed v2.4 to production", whatAr: "نشر الإصدار 2.4 للإنتاج", when: "09:51" },
  { who: "Lina M.", what: "Added 3 teammates to Atlas", whatAr: "أضافت 3 زملاء إلى أطلس", when: "08:17" },
];

function Dashboard() {
  const { lang, t } = useLanguage();

  return (
    <div className="min-h-screen bg-secondary/40">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("overview")}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t("welcomeTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("welcomeSub")}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.key}
              className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center justify-between">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  {s.delta}
                </span>
              </div>
              <p className="mt-3 text-xl font-bold sm:text-2xl">{s.value}</p>
              <p className="text-xs text-muted-foreground">{t(s.key)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">{t("recentActivity")}</h2>
            <button className="text-xs font-medium text-primary hover:underline">
              {t("viewAll")}
            </button>
          </div>
          <ul className="divide-y divide-border">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                  {a.who.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.who} · {lang === "ar" ? a.whatAr : a.what}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{a.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <LanguageProvider>
      <Dashboard />
    </LanguageProvider>
  );
}
