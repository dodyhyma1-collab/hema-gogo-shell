import { useEffect, useState } from "react";
import { PackagePlus, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Carrier = "bosta" | "aramex";
const steps = ["created", "picked", "transit", "out", "delivered"] as const;
type Step = (typeof steps)[number];
type Shipment = { awb: string; carrier: Carrier; customer: string; city: string; cod: number; step: Step; updated: string };

const c = {
  en: {
    title: "Shipping Dispatch Hub", sub: "Create Bosta and Aramex shipments, generate AWBs and follow tracking automatically.",
    newS: "New shipment", carrier: "Carrier", customer: "Customer", city: "City", phone: "Phone", cod: "Cash on delivery (EGP)", weight: "Weight (kg)",
    gen: "Generate AWB", genOk: "AWB generated", auto: "Auto-refresh tracking", refresh: "Refresh now", all: "All",
    created: "Created", picked: "Picked up", transit: "In transit", out: "Out for delivery", delivered: "Delivered", awb: "AWB",
    total: "Active shipments", codT: "COD to collect", del: "Delivered today",
  },
  ar: {
    title: "مركز إرسال الشحنات", sub: "أنشئ شحنات بوسطة وأرامكس، وولّد بوالص الشحن، وتابع التتبع تلقائيًا.",
    newS: "شحنة جديدة", carrier: "شركة الشحن", customer: "العميل", city: "المدينة", phone: "الهاتف", cod: "الدفع عند الاستلام (ج.م)", weight: "الوزن (كجم)",
    gen: "توليد بوليصة", genOk: "تم توليد البوليصة", auto: "تحديث التتبع تلقائيًا", refresh: "تحديث الآن", all: "الكل",
    created: "تم الإنشاء", picked: "تم الاستلام", transit: "في الطريق", out: "خرج للتوصيل", delivered: "تم التسليم", awb: "رقم البوليصة",
    total: "شحنات نشطة", codT: "مبالغ التحصيل", del: "تم تسليمها اليوم",
  },
};
const carrierName: Record<Carrier, string> = { bosta: "Bosta", aramex: "Aramex" };
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const makeAwb = (c: Carrier) => (c === "bosta" ? "BST" : "ARX") + Math.floor(10_000_000 + Math.random() * 89_999_999);

const seed: Shipment[] = [
  { awb: "BST48213907", carrier: "bosta", customer: "Hala Mostafa", city: "Tanta", cod: 4750, step: "transit", updated: "08:40" },
  { awb: "ARX77120455", carrier: "aramex", customer: "Nile Pharma", city: "Cairo", cod: 0, step: "out", updated: "09:05" },
  { awb: "BST48213111", carrier: "bosta", customer: "Youssef Amin", city: "Hurghada", cod: 1200, step: "picked", updated: "07:55" },
  { awb: "ARX77120001", carrier: "aramex", customer: "Rania Fouad", city: "Giza", cod: 860, step: "delivered", updated: "Yesterday" },
];

export function DispatchHub() {
  const { lang } = useLanguage();
  const t = c[lang];
  const [list, setList] = useState(seed);
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState<"all" | Carrier>("all");
  const [form, setForm] = useState({ carrier: "bosta" as Carrier, customer: "", city: "Cairo", phone: "", cod: "0", weight: "1" });

  const advance = () =>
    setList((a) => a.map((s) => (s.step !== "delivered" && Math.random() < 0.4 ? { ...s, step: steps[steps.indexOf(s.step) + 1], updated: now() } : s)));

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(advance, 8000);
    return () => clearInterval(id);
  }, [auto]);

  const create = () => {
    if (!form.customer.trim()) return;
    const awb = makeAwb(form.carrier);
    setList((a) => [{ awb, carrier: form.carrier, customer: form.customer, city: form.city, cod: Number(form.cod) || 0, step: "created", updated: now() }, ...a]);
    toast.success(`${t.genOk}: ${awb}`);
    setForm({ ...form, customer: "", phone: "" });
  };

  const shown = list.filter((s) => filter === "all" || s.carrier === filter);
  const active = list.filter((s) => s.step !== "delivered");
  const stats = [
    [t.total, active.length],
    [t.codT, new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(active.reduce((s, x) => s + x.cod, 0))],
    [t.del, list.filter((s) => s.step === "delivered").length],
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold tracking-tight">{t.title}</h1><p className="text-sm text-muted-foreground">{t.sub}</p></header>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(([k, v]) => <div key={k as string} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-bold">{v}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold"><PackagePlus className="size-4" />{t.newS}</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["bosta", "aramex"] as Carrier[]).map((cr) => (
              <Button key={cr} variant={form.carrier === cr ? "default" : "outline"} onClick={() => setForm({ ...form, carrier: cr })}>{carrierName[cr]}</Button>
            ))}
          </div>
          {(["customer", "phone", "city", "cod", "weight"] as const).map((k) => (
            <div key={k} className="space-y-1"><Label className="text-xs">{t[k]}</Label>
              <Input value={form[k]} type={k === "cod" || k === "weight" ? "number" : "text"} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
          <Button className="w-full" onClick={create} disabled={!form.customer.trim()}>{t.gen}</Button>
        </section>
        <section className="min-w-0 rounded-xl border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList><TabsTrigger value="all">{t.all}</TabsTrigger><TabsTrigger value="bosta">Bosta</TabsTrigger><TabsTrigger value="aramex">Aramex</TabsTrigger></TabsList>
            </Tabs>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-2"><Switch checked={auto} onCheckedChange={setAuto} />{t.auto}</span>
              <Button size="sm" variant="outline" onClick={advance}><RefreshCw className="size-3.5" />{t.refresh}</Button>
            </div>
          </div>
          <ul className="divide-y">
            {shown.map((s) => {
              const i = steps.indexOf(s.step);
              return (
                <li key={s.awb} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Truck className="size-4 text-muted-foreground" />
                    <span className="font-mono text-sm" dir="ltr">{s.awb}</span>
                    <Badge variant="secondary">{carrierName[s.carrier]}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">{s.customer} · {s.city}</span>
                    <Badge variant="outline" className={cn(s.step === "delivered" && "border-primary/40 text-primary")}>{t[s.step]}</Badge>
                    <span className="text-xs text-muted-foreground">{s.updated}</span>
                  </div>
                  <div className="flex gap-1">{steps.map((st, j) => <div key={st} title={t[st]} className={cn("h-1.5 flex-1 rounded-full", j <= i ? "bg-primary" : "bg-muted")} />)}</div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
