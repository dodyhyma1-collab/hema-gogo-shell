import { useState } from "react";
import { toast } from "sonner";
import { Bot, CheckCircle2, CreditCard, Facebook, FileText, Image as ImageIcon, Inbox, Instagram, Link2, MessageCircle, Send, Sparkles as Wand, UserCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Source = "form" | "facebook" | "instagram" | "whatsapp";
type Stage = "new" | "negotiating" | "awaiting_payment" | "paid" | "designing" | "review" | "delivered";
type Msg = { from: "client" | "ai"; text: string };
type Job = {
  id: string; client: string; phone: string; source: Source; request: string; stage: Stage;
  brief: { colors?: string; budget?: number; deadline?: string }; price?: number; payLink?: string; chat: Msg[]; concepts: string[]; chosen?: number;
};

const seed: Job[] = [
  { id: "J-301", client: "Mariam Adel", phone: "+201012345678", source: "whatsapp", request: "Logo for my new coffee shop in Zamalek", stage: "new", brief: {}, chat: [{ from: "client", text: "Hi, I need a logo for my coffee shop" }], concepts: [] },
  { id: "J-302", client: "Karim Nabil", phone: "+201156789012", source: "instagram", request: "Brand identity for fitness studio", stage: "new", brief: {}, chat: [{ from: "client", text: "How much for a full logo + colors?" }], concepts: [] },
  { id: "J-303", client: "Salma Fathy", phone: "+201223344556", source: "form", request: "Minimal logo for a skincare line", stage: "new", brief: {}, chat: [{ from: "client", text: "Submitted website form: skincare logo" }], concepts: [] },
  { id: "J-304", client: "Ahmed Reda", phone: "+201099887766", source: "facebook", request: "Logo refresh for car rental", stage: "new", brief: {}, chat: [{ from: "client", text: "Can you redesign our old logo?" }], concepts: [] },
];

const srcIcon = { form: FileText, facebook: Facebook, instagram: Instagram, whatsapp: MessageCircle } as const;
const stageLabel: Record<Stage, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديد" }, negotiating: { en: "Negotiating", ar: "تفاوض" }, awaiting_payment: { en: "Awaiting payment", ar: "بانتظار الدفع" },
  paid: { en: "Paid", ar: "مدفوع" }, designing: { en: "Designing", ar: "جارٍ التصميم" }, review: { en: "Human review", ar: "مراجعة بشرية" }, delivered: { en: "Delivered", ar: "تم التسليم" },
};
const palettes = [["#0f766e", "#f59e0b"], ["#1e3a8a", "#f43f5e"], ["#111827", "#10b981"], ["#7c2d12", "#fde68a"]];

