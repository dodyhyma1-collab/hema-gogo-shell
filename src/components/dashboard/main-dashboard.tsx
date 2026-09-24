import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  ListTodo,
  MessageSquareText,
  Plus,
  Radio,
  Sparkles,
  UserPlus,
  Users,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLanguage, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    eyebrow: "Workspace overview",
    title: "Good morning, Dody",
    subtitle: "Here’s how Acme Retail is performing today.",
    updated: "Updated 4 minutes ago",
    totalLeads: "Total leads",
    newLeads: "New leads",
    conversations: "Active conversations",
    revenue: "Revenue",
    pendingTasks: "Pending tasks",
    automation: "Automation status",
    thisMonth: "this month",
    thisWeek: "this week",
    today: "today",
    needsAttention: "need attention",
    live: "18 workflows live",
    revenueTitle: "Monthly revenue forecast",
    revenueSub: "Actual and projected revenue in EGP",
    actual: "Actual",
    forecast: "Forecast",
    leadSources: "Lead sources",
    leadSourcesSub: "Where qualified leads came from",
    aiAccuracy: "AI response accuracy",
    aiAccuracySub: "Quality score across the last six weeks",
    latestScore: "Latest score",
    target: "Target 90%",
    recentActivity: "Recent activity",
    recentSub: "Latest updates across your workspace",
    viewAll: "View all",
    quickActions: "Quick actions",
    quickSub: "Jump into your most common workflows",
    addLead: "Add new lead",
    startCampaign: "Start AI campaign",
    createInvoice: "Create invoice",
    addTask: "Add task",
    actionReady: "is ready to continue",
    sources: ["Facebook", "Instagram", "Website", "Referral", "WhatsApp"],
    months: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    weeks: ["W1", "W2", "W3", "W4", "W5", "W6"],
  },
  ar: {
    eyebrow: "نظرة عامة على مساحة العمل",
    title: "صباح الخير، دودي",
    subtitle: "إليك أداء أكمي للتجزئة اليوم.",
    updated: "تم التحديث منذ 4 دقائق",
    totalLeads: "إجمالي العملاء المحتملين",
    newLeads: "عملاء جدد",
    conversations: "المحادثات النشطة",
    revenue: "الإيرادات",
    pendingTasks: "المهام المعلقة",
    automation: "حالة الأتمتة",
    thisMonth: "هذا الشهر",
    thisWeek: "هذا الأسبوع",
    today: "اليوم",
    needsAttention: "تحتاج متابعة",
    live: "18 سير عمل نشط",
    revenueTitle: "توقعات الإيرادات الشهرية",
    revenueSub: "الإيرادات الفعلية والمتوقعة بالجنيه المصري",
    actual: "فعلي",
    forecast: "متوقع",
    leadSources: "مصادر العملاء المحتملين",
    leadSourcesSub: "مصادر العملاء المؤهلين",
    aiAccuracy: "دقة ردود الذكاء الاصطناعي",
    aiAccuracySub: "تقييم الجودة خلال آخر ستة أسابيع",
    latestScore: "أحدث نتيجة",
    target: "الهدف 90٪",
    recentActivity: "النشاط الأخير",
    recentSub: "آخر التحديثات في مساحة العمل",
    viewAll: "عرض الكل",
    quickActions: "إجراءات سريعة",
    quickSub: "انتقل إلى مهامك الأكثر استخداماً",
    addLead: "إضافة عميل محتمل",
    startCampaign: "بدء حملة ذكية",
    createInvoice: "إنشاء فاتورة",
    addTask: "إضافة مهمة",
    actionReady: "جاهز للمتابعة",
    sources: ["فيسبوك", "إنستغرام", "الموقع", "الإحالات", "واتساب"],
    months: ["أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر"],
    weeks: ["أسبوع 1", "أسبوع 2", "أسبوع 3", "أسبوع 4", "أسبوع 5", "أسبوع 6"],
  },
} as const;

