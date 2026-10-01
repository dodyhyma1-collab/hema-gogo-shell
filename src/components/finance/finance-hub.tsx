import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, FileText, Loader2, Plus, Printer, ScanLine, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { useDemoSync } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Status = "verified" | "pending" | "rejected";
type Receipt = { id: string; sender: string; reference: string; amount: number; date: string; invoice: string | null; status: Status; reason?: string | undefined };
type Invoice = { id: string; customer: string; amount: number; paid: boolean };

const c = {
  en: {
    title: "Financial Verification & Payments", sub: "Verify InstaPay transfers, manage Egyptian gateways and issue tax-ready invoices.",
    tOcr: "InstaPay OCR", tGw: "Local gateways", tInv: "E-Invoicing",
    upload: "Upload receipt screenshot", uploadHint: "PNG or JPG of an InstaPay confirmation", scanning: "Reading receipt…",
    extracted: "Extracted details", sender: "Sender", ref: "Reference", amount: "Amount (EGP)", date: "Date", match: "Matched invoice",
    verify: "Match & verify", verified: "Verified", pending: "Pending", rejected: "Rejected", none: "No match",
    history: "Verification queue", approve: "Approve", reject: "Reject", openInv: "Open invoices",
    rAmount: "Amount does not match any open invoice", rDup: "Reference already used", rNoRef: "Reference unreadable — needs review",
    enabled: "Enabled", test: "Test mode", apiKey: "API key", merchant: "Merchant ID", integration: "Integration ID", hmac: "HMAC secret",
    wallet: "Wallet number", fee: "Fee", save: "Save settings", saved: "Settings saved (sample only)", testConn: "Test connection", connOk: "Connection looks good (simulated)",
    customer: "Customer", taxId: "Tax registration no.", item: "Item", qty: "Qty", price: "Unit price", addItem: "Add item",
    vat: "VAT 14%", wht: "Withholding tax 1%", discount: "Discount (EGP)", subtotal: "Subtotal", total: "Total due", print: "Print / PDF", issue: "Issue invoice", issued: "Invoice issued",
    invoice: "Tax invoice", eta: "Formatted for Egyptian Tax Authority e-invoice fields",
  },
  ar: {
    title: "التحقق المالي والمدفوعات", sub: "تحقق من تحويلات إنستاباي، وأدر بوابات الدفع المصرية، وأصدر فواتير ضريبية.",
    tOcr: "قراءة إيصالات إنستاباي", tGw: "بوابات الدفع المحلية", tInv: "الفوترة الإلكترونية",
    upload: "ارفع صورة الإيصال", uploadHint: "صورة PNG أو JPG لتأكيد إنستاباي", scanning: "جارٍ قراءة الإيصال…",
    extracted: "البيانات المستخرجة", sender: "المرسل", ref: "الرقم المرجعي", amount: "المبلغ (ج.م)", date: "التاريخ", match: "الفاتورة المطابقة",
    verify: "مطابقة وتحقق", verified: "تم التحقق", pending: "قيد المراجعة", rejected: "مرفوض", none: "لا يوجد تطابق",
    history: "قائمة التحقق", approve: "قبول", reject: "رفض", openInv: "الفواتير المفتوحة",
    rAmount: "المبلغ لا يطابق أي فاتورة مفتوحة", rDup: "الرقم المرجعي مستخدم من قبل", rNoRef: "الرقم المرجعي غير واضح — يحتاج مراجعة",
    enabled: "مفعّل", test: "وضع الاختبار", apiKey: "مفتاح API", merchant: "رقم التاجر", integration: "رقم التكامل", hmac: "مفتاح HMAC",
    wallet: "رقم المحفظة", fee: "الرسوم", save: "حفظ الإعدادات", saved: "تم الحفظ (بيانات تجريبية)", testConn: "اختبار الاتصال", connOk: "الاتصال يعمل (محاكاة)",
    customer: "العميل", taxId: "رقم التسجيل الضريبي", item: "البند", qty: "الكمية", price: "سعر الوحدة", addItem: "إضافة بند",
    vat: "ضريبة القيمة المضافة 14%", wht: "خصم تحت حساب الضريبة 1%", discount: "خصم (ج.م)", subtotal: "الإجمالي الفرعي", total: "الإجمالي المستحق", print: "طباعة / PDF", issue: "إصدار الفاتورة", issued: "تم إصدار الفاتورة",
    invoice: "فاتورة ضريبية", eta: "منسقة وفق حقول الفاتورة الإلكترونية لمصلحة الضرائب المصرية",
  },
};

