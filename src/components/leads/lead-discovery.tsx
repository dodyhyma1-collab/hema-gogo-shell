import { useMemo, useState } from "react";
import { Globe, Loader2, MapPin, Search, Sparkles, Target, TrendingUp, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Source = "googleMaps" | "linkedin" | "facebook" | "website";
type Lead = { id: string; name: string; company: string; city: string; source: Source; score: number; captured: boolean };

const sourceLabel: Record<Source, { en: string; ar: string }> = {
  googleMaps: { en: "Google Maps", ar: "خرائط جوجل" }, linkedin: { en: "LinkedIn", ar: "لينكدإن" },
  facebook: { en: "Facebook Groups", ar: "مجموعات فيسبوك" }, website: { en: "Website directory", ar: "دليل المواقع" },
};

const seed: Lead[] = [
  { id: "l1", name: "Omar Saleh", company: "Nile Pharma", city: "Cairo", source: "linkedin", score: 91, captured: true },
  { id: "l2", name: "Hala Mostafa", company: "Delta Foods", city: "Tanta", source: "googleMaps", score: 78, captured: false },
  { id: "l3", name: "Youssef Amin", company: "Red Sea Tours", city: "Hurghada", source: "facebook", score: 64, captured: false },
  { id: "l4", name: "Nour Ibrahim", company: "Cairo Dental Clinic", city: "Cairo", source: "googleMaps", score: 83, captured: true },
  { id: "l5", name: "Tarek Gamal", company: "Alex Build Co.", city: "Alexandria", source: "website", score: 47, captured: false },
  { id: "l6", name: "Rania Fouad", company: "Giza Fashion House", city: "Giza", source: "linkedin", score: 72, captured: false },
];

const extra: Omit<Lead, "id">[] = [
  { name: "Sherif Kamal", company: "Mansoura Motors", city: "Mansoura", source: "googleMaps", score: 69, captured: false },
  { name: "Dina Wagdy", company: "Luxor Hotels Group", city: "Luxor", source: "linkedin", score: 88, captured: false },
  { name: "Ali Hamdy", company: "Suez Logistics", city: "Suez", source: "website", score: 55, captured: false },
];

const c = {
  en: { title: "Lead Discovery & Scraping Hub", sub: "Find potential clients across sources and track how qualified they are.", total: "Discovered", captured: "Captured to CRM", hot: "Hot leads (80+)", avg: "Avg. score", keyword: "Keyword, e.g. dental clinics", location: "City", run: "Run scan", scanning: "Scanning…", found: "new leads found", all: "All", hotT: "Hot", warm: "Warm", cold: "Cold", capture: "Capture", inCrm: "In CRM", capturedMsg: "Lead added to CRM", sources: "Sources", lead: "Lead", score: "Qualification" },
  ar: { title: "مركز اكتشاف العملاء وجمع البيانات", sub: "اعثر على عملاء محتملين من مصادر متعددة وتابع درجة تأهيلهم.", total: "تم اكتشافهم", captured: "أضيفوا إلى CRM", hot: "عملاء ساخنون (80+)", avg: "متوسط الدرجة", keyword: "كلمة بحث، مثل عيادات أسنان", location: "المدينة", run: "بدء الفحص", scanning: "جارٍ الفحص…", found: "عملاء جدد", all: "الكل", hotT: "ساخن", warm: "دافئ", cold: "بارد", capture: "إضافة", inCrm: "في CRM", capturedMsg: "تمت إضافة العميل إلى CRM", sources: "المصادر", lead: "العميل", score: "التأهيل" },
};

const tier = (s: number) => (s >= 80 ? "hot" : s >= 60 ? "warm" : "cold");

export function LeadDiscovery() {
  const { lang } = useLanguage();
  const t = c[lang];
  const [leads, setLeads] = useState(seed);
  const [filter, setFilter] = useState("all");
  const [kw, setKw] = useState("");
  const [loc, setLoc] = useState("");
  const [srcs, setSrcs] = useState<Source[]>(["googleMaps", "linkedin"]);
  const [scanning, setScanning] = useState(false);
  const [q, setQ] = useState("");

  const shown = useMemo(() => leads.filter((l) => (filter === "all" || tier(l.score) === filter) && `${l.name} ${l.company} ${l.city}`.toLowerCase().includes(q.toLowerCase())), [leads, filter, q]);
  const avg = Math.round(leads.reduce((a, l) => a + l.score, 0) / leads.length);

  const scan = () => {
    setScanning(true);
    setTimeout(() => {
      const picked: Lead[] = extra.filter((e) => srcs.includes(e.source)).map((e) => ({ ...e, id: crypto.randomUUID(), city: loc || e.city }));
      const add: Lead[] = picked.length ? picked : [{ ...extra[0], id: crypto.randomUUID() }];
      setLeads((l) => [...add, ...l]);
      setScanning(false);
      toast.success(`${add.length} ${t.found}`);
    }, 1400);
  };

  const stats = [
    { icon: Users, label: t.total, value: leads.length },
    { icon: UserPlus, label: t.captured, value: leads.filter((l) => l.captured).length },
    { icon: Target, label: t.hot, value: leads.filter((l) => l.score >= 80).length },
    { icon: TrendingUp, label: t.avg, value: avg },
  ];

  return (
    <main className="flex-1 space-y-5 p-4 md:p-6">
      <div><h1 className="text-2xl font-bold tracking-tight">{t.title}</h1><p className="text-sm text-muted-foreground">{t.sub}</p></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <article key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground"><p className="text-xs font-medium">{s.label}</p><s.icon className="size-4" /></div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
          </article>
        ))}
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
          <div className="relative"><Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" /><Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder={t.keyword} className="ps-9" /></div>
          <div className="relative"><MapPin className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" /><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder={t.location} className="ps-9" /></div>
          <Button onClick={scan} disabled={scanning || srcs.length === 0}>{scanning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{scanning ? t.scanning : t.run}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t.sources}:</span>
          {(Object.keys(sourceLabel) as Source[]).map((s) => (
            <Button key={s} size="sm" variant={srcs.includes(s) ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSrcs((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>
              <Globe className="size-3.5" />{sourceLabel[s][lang]}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList><TabsTrigger value="all">{t.all}</TabsTrigger><TabsTrigger value="hot">{t.hotT}</TabsTrigger><TabsTrigger value="warm">{t.warm}</TabsTrigger><TabsTrigger value="cold">{t.cold}</TabsTrigger></TabsList>
          </Tabs>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="…" className="ms-auto h-9 max-w-52" />
        </div>
        <ul className="divide-y">
          {shown.map((l) => {
            const tr = tier(l.score);
            return (
              <li key={l.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{l.name}</p><p className="truncate text-xs text-muted-foreground">{l.company} · {l.city}</p></div>
                <Badge variant="secondary" className="hidden w-fit md:inline-flex">{sourceLabel[l.source][lang]}</Badge>
                <div className="hidden items-center gap-2 md:flex">
                  <Progress value={l.score} className="h-2" />
                  <span className={cn("w-16 text-xs font-semibold", tr === "hot" ? "text-chart-2" : tr === "warm" ? "text-chart-4" : "text-muted-foreground")}>{l.score} · {t[tr === "hot" ? "hotT" : tr]}</span>
                </div>
                <Button size="sm" variant={l.captured ? "secondary" : "default"} disabled={l.captured} onClick={() => { setLeads((x) => x.map((y) => (y.id === l.id ? { ...y, captured: true } : y))); toast.success(t.capturedMsg); }}>
                  {l.captured ? t.inCrm : t.capture}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