function conceptSvg(name: string, i: number, colors?: string) {
  const [a, b] = palettes[i % palettes.length]!;
  const initial = name.trim().charAt(0).toUpperCase() || "H";
  const shapes = [
    `<circle cx="60" cy="60" r="44" fill="${a}"/><circle cx="60" cy="60" r="28" fill="${b}"/>`,
    `<rect x="18" y="18" width="84" height="84" rx="20" fill="${a}"/><path d="M30 90 L60 30 L90 90 Z" fill="${b}"/>`,
    `<path d="M60 14 L104 60 L60 106 L16 60 Z" fill="${a}"/><circle cx="60" cy="60" r="16" fill="${b}"/>`,
    `<rect x="14" y="40" width="92" height="40" rx="20" fill="${b}"/><circle cx="40" cy="60" r="24" fill="${a}"/>`,
  ][i % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#fff"/>${shapes}<text x="60" y="70" text-anchor="middle" font-family="Arial" font-weight="900" font-size="28" fill="#fff">${initial}</text></svg>`;
  void colors;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function AgentHub() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const L = (en: string, a: string) => (ar ? a : en);
  const [jobs, setJobs] = useState(seed);
  const [activeId, setActiveId] = useState("J-301");
  const [rules, setRules] = useState({ base: 3500, min: 2500, rush: 30, maxDiscount: 15, gateway: "instapay" as "instapay" | "fawry" });
  const [hooks, setHooks] = useState({ form: true, facebook: true, instagram: true, whatsapp: true });
  const [designTool, setDesignTool] = useState<"midjourney" | "dalle" | "canva">("dalle");
  const [autoGen, setAutoGen] = useState(true);
  const [reply, setReply] = useState("");
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [designPrompt, setDesignPrompt] = useState("");

  const job = jobs.find((j) => j.id === activeId)!;
  const update = (id: string, fn: (j: Job) => Job) => setJobs((cur) => cur.map((j) => (j.id === id ? fn(j) : j)));

  const fetchLeads = () => {
    const n = jobs.length + 301;
    const sources = (Object.keys(hooks) as Source[]).filter((k) => hooks[k]);
    if (!sources.length) return toast.error(L("Enable at least one source", "فعّل مصدراً واحداً على الأقل"));
    const src = sources[n % sources.length]!;
    setJobs((cur) => [{ id: `J-${n}`, client: ["Nour Hany", "Omar Tamer", "Laila Sami"][n % 3]!, phone: `+2010${Math.floor(10000000 + Math.random() * 89999999)}`, source: src, request: L("Logo for a new bakery brand", "شعار لعلامة مخبوزات جديدة"), stage: "new", brief: {}, chat: [{ from: "client", text: L("Hello! Need a logo, what are your prices?", "أهلاً! محتاج لوجو، الأسعار كام؟") }], concepts: [] }, ...cur]);
    toast.success(L(`New inquiry from ${src}`, `استفسار جديد من ${src}`));
  };

  const generate = (id: string) => {
    update(id, (j) => ({ ...j, stage: "designing" }));
    setTimeout(() => {
      update(id, (j) => ({ ...j, stage: "review", concepts: [0, 1, 2, 3].map((i) => conceptSvg(j.client, i, j.brief.colors)), chosen: 0 }));
      toast.success(L(`4 logo concepts generated via ${designTool}`, `تم توليد 4 تصاميم عبر ${designTool}`));
    }, 1400);
  };

  /** Rule-based negotiation: collects brief, prices using owner rules, sends payment link. */
  const negotiate = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setReply("");
    const j = job;
    const brief = { ...j.brief };
    const num = t.replace(/[,٬]/g, "").match(/\d{3,6}/);
    if (/colou?r|لون|ألوان|#|blue|green|red|gold|black|أزرق|أخضر|أحمر|ذهبي|أسود/i.test(t)) brief.colors = t;
    if (num && /budget|egp|جنيه|ميزانية|pay|price|سعر/i.test(t)) brief.budget = +num[0];
    else if (num && !brief.budget) brief.budget = +num[0];
    if (/day|week|deadline|tomorrow|يوم|أسبوع|بكرة|موعد/i.test(t)) brief.deadline = t;
    let ai: string;
    let stage: Stage = "negotiating";
    let price = j.price;
    let payLink = j.payLink;
    if (!brief.colors) ai = L("Great! What brand colors do you prefer?", "رائع! ما الألوان المفضلة لعلامتك؟");
    else if (!brief.budget) ai = L("Got it. What's your budget in EGP?", "تمام. ما الميزانية بالجنيه؟");
    else if (!brief.deadline) ai = L("And when do you need it delivered?", "ومتى تحتاج التسليم؟");
    else {
      const rush = /tomorrow|24|1 day|بكرة|يوم واحد/i.test(brief.deadline) ? rules.rush / 100 : 0;
      const ask = Math.round(rules.base * (1 + rush));
      const floor = Math.max(rules.min, Math.round(ask * (1 - rules.maxDiscount / 100)));
      price = brief.budget! >= ask ? ask : brief.budget! >= floor ? brief.budget! : floor;
      payLink = rules.gateway === "instapay" ? `https://ipn.eg/S/hemagogo/instapay/${j.id}?amount=${price}` : `https://fawry.com/pay/HG${j.id.slice(2)}?amount=${price}`;
      stage = "awaiting_payment";
      ai = brief.budget! < floor
        ? L(`Our best price is ${price} EGP (that's our minimum for this scope). Pay here to start: ${payLink}`, `أفضل سعر لدينا ${price} جنيه (الحد الأدنى لهذا العمل). ادفع هنا للبدء: ${payLink}`)
        : L(`Deal at ${price} EGP${rush ? " incl. rush delivery" : ""}. Pay via ${rules.gateway === "instapay" ? "InstaPay" : "Fawry"}: ${payLink}`, `اتفقنا على ${price} جنيه${rush ? " شاملة التسليم العاجل" : ""}. ادفع عبر ${rules.gateway === "instapay" ? "إنستاباي" : "فوري"}: ${payLink}`);
    }
    update(j.id, (x) => ({ ...x, brief, price, payLink, stage, chat: [...x.chat, { from: "client", text: t }, { from: "ai", text: ai }] }));
  };

  const verifyPayment = () => {
    update(job.id, (j) => ({ ...j, stage: "paid", chat: [...j.chat, { from: "ai", text: L("Payment verified ✅ Starting your logo concepts now.", "تم التحقق من الدفع ✅ نبدأ تصميم الشعارات الآن.") }] }));
    toast.success(L("Payment verified", "تم التحقق من الدفع"));
    if (autoGen) generate(job.id);
  };

  const deliver = (id: string) => {
    const target = jobs.find((x) => x.id === id)!;
    update(id, (j) => ({ ...j, stage: "delivered", chat: [...j.chat, { from: "ai", text: L("Your final logo files (SVG, PNG, PDF) were sent on WhatsApp 🎉", "تم إرسال ملفات الشعار النهائية (SVG وPNG وPDF) على واتساب 🎉") }] }));
    setHandoffOpen(false);
    toast.success(L(`Final files sent to ${target.phone} via WhatsApp`, `تم إرسال الملفات إلى ${target.phone} عبر واتساب`));
  };

  const reviewCount = jobs.filter((j) => j.stage === "review").length;

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="size-6 text-primary" />{L("Autonomous AI Agent & Freelance Automation Hub", "مركز الوكيل الذكي المستقل وأتمتة العمل الحر")}</h1>
          <p className="text-sm text-muted-foreground">{L("From inquiry to negotiation, payment, AI design and human-approved delivery.", "من الاستفسار إلى التفاوض والدفع والتصميم بالذكاء الاصطناعي والتسليم بعد موافقة بشرية.")}</p>
        </div>
        <Button onClick={() => setHandoffOpen(true)} disabled={!reviewCount && job.stage !== "review"}><UserCheck />{L("Review queue", "قائمة المراجعة")} <Badge variant="secondary">{reviewCount}</Badge></Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="flex items-center gap-2 font-semibold"><Inbox className="size-4 text-primary" />{L("Lead & Inquiry Stream", "تدفق العملاء والاستفسارات")}</h2>
            <Button size="sm" variant="outline" onClick={fetchLeads}>{L("Fetch", "جلب")}</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 border-b border-border p-3 text-xs">
            {(Object.keys(hooks) as Source[]).map((k) => { const I = srcIcon[k]; return (
              <label key={k} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"><span className="flex items-center gap-1.5 capitalize"><I className="size-3.5" />{k === "form" ? L("Forms", "النماذج") : k}</span><Switch checked={hooks[k]} onCheckedChange={(v) => setHooks({ ...hooks, [k]: v })} /></label>
            ); })}
          </div>
          <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {jobs.map((j) => { const I = srcIcon[j.source]; return (
              <li key={j.id}>
                <button onClick={() => setActiveId(j.id)} className={cn("flex w-full items-start gap-3 p-3 text-start hover:bg-accent", j.id === activeId && "bg-accent")}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><I className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{j.client}</span><Badge variant="outline" className="shrink-0 text-[10px]">{stageLabel[j.stage][lang]}</Badge></span><span className="block truncate text-xs text-muted-foreground">{j.request}</span></span>
                </button>
              </li>
            ); })}
          </ul>
        </section>

        <Tabs defaultValue="negotiation" className="min-w-0">
          <TabsList>
            <TabsTrigger value="negotiation"><CreditCard className="me-1.5 size-3.5" />{L("Smart Negotiation", "التفاوض الذكي")}</TabsTrigger>
            <TabsTrigger value="design"><ImageIcon className="me-1.5 size-3.5" />{L("AI Design", "التصميم بالذكاء")}</TabsTrigger>
          </TabsList>

          <TabsContent value="negotiation" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex min-h-[480px] flex-col rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <div><p className="text-sm font-semibold">{job.client} · {job.id}</p><p className="text-xs text-muted-foreground">{job.request}</p></div>
                {job.stage === "awaiting_payment" && <Button size="sm" onClick={verifyPayment}><CheckCircle2 />{L("Verify payment", "تأكيد الدفع")}</Button>}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {job.chat.map((m, i) => (
                  <div key={i} className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm break-words", m.from === "client" ? "bg-secondary" : "ms-auto bg-primary text-primary-foreground")}>
                    {m.from === "ai" && <span className="mb-0.5 block text-[10px] font-semibold opacity-80">AI Hema</span>}{m.text}
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">{L("Simulate the client's reply:", "حاكِ رد العميل:")}</p>
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); negotiate(reply); }}>
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={L("e.g. Navy and gold colors", "مثال: ألوان كحلي وذهبي")} disabled={job.stage !== "new" && job.stage !== "negotiating"} />
                  <Button type="submit" size="icon" aria-label="Send" disabled={job.stage !== "new" && job.stage !== "negotiating"}><Send className="rtl:rotate-180" /></Button>
                </form>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline">{L("Colors", "الألوان")}: {job.brief.colors ? "✓" : "—"}</Badge>
                  <Badge variant="outline">{L("Budget", "الميزانية")}: {job.brief.budget ?? "—"}</Badge>
                  <Badge variant="outline">{L("Deadline", "الموعد")}: {job.brief.deadline ? "✓" : "—"}</Badge>
                  {job.payLink && <Badge className="gap-1"><Link2 className="size-3" />{job.price} EGP</Badge>}
                </div>
              </div>
            </div>
            <aside className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">{L("Owner pricing rules", "قواعد التسعير للمالك")}</h3>
              {([["base", L("Base price (EGP)", "السعر الأساسي")], ["min", L("Minimum price", "الحد الأدنى")], ["rush", L("Rush fee %", "رسوم الاستعجال %")], ["maxDiscount", L("Max discount %", "أقصى خصم %")]] as const).map(([k, label]) => (
                <div key={k} className="space-y-1"><Label className="text-xs">{label}</Label><Input type="number" value={rules[k]} onChange={(e) => setRules({ ...rules, [k]: +e.target.value })} /></div>
              ))}
              <div className="space-y-1"><Label className="text-xs">{L("Payment link via", "رابط الدفع عبر")}</Label>
                <div className="grid grid-cols-2 gap-2">{(["instapay", "fawry"] as const).map((g) => <Button key={g} size="sm" variant={rules.gateway === g ? "default" : "outline"} onClick={() => setRules({ ...rules, gateway: g })}>{g === "instapay" ? "InstaPay" : "Fawry"}</Button>)}</div>
              </div>
            </aside>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">{L("AI Design Integration", "تكامل التصميم بالذكاء الاصطناعي")}</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {([["midjourney", "Midjourney"], ["dalle", "DALL·E"], ["canva", "Canva Webhook"]] as const).map(([k, n]) => (
                  <button key={k} onClick={() => setDesignTool(k)} className={cn("rounded-md border p-3 text-start text-sm", designTool === k ? "border-primary bg-primary/5" : "border-border")}>
                    <p className="font-medium">{n}</p><p className="text-xs text-muted-foreground">{designTool === k ? L("Connected (simulated)", "متصل (محاكاة)") : L("Click to use", "اضغط للاستخدام")}</p>
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center justify-between rounded-md border border-border p-3 text-sm">{L("Auto-generate concepts when payment is verified", "توليد التصاميم تلقائياً عند تأكيد الدفع")}<Switch checked={autoGen} onCheckedChange={setAutoGen} /></label>
              <div className="mt-3 flex gap-2">
                <Input value={designPrompt} onChange={(e) => setDesignPrompt(e.target.value)} placeholder={L(`Prompt for ${job.client}: e.g. minimal coffee bean mark`, `وصف لتصميم ${job.client}`)} />
                <Button onClick={() => generate(job.id)} disabled={job.stage === "designing"}><Wand />{L("Generate", "توليد")}</Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">{L("Logo concepts", "التصاميم المقترحة")} · {job.client}</h3><Badge variant="outline">{stageLabel[job.stage][lang]}</Badge></div>
              {job.stage === "designing" ? <p className="py-10 text-center text-sm text-muted-foreground">{L("Generating concepts…", "جارٍ توليد التصاميم…")}</p> : job.concepts.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {job.concepts.map((src, i) => (
                    <button key={i} onClick={() => update(job.id, (j) => ({ ...j, chosen: i }))} className={cn("overflow-hidden rounded-md border-2", job.chosen === i ? "border-primary" : "border-transparent")}><img src={src} alt={`Concept ${i + 1}`} className="aspect-square w-full" /></button>
                  ))}
                </div>
              ) : <p className="py-10 text-center text-sm text-muted-foreground">{L("No concepts yet. Verify payment or click Generate.", "لا توجد تصاميم بعد. أكّد الدفع أو اضغط توليد.")}</p>}
              {job.stage === "review" && <Button className="mt-3" onClick={() => setHandoffOpen(true)}><UserCheck />{L("Open handoff review", "فتح مراجعة التسليم")}</Button>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={handoffOpen} onOpenChange={setHandoffOpen}>
        <SheetContent side={ar ? "left" : "right"} className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{L("Client Handoff & Approval", "تسليم العميل والموافقة")}</SheetTitle>
            <SheetDescription>{L("Review before final files are sent to the client on WhatsApp.", "راجع قبل إرسال الملفات النهائية للعميل على واتساب.")}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            {jobs.filter((j) => j.stage === "review").map((j) => (
              <article key={j.id} className={cn("rounded-lg border p-3", j.id === activeId ? "border-primary" : "border-border")} onClick={() => setActiveId(j.id)}>
                <div className="flex items-center justify-between"><p className="font-semibold">{j.client}</p><span className="text-sm font-medium">{j.price ?? "—"} EGP</span></div>
                <p className="text-xs text-muted-foreground">{j.phone} · {j.request}</p>
                {j.concepts[j.chosen ?? 0] && <img src={j.concepts[j.chosen ?? 0]} alt="Selected concept" className="mt-3 aspect-square w-full rounded-md border border-border" />}
                <p className="mt-2 text-xs text-muted-foreground">{L("Files: logo.svg, logo.png, logo.pdf", "الملفات: logo.svg وlogo.png وlogo.pdf")}</p>
                <div className="mt-3 flex gap-2">
                  <Button className="flex-1" onClick={() => deliver(j.id)}><MessageCircle />{L("Approve & send", "موافقة وإرسال")}</Button>
                  <Button variant="outline" onClick={() => { update(j.id, (x) => ({ ...x, concepts: [], stage: "paid" })); toast(L("Sent back for regeneration", "أعيد للتوليد مجدداً")); }}>{L("Redo", "إعادة")}</Button>
                </div>
              </article>
            ))}
            {!jobs.some((j) => j.stage === "review") && <p className="py-10 text-center text-sm text-muted-foreground">{L("Nothing waiting for review.", "لا شيء بانتظار المراجعة.")}</p>}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