const egp = (n: number, lang: "en" | "ar") =>
  new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(n);

const seedInvoices: Invoice[] = [
  { id: "INV-1042", customer: "Nile Pharma", amount: 12500, paid: false },
  { id: "INV-1043", customer: "Delta Foods", amount: 4750, paid: false },
  { id: "INV-1044", customer: "Red Sea Tours", amount: 8200, paid: false },
  { id: "INV-1039", customer: "Cairo Dental Clinic", amount: 3100, paid: true },
];
const seedReceipts: Receipt[] = [
  { id: "r1", sender: "Omar Saleh", reference: "IPN88213045", amount: 3100, date: "2026-09-25", invoice: "INV-1039", status: "verified" },
  { id: "r2", sender: "Hala Mostafa", reference: "IPN88219911", amount: 4700, date: "2026-09-26", invoice: null, status: "pending", reason: "rAmount" },
  { id: "r3", sender: "Unknown", reference: "IPN88213045", amount: 3100, date: "2026-09-26", invoice: null, status: "rejected", reason: "rDup" },
];
const samples = [
  { sender: "Youssef Amin", amount: 8200 },
  { sender: "Hala Mostafa", amount: 4750 },
  { sender: "Mahmoud Adel", amount: 999 },
  { sender: "Omar Saleh", amount: 12500 },
];

const statusStyle: Record<Status, string> = {
  verified: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-accent text-accent-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};
const StatusIcon = ({ s }: { s: Status }) => (s === "verified" ? <CheckCircle2 className="size-3.5" /> : s === "pending" ? <Clock className="size-3.5" /> : <XCircle className="size-3.5" />);