const summaryCards: Array<{
  label: keyof Pick<(typeof copy)["en"], "totalLeads" | "newLeads" | "conversations" | "revenue" | "pendingTasks" | "automation">;
  value: string;
  note: keyof Pick<(typeof copy)["en"], "thisMonth" | "thisWeek" | "today" | "needsAttention" | "live">;
  delta?: string;
  direction?: "up" | "down";
  icon: LucideIcon;
  iconClass: string;
}> = [
  { label: "totalLeads", value: "8,492", note: "thisMonth", delta: "12.8%", direction: "up", icon: Users, iconClass: "bg-chart-2/15 text-chart-2" },
  { label: "newLeads", value: "326", note: "thisWeek", delta: "8.4%", direction: "up", icon: UserPlus, iconClass: "bg-chart-1/15 text-chart-1" },
  { label: "conversations", value: "148", note: "today", delta: "16.2%", direction: "up", icon: MessageSquareText, iconClass: "bg-chart-3/15 text-chart-3" },
  { label: "revenue", value: "1.24M EGP", note: "thisMonth", delta: "9.6%", direction: "up", icon: CircleDollarSign, iconClass: "bg-chart-4/20 text-chart-4" },
  { label: "pendingTasks", value: "24", note: "needsAttention", delta: "3.1%", direction: "down", icon: ListTodo, iconClass: "bg-destructive/10 text-destructive" },
  { label: "automation", value: "98.6%", note: "live", icon: Zap, iconClass: "bg-primary/10 text-primary" },
];

const revenueValues = [
  { actual: 720, forecast: 760 },
  { actual: 815, forecast: 830 },
  { actual: 890, forecast: 940 },
  { actual: 1010, forecast: 1050 },
  { actual: 1125, forecast: 1160 },
  { actual: 1240, forecast: 1360 },
];

const sourceValues = [35, 24, 18, 13, 10];
const sourceColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const sourceColorClasses = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
const accuracyValues = [86, 88, 87, 91, 93, 94.2];

const activity = {
  en: [
    { title: "AI qualified a high-intent lead", detail: "Mariam Adel · Facebook campaign", time: "8 min", icon: Sparkles, tone: "bg-primary/10 text-primary" },
    { title: "Conversation assigned to Omar", detail: "WhatsApp · Order inquiry #4821", time: "24 min", icon: MessageSquareText, tone: "bg-chart-2/15 text-chart-2" },
    { title: "Invoice payment received", detail: "EGP 18,750 · Nile Market", time: "1 hr", icon: CheckCircle2, tone: "bg-chart-1/15 text-chart-1" },
    { title: "Follow-up task is due today", detail: "Call Ahmed Hassan at 3:30 PM", time: "2 hrs", icon: Clock3, tone: "bg-destructive/10 text-destructive" },
  ],
  ar: [
    { title: "الذكاء الاصطناعي صنّف عميلاً عالي الاهتمام", detail: "مريم عادل · حملة فيسبوك", time: "8 د", icon: Sparkles, tone: "bg-primary/10 text-primary" },
    { title: "تم تعيين المحادثة إلى عمر", detail: "واتساب · استفسار الطلب #4821", time: "24 د", icon: MessageSquareText, tone: "bg-chart-2/15 text-chart-2" },
    { title: "تم استلام دفعة فاتورة", detail: "18,750 ج.م · نايل ماركت", time: "1 س", icon: CheckCircle2, tone: "bg-chart-1/15 text-chart-1" },
    { title: "مهمة متابعة مستحقة اليوم", detail: "الاتصال بأحمد حسن الساعة 3:30 م", time: "2 س", icon: Clock3, tone: "bg-destructive/10 text-destructive" },
  ],
} as const;

function buildChartData(lang: Lang) {
  const c = copy[lang];
  return {
    revenue: revenueValues.map((item, index) => ({ month: c.months[index], ...item })),
    sources: sourceValues.map((value, index) => ({ name: c.sources[index], value })),
    accuracy: accuracyValues.map((value, index) => ({ week: c.weeks[index], value })),
  };
}

function SectionHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-card-foreground sm:text-base">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function MainDashboard() {
  const { lang } = useLanguage();
  const c = copy[lang];
  const data = buildChartData(lang);
  const [lastAction, setLastAction] = useState<number | null>(null);
  const revenueConfig: ChartConfig = {
    actual: { label: c.actual, color: "var(--chart-2)" },
    forecast: { label: c.forecast, color: "var(--chart-1)" },
  };
  const sourceConfig: ChartConfig = {};
  const accuracyConfig: ChartConfig = { value: { label: c.latestScore, color: "var(--chart-2)" } };
  const quickActions = [
    { label: c.addLead, icon: Plus },
    { label: c.startCampaign, icon: WandSparkles },
    { label: c.createInvoice, icon: FileText },
    { label: c.addTask, icon: ListTodo },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{c.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{c.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-2 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-chart-2" />
          </span>
          {c.updated}
        </div>
      </div>

      <section aria-label={c.eyebrow} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", card.iconClass)}>
                <card.icon className="size-4.5" aria-hidden="true" />
              </span>
              {card.delta && (
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold", card.direction === "down" ? "text-destructive" : "text-chart-2")}>
                  {card.direction === "down" ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                  {card.delta}
                </span>
              )}
              {!card.delta && <span className="rounded-full bg-chart-2/15 px-2 py-0.5 text-[10px] font-semibold text-chart-2">LIVE</span>}
            </div>
            <p className="mt-4 text-xl font-bold tabular-nums sm:text-2xl">{card.value}</p>
            <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{c[card.label]}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{c[card.note]}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-12">
        <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 xl:col-span-7">
          <SectionHeading title={c.revenueTitle} subtitle={c.revenueSub} />
          <div className="mt-5 flex gap-4 text-xs text-muted-foreground">
            {[{ label: c.actual, color: "bg-chart-2" }, { label: c.forecast, color: "bg-chart-1" }].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-sm", item.color)} />{item.label}</span>
            ))}
          </div>
          <ChartContainer config={revenueConfig} className="mt-3 h-[260px] w-full aspect-auto">
            <AreaChart data={data.revenue} margin={{ left: 0, right: 8, top: 10, bottom: 0 }} accessibilityLayer>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.02} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={38} tickFormatter={(value) => `${value}k`} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area type="monotone" dataKey="actual" stroke="var(--color-actual)" fill="url(#actualFill)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ChartContainer>
        </article>

        <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 xl:col-span-5">
          <SectionHeading title={c.leadSources} subtitle={c.leadSourcesSub} />
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_160px] xl:grid-cols-[minmax(0,1fr)_150px]">
            <ChartContainer config={sourceConfig} className="h-[210px] w-full aspect-auto">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                <Pie data={data.sources} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={3} strokeWidth={0}>
                  {data.sources.map((entry, index) => <Cell key={entry.name} fill={sourceColors[index]} />)}
                </Pie>
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">2,184</text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">{c.totalLeads}</text>
              </PieChart>
            </ChartContainer>
            <div className="space-y-2.5">
              {data.sources.map((source, index) => (
                <div key={source.name} className="flex items-center gap-2 text-xs">
                  <span className={cn("size-2 shrink-0 rounded-sm", sourceColorClasses[index])} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{source.name}</span>
                  <span className="font-semibold tabular-nums">{source.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-12">
        <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 xl:col-span-4">
          <SectionHeading
            title={c.aiAccuracy}
            subtitle={c.aiAccuracySub}
            action={<span className="rounded-md bg-chart-2/15 px-2 py-1 text-xs font-semibold text-chart-2">94.2%</span>}
          />
          <ChartContainer config={accuracyConfig} className="mt-4 h-[190px] w-full aspect-auto">
            <LineChart data={data.accuracy} margin={{ left: 0, right: 8, top: 10, bottom: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis domain={[80, 100]} tickLine={false} axisLine={false} tickMargin={8} width={34} tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-value)", strokeWidth: 0 }} />
            </LineChart>
          </ChartContainer>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{c.target}</span><span className="font-semibold text-chart-2">+4.2%</span>
          </div>
        </article>

        <article className="rounded-lg border border-border bg-card shadow-sm xl:col-span-5">
          <div className="border-b border-border p-4 sm:px-5">
            <SectionHeading title={c.recentActivity} subtitle={c.recentSub} action={<Button variant="ghost" size="sm">{c.viewAll}</Button>} />
          </div>
          <ul className="divide-y divide-border">
            {activity[lang].map((item) => (
              <li key={item.title} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", item.tone)}><item.icon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 xl:col-span-3">
          <SectionHeading title={c.quickActions} subtitle={c.quickSub} />
          <div className="mt-4 grid gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={action.label}
                variant={index === 0 ? "default" : "outline"}
                className="h-10 w-full justify-start"
                onClick={() => setLastAction(index)}
              >
                <action.icon className="size-4" />
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
          {lastAction !== null && (
            <div role="status" className="mt-3 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-chart-2" />
              <span className="min-w-0 truncate">{quickActions[lastAction]?.label} {c.actionReady}</span>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground"><Radio className="size-3.5 text-chart-2" />{c.automation}</span>
            <span className="font-semibold text-chart-2">98.6%</span>
          </div>
        </article>
      </section>
    </main>
  );
}