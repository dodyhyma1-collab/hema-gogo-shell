import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronsUpDown,
  CreditCard,
  Database,
  Globe,
  LogOut,
  Search,
  Settings,
  User,
} from "lucide-react";
import { tenants, type Tenant } from "@/lib/tenants";
import { useLanguage } from "@/lib/i18n";
import { useDemoData } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return ref;
}

function TenantAvatar({ tenant, size = "md" }: { tenant: Tenant; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg font-semibold text-white",
        tenant.hue,
        size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]",
      )}
    >
      {tenant.initials}
    </span>
  );
}

const menuItem =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent";

function ProjectSwitcher() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Tenant>(tenants[0]!);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <TenantAvatar tenant={active} />
        <span className="hidden max-w-32 truncate sm:inline">
          {lang === "ar" ? active.nameAr : active.name}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute start-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
            {t("switchWorkspace")}
          </p>
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => {
                setActive(tenant);
                setOpen(false);
              }}
              className={menuItem}
              role="option"
              aria-selected={tenant.id === active.id}
            >
              <TenantAvatar tenant={tenant} size="sm" />
              <span className="min-w-0 flex-1 truncate text-start">
                {lang === "ar" ? tenant.nameAr : tenant.name}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {tenant.plan}
              </span>
              {tenant.id === active.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const notifications = [
  { id: 1, title: "New signup in Acme Retail", titleAr: "تسجيل جديد في أكمي للتجزئة", time: "2m", unread: true },
  { id: 2, title: "Monthly report is ready", titleAr: "التقرير الشهري جاهز", time: "1h", unread: true },
  { id: 3, title: "Atlas Logistics upgraded plan", titleAr: "أطلس قامت بترقية الباقة", time: "3h", unread: true },
  { id: 4, title: "Backup completed", titleAr: "اكتمل النسخ الاحتياطي", time: "1d", unread: false },
];

function NotificationsMenu() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const ref = useClickOutside(() => setOpen(false));
  const unread = items.filter((n) => n.unread).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t("notifications")}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
            <p className="text-sm font-semibold">{t("notifications")}</p>
            <button
              onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("markAllRead")}
            </button>
          </div>
          {items.map((n) => (
            <div key={n.id} className={cn(menuItem, "items-start")}>
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  n.unread ? "bg-primary" : "bg-transparent",
                )}
              />
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-sm">{lang === "ar" ? n.titleAr : n.title}</span>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </span>
              {n.unread && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t("newNotif")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 shadow-sm transition-colors hover:bg-accent sm:pe-3"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          DH
        </span>
        <span className="hidden text-start sm:block">
          <span className="block text-xs font-semibold leading-tight">Dody Hyma</span>
          <span className="block text-[10px] leading-tight text-muted-foreground">Owner</span>
        </span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <button className={menuItem}>
            <User className="h-4 w-4 text-muted-foreground" /> {t("profile")}
          </button>
          <button className={menuItem}>
            <Settings className="h-4 w-4 text-muted-foreground" /> {t("settings")}
          </button>
          <button className={menuItem}>
            <CreditCard className="h-4 w-4 text-muted-foreground" /> {t("billing")}
          </button>
          <div className="my-1 h-px bg-border" />
          <button className={cn(menuItem, "text-destructive hover:bg-destructive/10")}>
            <LogOut className="h-4 w-4" /> {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const { t, toggle } = useLanguage();
  const demo = useDemoData();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-16 w-full items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <SidebarTrigger
          aria-label={t("toggleSidebar")}
          title={t("toggleSidebar")}
          className="h-9 w-9 shrink-0 border border-border bg-card shadow-sm hover:bg-accent"
        />

        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
            HG
          </span>
          <span className="hidden text-base font-bold tracking-tight md:inline">
            {t("appName")}
          </span>
        </div>

        <div className="h-6 w-px shrink-0 bg-border" />

        <ProjectSwitcher />

        {/* Global search */}
        <div className="relative min-w-0 flex-1 sm:max-w-md sm:ms-auto">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("search")}
            className="h-9 w-full rounded-lg border border-input bg-card ps-9 pe-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={demo.toggle}
            aria-pressed={demo.on}
            title={demo.on ? t("demoClear") : t("demoFill")}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition-colors",
              demo.on ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            <Database className="h-4 w-4" />
            <span className="hidden lg:inline">{demo.on ? t("demoOn") : t("demoOff")}</span>
          </button>
          <button
            onClick={toggle}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t("language")}</span>
          </button>
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