function OcrPanel() {
  const { lang } = useLanguage();
  const t = c[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [receipts, setReceipts] = useState(seedReceipts);
  useDemoSync(
    () => { setInvoices(seedInvoices); setReceipts(seedReceipts); },
    () => { setInvoices([]); setReceipts([]); },
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [draft, setDraft] = useState<{ sender: string; reference: string; amount: string; date: string } | null>(null);
  const [n, setN] = useState(0);

  const onFile = (f?: File) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setScanning(true);
    setDraft(null);
    setTimeout(() => {
      const s = samples[n % samples.length]!;
      setN(n + 1);
      setDraft({ sender: s.sender, reference: `IPN${Math.floor(88220000 + Math.random() * 9999)}`, amount: String(s.amount), date: new Date().toISOString().slice(0, 10) });
      setScanning(false);
    }, 1400);
  };

  const verify = () => {
    if (!draft) return;
    const amount = Number(draft.amount);
    const dup = receipts.some((r) => r.reference === draft.reference && r.status !== "rejected");
    const inv = invoices.find((i) => !i.paid && Math.abs(i.amount - amount) < 0.01);
    let status: Status = "verified";
    let reason: string | undefined;
    if (dup) { status = "rejected"; reason = "rDup"; }
    else if (!/^IPN\d{6,}$/.test(draft.reference)) { status = "pending"; reason = "rNoRef"; }
    else if (!inv) { status = "pending"; reason = "rAmount"; }
    const rec: Receipt = { id: crypto.randomUUID(), sender: draft.sender, reference: draft.reference, amount, date: draft.date, invoice: status === "verified" && inv ? inv.id : null, status, reason };
    if (status === "verified" && inv) setInvoices((a) => a.map((i) => (i.id === inv.id ? { ...i, paid: true } : i)));
    setReceipts((a) => [rec, ...a]);
    toast(t[status]);
    setDraft(null); setPreview(null);
  };

  const setStatus = (id: string, status: Status) => setReceipts((a) => a.map((r) => (r.id === id ? { ...r, status, reason: undefined } : r)));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-4">
        <section className="rounded-xl border bg-card p-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-secondary/50">
            {preview ? <img src={preview} alt="" className="max-h-40 rounded-md object-contain" /> : <Upload className="size-8 text-muted-foreground" />}
            <span className="font-medium">{t.upload}</span>
            <span className="text-xs text-muted-foreground">{t.uploadHint}</span>
          </button>
          {scanning && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t.scanning}</p>}
          {draft && (
            <div className="mt-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><ScanLine className="size-4" />{t.extracted}</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["sender", "reference", "amount", "date"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">{k === "reference" ? t.ref : t[k]}</Label>
                    <Input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} dir="ltr" />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={verify}>{t.verify}</Button>
            </div>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{t.openInv}</h3>
          <ul className="space-y-2 text-sm">
            {invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate"><span className="font-mono text-xs text-muted-foreground">{i.id}</span> · {i.customer}</span>
                <span className="flex shrink-0 items-center gap-2">{egp(i.amount, lang)}<Badge variant="outline" className={statusStyle[i.paid ? "verified" : "pending"]}>{i.paid ? t.verified : t.pending}</Badge></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">{t.history}</h3>
        <ul className="divide-y">
          {receipts.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.sender} <span className="font-mono text-xs text-muted-foreground" dir="ltr">{r.reference}</span></p>
                <p className="text-xs text-muted-foreground">{r.date} · {egp(r.amount, lang)} · {t.match}: {r.invoice ?? t.none}</p>
                {r.reason && <p className="text-xs text-destructive">{t[r.reason as "rAmount"]}</p>}
              </div>
              <Badge variant="outline" className={cn("gap-1", statusStyle[r.status])}><StatusIcon s={r.status} />{t[r.status]}</Badge>
              {r.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "verified")}>{t.approve}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "rejected")}>{t.reject}</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const gateways = [
  { id: "paymob", name: "Paymob", fee: "2.75% + 3 EGP", fields: ["apiKey", "integration", "hmac"] as const },
  { id: "fawry", name: "Fawry", fee: "1.5% (min 2.5 EGP)", fields: ["merchant", "apiKey"] as const },
  { id: "vodafone", name: "Vodafone Cash", fee: "1% ", fields: ["wallet", "merchant"] as const },
];

