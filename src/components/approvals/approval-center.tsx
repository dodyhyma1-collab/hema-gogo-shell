import { useState } from "react";
import { Bell, Check, MessageSquareWarning, Receipt, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Kind = "order" | "ocr" | "message";
type State = "pending" | "approved" | "rejected";
type Item = { id: string; kind: Kind; client: string; channel: string; title: { en: string; ar: string }; detail: { en: string; ar: string }; confidence: number; state: State };
type Note = { id: string; client: string; channel: string; text: string; time: string };

const c = {
  en: {
    title: "Human-in-the-Loop Approval Center", sub: "Review actions AI Hema flagged before they reach clients.",
    all: "All", order: "High-value orders", ocr: "Receipts", message: "Message overrides",
    pending: "Pending", approved: "Approved", rejected: "Rejected", approve: "Approve", reject: "Reject",
    conf: "AI confidence", note: "Optional note to the client", feed: "Client notifications sent", empty: "Nothing waiting for review.",
    msgOk: (n: string) => `Hi ${n}, good news — your request has been approved. Thank you for choosing us.`,
    msgNo: (n: string) => `Hi ${n}, we couldn't approve your request yet. Our team will contact you shortly.`,
    sent: "Client notified via",
  },
  ar: {
    title: "مركز الموافقات البشرية", sub: "راجع الإجراءات التي أشار إليها هيما الذكي قبل وصولها للعملاء.",
    all: "الكل", order: "طلبات عالية القيمة", ocr: "الإيصالات", message: "تعديل الرسائل",
    pending: "قيد الانتظار", approved: "مقبول", rejected: "مرفوض", approve: "قبول", reject: "رفض",
    conf: "ثقة الذكاء الاصطناعي", note: "ملاحظة اختيارية للعميل", feed: "إشعارات العملاء المرسلة", empty: "لا يوجد شيء بانتظار المراجعة.",
    msgOk: (n: string) => `مرحبًا ${n}، تمت الموافقة على طلبك. شكرًا لاختيارك لنا.`,
    msgNo: (n: string) => `مرحبًا ${n}، لم نتمكن من الموافقة على طلبك بعد. سيتواصل معك فريقنا قريبًا.`,
    sent: "تم إشعار العميل عبر",
  },
};

const seed: Item[] = [
  { id: "a1", kind: "order", client: "Nile Pharma", channel: "WhatsApp", confidence: 72, state: "pending",
    title: { en: "Order #5521 — 48,000 EGP", ar: "طلب #5521 — 48,000 ج.م" }, detail: { en: "Above the 25,000 EGP auto-approval limit. New customer, cash on delivery.", ar: "يتجاوز حد الموافقة التلقائية 25,000 ج.م. عميل جديد، دفع عند الاستلام." } },
  { id: "a2", kind: "ocr", client: "Hala Mostafa", channel: "SMS", confidence: 54, state: "pending",
    title: { en: "InstaPay receipt IPN88219911 — 4,700 EGP", ar: "إيصال إنستاباي IPN88219911 — 4,700 ج.م" }, detail: { en: "Amount is 50 EGP short of invoice INV-1043. Reference partly blurred.", ar: "المبلغ أقل بـ 50 ج.م من الفاتورة INV-1043. الرقم المرجعي غير واضح جزئيًا." } },
  { id: "a3", kind: "message", client: "Youssef Amin", channel: "Instagram", confidence: 61, state: "pending",
    title: { en: "Discount promise in auto-reply", ar: "وعد بخصم في الرد التلقائي" }, detail: { en: "AI Hema drafted: “We can give you 20% off today.” Exceeds the 10% discount policy.", ar: "صاغ هيما: «نقدر نديك خصم 20% النهارده.» يتجاوز سياسة الخصم 10%." } },
  { id: "a4", kind: "order", client: "Luxor Hotels Group", channel: "Messenger", confidence: 81, state: "pending",
    title: { en: "Order #5524 — 31,500 EGP", ar: "طلب #5524 — 31,500 ج.م" }, detail: { en: "Repeat customer, prepaid via Paymob. Flagged only for value.", ar: "عميل متكرر، مدفوع مسبقًا عبر Paymob. تمت الإشارة بسبب القيمة فقط." } },
];

const icon: Record<Kind, typeof ShoppingCart> = { order: ShoppingCart, ocr: Receipt, message: MessageSquareWarning };

export function ApprovalCenter() {
  const { lang } = useLanguage();
  const t = c[lang];
  const [items, setItems] = useState(seed);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feed, setFeed] = useState<Note[]>([]);

  const decide = (it: Item, ok: boolean) => {
    setItems((a) => a.map((x) => (x.id === it.id ? { ...x, state: ok ? "approved" : "rejected" } : x)));
    const extra = notes[it.id]?.trim();
    const text = (ok ? t.msgOk(it.client) : t.msgNo(it.client)) + (extra ? ` ${extra}` : "");
    setFeed((f) => [{ id: crypto.randomUUID(), client: it.client, channel: it.channel, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...f]);
    toast.success(`${ok ? t.approved : t.rejected} · ${t.sent} ${it.channel}`);
  };

  const shown = items.filter((i) => filter === "all" || i.kind === filter);
  const pending = shown.filter((i) => i.state === "pending");
  const done = shown.filter((i) => i.state !== "pending");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-2xl font-bold tracking-tight">{t.title}</h1><p className="text-sm text-muted-foreground">{t.sub}</p></div>
        <Badge variant="secondary">{items.filter((i) => i.state === "pending").length} {t.pending}</Badge>
      </header>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="flex-wrap">{(["all", "order", "ocr", "message"] as const).map((k) => <TabsTrigger key={k} value={k}>{t[k]}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          {pending.length === 0 && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{t.empty}</p>}
          {pending.map((it) => {
            const Icon = icon[it.kind];
            return (
              <article key={it.id} className="space-y-3 rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{it.title[lang]}</h3>
                    <p className="text-xs text-muted-foreground">{it.client} · {it.channel}</p>
                    <p className="mt-1 text-sm">{it.detail[lang]}</p>
                  </div>
                  <Badge variant="outline" className={cn(it.confidence < 60 && "border-destructive/40 text-destructive")}>{t.conf} {it.confidence}%</Badge>
                </div>
                <Textarea rows={2} placeholder={t.note} value={notes[it.id] ?? ""} onChange={(e) => setNotes({ ...notes, [it.id]: e.target.value })} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => decide(it, true)}><Check className="size-4" />{t.approve}</Button>
                  <Button className="flex-1" variant="outline" onClick={() => decide(it, false)}><X className="size-4" />{t.reject}</Button>
                </div>
              </article>
            );
          })}
          {done.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border bg-card/60 px-4 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{it.title[lang]}</span>
              <Badge variant={it.state === "approved" ? "default" : "destructive"}>{t[it.state]}</Badge>
            </div>
          ))}
        </div>
        <section className="h-fit rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Bell className="size-4" />{t.feed}</h2>
          {feed.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (
            <ul className="space-y-3">
              {feed.map((n) => (
                <li key={n.id} className="rounded-lg bg-secondary/60 p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">{n.client} · {n.channel} · {n.time}</p>{n.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
