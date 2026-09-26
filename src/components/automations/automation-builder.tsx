import { useState } from "react";
import { ArrowDown, Copy, FileText, MessageCircle, MessageSquare, Plus, RefreshCw, Tag, Trash2, UserPlus, Webhook, Zap, Database, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TriggerId = "newLead" | "formSubmission" | "messageReceived";
type ActionId = "sendWhatsapp" | "assignTag" | "updateCrm";

const triggers: Record<TriggerId, { icon: typeof Zap; en: string; ar: string; dEn: string; dAr: string }> = {
  newLead: { icon: UserPlus, en: "New Lead", ar: "عميل محتمل جديد", dEn: "When a lead is captured", dAr: "عند التقاط عميل محتمل" },
  formSubmission: { icon: FileText, en: "Form Submission", ar: "إرسال نموذج", dEn: "When a web form is submitted", dAr: "عند إرسال نموذج ويب" },
  messageReceived: { icon: MessageSquare, en: "Message Received", ar: "استلام رسالة", dEn: "When any channel gets a message", dAr: "عند وصول رسالة من أي قناة" },
};
const actions: Record<ActionId, { icon: typeof Zap; en: string; ar: string; dEn: string; dAr: string }> = {
  sendWhatsapp: { icon: MessageCircle, en: "Send WhatsApp", ar: "إرسال واتساب", dEn: "Send a template message", dAr: "إرسال رسالة قالب" },
  assignTag: { icon: Tag, en: "Assign Tag", ar: "إضافة وسم", dEn: "Tag the contact", dAr: "وسم جهة الاتصال" },
  updateCrm: { icon: Database, en: "Update CRM", ar: "تحديث CRM", dEn: "Update contact fields", dAr: "تحديث حقول جهة الاتصال" },
};

type Workflow = { id: string; name: string; trigger: TriggerId; steps: { id: string; action: ActionId; config: string }[]; active: boolean; runs: number };

const seed: Workflow[] = [
  { id: "w1", name: "Welcome new leads", trigger: "newLead", active: true, runs: 1284, steps: [
    { id: "s1", action: "assignTag", config: "new-lead" }, { id: "s2", action: "sendWhatsapp", config: "welcome_ar_v2" }, { id: "s3", action: "updateCrm", config: "stage = Contacted" }] },
  { id: "w2", name: "Form → qualify", trigger: "formSubmission", active: true, runs: 342, steps: [{ id: "s4", action: "updateCrm", config: "source = Website" }, { id: "s5", action: "assignTag", config: "form-lead" }] },
  { id: "w3", name: "After-hours reply", trigger: "messageReceived", active: false, runs: 97, steps: [{ id: "s6", action: "sendWhatsapp", config: "after_hours" }] },
];

const c = {
  en: { title: "Automation Workflows", sub: "Build trigger → action flows and connect external automation tools.", builder: "Visual builder", integrations: "Integration triggers", workflows: "Workflows", newWf: "New workflow", trigger: "Trigger", addAction: "Add action", runs: "runs", active: "Active", test: "Test run", save: "Save", saved: "Workflow saved", tested: "Test run completed — all steps passed", webhookIn: "Incoming webhook URL", webhookOut: "Outgoing webhook (send events to)", copy: "Copy", copied: "Copied", regen: "Regenerate secret", local: "Local automated triggers", connected: "Connected", notConnected: "Not connected", connect: "Connect", events: "Events forwarded", sample: "Sample payload", schedule: "Daily digest at 09:00", idle: "Re-engage leads idle 7 days", overdue: "Invoice overdue reminder", configPh: "Configuration" },
  ar: { title: "مسارات الأتمتة", sub: "أنشئ مسارات من المشغّل إلى الإجراء واربط أدوات الأتمتة الخارجية.", builder: "المنشئ المرئي", integrations: "مشغّلات التكامل", workflows: "المسارات", newWf: "مسار جديد", trigger: "المشغّل", addAction: "إضافة إجراء", runs: "تشغيل", active: "نشط", test: "تشغيل تجريبي", save: "حفظ", saved: "تم حفظ المسار", tested: "اكتمل التشغيل التجريبي — نجحت كل الخطوات", webhookIn: "رابط الويب هوك الوارد", webhookOut: "ويب هوك صادر (إرسال الأحداث إلى)", copy: "نسخ", copied: "تم النسخ", regen: "إعادة إنشاء المفتاح", local: "مشغّلات محلية تلقائية", connected: "متصل", notConnected: "غير متصل", connect: "ربط", events: "الأحداث المرسلة", sample: "مثال على البيانات", schedule: "ملخص يومي الساعة 09:00", idle: "إعادة التواصل مع العملاء الخاملين 7 أيام", overdue: "تذكير بالفواتير المتأخرة", configPh: "الإعدادات" },
};

function Node({ icon: Icon, title, desc, kind, children, onRemove }: { icon: typeof Zap; title: string; desc: string; kind: "trigger" | "action"; children?: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className={cn("w-full max-w-md rounded-xl border bg-card p-4 shadow-sm", kind === "trigger" ? "border-primary/40" : "border-border")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", kind === "trigger" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        {onRemove && <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove"><Trash2 className="size-4" /></Button>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function AutomationBuilder() {
  const { lang } = useLanguage();
  const t = c[lang];
  const [flows, setFlows] = useState(seed);
  const [selId, setSelId] = useState("w1");
  const [secret, setSecret] = useState("hg_sk_7f3a9c21");
  const [conn, setConn] = useState({ make: true, n8n: false });
  const [locals, setLocals] = useState({ schedule: true, idle: true, overdue: false });
  const [outUrl, setOutUrl] = useState("https://hook.eu1.make.com/abc123xyz");
  const wf = flows.find((f) => f.id === selId)!;
  const update = (patch: Partial<Workflow>) => setFlows((fs) => fs.map((f) => (f.id === selId ? { ...f, ...patch } : f)));
  const inUrl = `https://hooks.hemagogo.app/v1/in/${secret}`;
  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success(t.copied); };

  return (
    <main className="flex-1 space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.sub}</p>
      </div>
      <Tabs defaultValue="builder">
        <TabsList><TabsTrigger value="builder">{t.builder}</TabsTrigger><TabsTrigger value="integrations">{t.integrations}</TabsTrigger></TabsList>

        <TabsContent value="builder" className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-sm font-semibold">{t.workflows}</p>
              <Button size="sm" variant="outline" onClick={() => { const id = crypto.randomUUID(); setFlows((f) => [...f, { id, name: t.newWf, trigger: "newLead", steps: [], active: false, runs: 0 }]); setSelId(id); }}><Plus className="size-4" />{t.newWf}</Button>
            </div>
            {flows.map((f) => (
              <button key={f.id} onClick={() => setSelId(f.id)} className={cn("w-full rounded-lg border p-3 text-start transition-colors", f.id === selId ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary")}>
                <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{f.name}</p><span className={cn("size-2 rounded-full", f.active ? "bg-chart-2" : "bg-muted-foreground/40")} /></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{triggers[f.trigger][lang]} · {f.runs.toLocaleString()} {t.runs}</p>
              </button>
            ))}
          </aside>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b p-3">
              <Input value={wf.name} onChange={(e) => update({ name: e.target.value })} className="h-9 max-w-xs font-medium" />
              <label className="flex items-center gap-2 text-sm"><Switch checked={wf.active} onCheckedChange={(v) => update({ active: v })} />{t.active}</label>
              <div className="ms-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.success(t.tested)}><Play className="size-4" />{t.test}</Button>
                <Button size="sm" onClick={() => toast.success(t.saved)}>{t.save}</Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px] p-6">
              <Node icon={triggers[wf.trigger].icon} kind="trigger" title={`${t.trigger}: ${triggers[wf.trigger][lang]}`} desc={lang === "ar" ? triggers[wf.trigger].dAr : triggers[wf.trigger].dEn}>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(triggers) as TriggerId[]).map((k) => (
                    <Button key={k} size="sm" variant={wf.trigger === k ? "default" : "outline"} className="h-7 text-xs" onClick={() => update({ trigger: k })}>{triggers[k][lang]}</Button>
                  ))}
                </div>
              </Node>
              {wf.steps.map((s) => {
                const a = actions[s.action];
                return (
                  <div key={s.id} className="flex w-full flex-col items-center gap-2">
                    <ArrowDown className="size-4 text-muted-foreground" />
                    <Node icon={a.icon} kind="action" title={a[lang]} desc={lang === "ar" ? a.dAr : a.dEn} onRemove={() => update({ steps: wf.steps.filter((x) => x.id !== s.id) })}>
                      <Input value={s.config} placeholder={t.configPh} className="h-8 text-xs" onChange={(e) => update({ steps: wf.steps.map((x) => (x.id === s.id ? { ...x, config: e.target.value } : x)) })} />
                    </Node>
                  </div>
                );
              })}
              <ArrowDown className="size-4 text-muted-foreground" />
              <div className="w-full max-w-md rounded-xl border border-dashed bg-card/70 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t.addAction}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(actions) as ActionId[]).map((k) => {
                    const A = actions[k].icon;
                    return <Button key={k} size="sm" variant="outline" className="h-8 text-xs" onClick={() => update({ steps: [...wf.steps, { id: crypto.randomUUID(), action: k, config: "" }] })}><A className="size-3.5" />{actions[k][lang]}</Button>;
                  })}
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 grid gap-4 lg:grid-cols-2">
          {([["make", "Make.com"], ["n8n", "n8n"]] as const).map(([k, name]) => (
            <section key={k} className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-secondary"><Webhook className="size-4" /></span>
                <div className="flex-1"><p className="font-semibold">{name}</p><p className="text-xs text-muted-foreground">{t.events}: lead.created, form.submitted, message.received</p></div>
                <Badge variant={conn[k] ? "default" : "secondary"}>{conn[k] ? t.connected : t.notConnected}</Badge>
              </div>
              <div className="space-y-1"><p className="text-xs font-medium">{t.webhookIn}</p>
                <div className="flex gap-2"><Input readOnly value={`${inUrl}/${k}`} className="h-9 font-mono text-xs" dir="ltr" /><Button size="sm" variant="outline" onClick={() => copy(`${inUrl}/${k}`)}><Copy className="size-4" /></Button></div>
              </div>
              <div className="space-y-1"><p className="text-xs font-medium">{t.webhookOut}</p>
                <Input value={k === "make" ? outUrl : ""} onChange={(e) => setOutUrl(e.target.value)} placeholder={k === "n8n" ? "https://your-n8n.app/webhook/..." : ""} className="h-9 font-mono text-xs" dir="ltr" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setConn((s) => ({ ...s, [k]: !s[k] }))}>{conn[k] ? t.connected : t.connect}</Button>
                <Button size="sm" variant="outline" onClick={() => setSecret(`hg_sk_${Math.random().toString(16).slice(2, 10)}`)}><RefreshCw className="size-4" />{t.regen}</Button>
              </div>
            </section>
          ))}
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <p className="font-semibold">{t.local}</p>
            {(["schedule", "idle", "overdue"] as const).map((k) => (
              <label key={k} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <Clock className="size-4 text-muted-foreground" /><span className="flex-1">{t[k]}</span>
                <Switch checked={locals[k]} onCheckedChange={(v) => setLocals((s) => ({ ...s, [k]: v }))} />
              </label>
            ))}
          </section>
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <p className="font-semibold">{t.sample}</p>
            <pre dir="ltr" className="overflow-x-auto rounded-lg bg-secondary p-3 text-xs">{JSON.stringify({ event: "lead.created", workspace: "acme-retail", data: { name: "Mona Adel", phone: "+20 100 234 5678", source: "Facebook Ads", score: 86 } }, null, 2)}</pre>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