function GatewaysPanel() {
  const { lang } = useLanguage();
  const t = c[lang];
  const [state, setState] = useState<Record<string, { on: boolean; test: boolean }>>({ paymob: { on: true, test: true }, fawry: { on: true, test: true }, vodafone: { on: false, test: true } });
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {gateways.map((g) => {
        const s = state[g.id] ?? { on: false, test: true };
        return (
          <section key={g.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{g.name}</h3>
                <p className="text-xs text-muted-foreground">{t.fee}: {g.fee}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">{t.enabled}<Switch checked={s.on} onCheckedChange={(v) => setState({ ...state, [g.id]: { ...s, on: v } })} /></div>
            </div>
            {g.fields.map((f) => (
              <div key={f} className="space-y-1">
                <Label className="text-xs">{t[f]}</Label>
                <Input type={f === "hmac" || f === "apiKey" ? "password" : "text"} defaultValue={f === "wallet" ? "010xxxxxxxx" : "sample_" + f} dir="ltr" disabled={!s.on} />
              </div>
            ))}
            <div className="flex items-center justify-between text-xs">{t.test}<Switch checked={s.test} onCheckedChange={(v) => setState({ ...state, [g.id]: { ...s, test: v } })} disabled={!s.on} /></div>
            <div className="mt-auto flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={!s.on} onClick={() => toast.success(t.connOk)}>{t.testConn}</Button>
              <Button size="sm" className="flex-1" onClick={() => toast(t.saved)}>{t.save}</Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

type Line = { id: string; name: string; qty: number; price: number };

function InvoicePanel() {
  const { lang } = useLanguage();
  const t = c[lang];
  const [customer, setCustomer] = useState("Nile Pharma");
  const [taxId, setTaxId] = useState("123-456-789");
  const [lines, setLines] = useState<Line[]>([
    { id: "a", name: "Hema Gogo Business plan (monthly)", qty: 1, price: 4500 },
    { id: "b", name: "WhatsApp automation add-on", qty: 2, price: 850 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [wht, setWht] = useState(true);
  const [no, setNo] = useState(1045);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const net = Math.max(0, subtotal - discount);
    const vat = net * 0.14;
    const w = wht ? net * 0.01 : 0;
    return { subtotal, net, vat, w, total: net + vat - w };
  }, [lines, discount, wht]);

  const upd = (id: string, p: Partial<Line>) => setLines((a) => a.map((l) => (l.id === id ? { ...l, ...p } : l)));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">{t.customer}</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{t.taxId}</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} dir="ltr" /></div>
        </div>
        {lines.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_4rem_6rem_auto] items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">{t.item}</Label><Input value={l.name} onChange={(e) => upd(l.id, { name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t.qty}</Label><Input type="number" min={1} value={l.qty} onChange={(e) => upd(l.id, { qty: Math.max(0, Number(e.target.value)) })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t.price}</Label><Input type="number" min={0} value={l.price} onChange={(e) => upd(l.id, { price: Math.max(0, Number(e.target.value)) })} /></div>
            <Button size="icon" variant="ghost" aria-label="remove" onClick={() => setLines((a) => a.filter((x) => x.id !== l.id))}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setLines((a) => [...a, { id: crypto.randomUUID(), name: "", qty: 1, price: 0 }])}><Plus className="size-4" />{t.addItem}</Button>
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="space-y-1"><Label className="text-xs">{t.discount}</Label><Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} /></div>
          <div className="flex items-center gap-2 pb-2 text-sm"><Switch checked={wht} onCheckedChange={setWht} />{t.wht}</div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { toast.success(`${t.issued} INV-${no}`); setNo(no + 1); }}><FileText className="size-4" />{t.issue}</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />{t.print}</Button>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-6 print:border-0">
        <div className="flex items-start justify-between border-b pb-4">
          <div><h3 className="text-lg font-bold">{t.invoice}</h3><p className="font-mono text-xs text-muted-foreground">INV-{no} · {new Date().toISOString().slice(0, 10)}</p></div>
          <div className="text-end text-sm"><p className="font-semibold">Hema Gogo</p><p className="text-xs text-muted-foreground" dir="ltr">Tax ID 987-654-321</p></div>
        </div>
        <p className="mt-3 text-sm">{t.customer}: <span className="font-medium">{customer}</span> <span className="text-xs text-muted-foreground" dir="ltr">({taxId})</span></p>
        <table className="mt-4 w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr className="border-b"><th className="py-2 text-start">{t.item}</th><th className="text-center">{t.qty}</th><th className="text-end">{t.price}</th></tr></thead>
          <tbody>{lines.map((l) => <tr key={l.id} className="border-b"><td className="py-2">{l.name || "—"}</td><td className="text-center">{l.qty}</td><td className="text-end">{egp(l.qty * l.price, lang)}</td></tr>)}</tbody>
        </table>
        <dl className="mt-4 space-y-1 text-sm">
          {[[t.subtotal, totals.subtotal], [t.discount, -discount], [t.vat, totals.vat], ...(wht ? [[t.wht, -totals.w]] : [])].map(([k, v]) => (
            <div key={k as string} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{egp(v as number, lang)}</dd></div>
          ))}
          <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>{t.total}</dt><dd>{egp(totals.total, lang)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">{t.eta}</p>
      </section>
    </div>
  );
}

export function FinanceHub({ initialTab = "ocr" }: { initialTab?: string }) {
  const { lang } = useLanguage();
  const t = c[lang];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.sub}</p>
      </header>
      <Tabs defaultValue={initialTab} key={initialTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ocr">{t.tOcr}</TabsTrigger>
          <TabsTrigger value="gateways">{t.tGw}</TabsTrigger>
          <TabsTrigger value="invoices">{t.tInv}</TabsTrigger>
        </TabsList>
        <TabsContent value="ocr" className="mt-4"><OcrPanel /></TabsContent>
        <TabsContent value="gateways" className="mt-4"><GatewaysPanel /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><InvoicePanel /></TabsContent>
      </Tabs>
    </main>
  );
}
