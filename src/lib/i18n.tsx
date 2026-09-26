import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "ar";

const dict = {
  en: {
    appName: "Hema Gogo",
    search: "Search projects, people, reports…",
    switchWorkspace: "Switch workspace",
    notifications: "Notifications",
    profile: "My profile",
    settings: "Workspace settings",
    billing: "Billing",
    logout: "Log out",
    language: "العربية",
    overview: "Overview",
    newNotif: "new",
    markAllRead: "Mark all read",
    welcomeTitle: "Good morning, Dody",
    welcomeSub: "Here's what's happening across your workspace today.",
    statRevenue: "Revenue",
    statUsers: "Active users",
    statTasks: "Open tasks",
    statUptime: "Uptime",
    recentActivity: "Recent activity",
    viewAll: "View all",
    workspaceConsole: "Workspace console",
    workspaceTools: "Workspace tools",
    aiAssistant: "AI Hema",
    multiChannelInbox: "Multi-Channel Inbox",
    leadDiscovery: "Lead Discovery",
    automationWorkflows: "Automation Workflows",
    salesPipeline: "Sales Pipeline",
    logisticsShipping: "Logistics & Shipping",
    instapayWallets: "InstaPay & Wallets OCR",
    paymentsInvoices: "Payments & Invoices",
    eSignatures: "E-Signatures",
    settingsRbac: "Settings & RBAC",
    toggleSidebar: "Toggle sidebar",
  },
  ar: {
    appName: "هيما جوجو",
    search: "ابحث في المشاريع والأشخاص والتقارير…",
    switchWorkspace: "تبديل مساحة العمل",
    notifications: "الإشعارات",
    profile: "ملفي الشخصي",
    settings: "إعدادات مساحة العمل",
    billing: "الفوترة",
    logout: "تسجيل الخروج",
    language: "English",
    overview: "نظرة عامة",
    newNotif: "جديد",
    markAllRead: "تعيين الكل كمقروء",
    welcomeTitle: "صباح الخير، دودي",
    welcomeSub: "إليك ما يحدث في مساحة عملك اليوم.",
    statRevenue: "الإيرادات",
    statUsers: "المستخدمون النشطون",
    statTasks: "المهام المفتوحة",
    statUptime: "وقت التشغيل",
    recentActivity: "النشاط الأخير",
    viewAll: "عرض الكل",
    workspaceConsole: "لوحة مساحة العمل",
    workspaceTools: "أدوات مساحة العمل",
    aiAssistant: "هيما الذكي",
    multiChannelInbox: "صندوق الوارد متعدد القنوات",
    leadDiscovery: "اكتشاف العملاء المحتملين",
    automationWorkflows: "مسارات الأتمتة",
    salesPipeline: "مسار المبيعات",
    logisticsShipping: "الخدمات اللوجستية والشحن",
    instapayWallets: "قراءة إنستاباي والمحافظ",
    paymentsInvoices: "المدفوعات والفواتير",
    eSignatures: "التوقيعات الإلكترونية",
    settingsRbac: "الإعدادات والصلاحيات",
    toggleSidebar: "فتح أو إغلاق القائمة الجانبية",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

interface LangCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  toggle: () => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LangCtx | null>(null);

function detectInitialLang(): Lang {
  if (typeof navigator !== "undefined" && navigator.language?.startsWith("ar")) {
    return "ar";
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(detectInitialLang());
  }, []);

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const toggle = useCallback(() => setLang((l) => (l === "en" ? "ar" : "en")), []);
  const t = useCallback((key: TKey) => dict[lang][key], [lang]);

  const value = useMemo(() => ({ lang, dir, toggle, t }), [lang, dir, toggle, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
