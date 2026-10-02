import { setAppState, useAppState } from "@/lib/app-state";
import { useMemo, useState } from "react";
import { Bot, Facebook, Instagram, MessageCircle, MessageSquare, Phone, Mail, MapPin, Send, UserRound, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Channel = "whatsapp" | "messenger" | "instagram" | "sms";
type Msg = { from: "customer" | "agent" | "ai"; text: string; time: string };
type Conversation = {
  id: string; name: string; channel: Channel; unread: number; assignedToMe: boolean;
  status: "new" | "qualified" | "negotiation" | "customer"; score: number;
  phone: string; email: string; city: string; messages: Msg[]; activity: { en: string; ar: string; time: string }[];
};

const channelMeta: Record<Channel, { icon: typeof MessageCircle; label: string; cls: string }> = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp", cls: "bg-chart-2/15 text-chart-2" },
  messenger: { icon: Facebook, label: "Messenger", cls: "bg-chart-1/15 text-chart-1" },
  instagram: { icon: Instagram, label: "Instagram", cls: "bg-chart-5/15 text-chart-5" },
  sms: { icon: MessageSquare, label: "SMS", cls: "bg-chart-4/15 text-chart-4" },
};

const seed: Conversation[] = [
  { id: "c1", name: "Mona Adel", channel: "whatsapp", unread: 2, assignedToMe: true, status: "negotiation", score: 86, phone: "+20 100 234 5678", email: "mona.adel@mail.com", city: "Cairo",
    messages: [{ from: "customer", text: "Hi, is the enterprise plan available with Arabic support?", time: "09:12" }, { from: "ai", text: "Yes! Full Arabic support is included. Would you like a demo?", time: "09:12" }, { from: "customer", text: "Great, what is the price for 20 seats?", time: "09:15" }],
    activity: [{ en: "Opened pricing email", ar: "فتحت بريد الأسعار", time: "Yesterday" }, { en: "Moved to Negotiation", ar: "نُقلت إلى التفاوض", time: "2d" }, { en: "Demo booked", ar: "تم حجز عرض توضيحي", time: "5d" }] },
  { id: "c2", name: "Karim Hassan", channel: "messenger", unread: 1, assignedToMe: false, status: "new", score: 42, phone: "+20 122 876 1100", email: "karim.h@mail.com", city: "Alexandria",
    messages: [{ from: "customer", text: "Where is my order #48213?", time: "08:40" }],
    activity: [{ en: "Order #48213 shipped", ar: "تم شحن الطلب 48213", time: "1d" }] },
  { id: "c3", name: "Sara Nabil", channel: "instagram", unread: 0, assignedToMe: true, status: "qualified", score: 71, phone: "+20 111 555 0199", email: "sara.n@mail.com", city: "Giza",
    messages: [{ from: "customer", text: "Loved your latest post! Do you ship to Giza?", time: "Yesterday" }, { from: "agent", text: "Absolutely, delivery takes 1–2 days.", time: "Yesterday" }],
    activity: [{ en: "Commented on post", ar: "علّقت على منشور", time: "1d" }, { en: "Lead qualified", ar: "تم تأهيل العميل", time: "1d" }] },
  { id: "c4", name: "Ahmed Fathy", channel: "sms", unread: 3, assignedToMe: true, status: "customer", score: 93, phone: "+20 109 330 2244", email: "a.fathy@mail.com", city: "Mansoura",
    messages: [{ from: "customer", text: "Please send the invoice for March.", time: "07:55" }],
    activity: [{ en: "Paid invoice INV-1022", ar: "دفع الفاتورة INV-1022", time: "30d" }, { en: "Renewed contract", ar: "جدد العقد", time: "60d" }] },
  { id: "c5", name: "Laila Samir", channel: "whatsapp", unread: 0, assignedToMe: false, status: "qualified", score: 64, phone: "+20 128 400 7788", email: "laila.s@mail.com", city: "Tanta",
    messages: [{ from: "customer", text: "Can I pay with InstaPay?", time: "Mon" }, { from: "ai", text: "Yes, InstaPay and mobile wallets are supported.", time: "Mon" }],
    activity: [{ en: "Asked about payments", ar: "سألت عن الدفع", time: "3d" }] },
];

const templates = {
  sales: [
    { en: "Thanks for your interest! Here's our pricing overview.", ar: "شكرًا لاهتمامك! إليك نظرة عامة على الأسعار." },
    { en: "Would you like to book a quick demo this week?", ar: "هل تود حجز عرض توضيحي سريع هذا الأسبوع؟" },
    { en: "I can offer 10% off if you confirm today.", ar: "يمكنني تقديم خصم 10% إذا أكدت اليوم." },
  ],
  support: [
    { en: "Sorry for the inconvenience, I'm checking this now.", ar: "نعتذر عن الإزعاج، أتحقق من ذلك الآن." },
    { en: "Your order is on the way and will arrive within 48 hours.", ar: "طلبك في الطريق وسيصل خلال 48 ساعة." },
    { en: "I've sent the invoice to your email.", ar: "لقد أرسلت الفاتورة إلى بريدك الإلكتروني." },
  ],
};

const copy = {
  en: { title: "Inbox", unread: "Unread", mine: "Assigned to Me", all: "All", search: "Search conversations…", auto: "AI Hema Auto-Reply", autoOn: "AI Hema will answer new messages automatically.", type: "Type a reply…", send: "Send", sales: "Sales", support: "Support", profile: "Customer profile", score: "Lead score", history: "Activity history", empty: "No conversations here.", pick: "Select a conversation", status: { new: "New", qualified: "Qualified", negotiation: "Negotiation", customer: "Customer" }, aiReplied: "AI Hema replied", you: "You" },
  ar: { title: "صندوق الوارد", unread: "غير مقروء", mine: "مُسند إليّ", all: "الكل", search: "ابحث في المحادثات…", auto: "الرد التلقائي من هيما", autoOn: "سيرد هيما على الرسائل الجديدة تلقائيًا.", type: "اكتب ردًا…", send: "إرسال", sales: "المبيعات", support: "الدعم", profile: "ملف العميل", score: "تقييم العميل", history: "سجل النشاط", empty: "لا توجد محادثات هنا.", pick: "اختر محادثة", status: { new: "جديد", qualified: "مؤهل", negotiation: "تفاوض", customer: "عميل" }, aiReplied: "رد هيما الذكي", you: "أنت" },
};

function ChannelBadge({ channel }: { channel: Channel }) {
  const m = channelMeta[channel];
  return <span className={cn("inline-flex size-5 items-center justify-center rounded-full", m.cls)} title={m.label}><m.icon className="size-3" /></span>;
}

export function UnifiedInbox() {
  const { lang } = useLanguage();
  const c = copy[lang];
  const [convos, setConvos] = useState(seed);
  const filter = useAppState((st) => st.inboxFilter);
  const setFilter = (f: typeof filter) => setAppState({ inboxFilter: f });
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>("c1");
  const [draft, setDraft] = useState("");
  const [autoReply, setAutoReply] = useState(true);
  const [tplTab, setTplTab] = useState<"sales" | "support">("sales");
  const [profileOpen, setProfileOpen] = useState(false);

  const list = useMemo(() => convos.filter((x) =>
    (filter === "all" || (filter === "unread" ? x.unread > 0 : x.assignedToMe)) &&
    x.name.toLowerCase().includes(query.toLowerCase())), [convos, filter, query]);
  const active = convos.find((x) => x.id === activeId) ?? null;
  const counts = { unread: convos.filter((x) => x.unread).length, mine: convos.filter((x) => x.assignedToMe).length, all: convos.length };

  const open = (id: string) => { setActiveId(id); setConvos((cs) => cs.map((x) => (x.id === id ? { ...x, unread: 0 } : x))); };
  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const send = () => {
    if (!active || !draft.trim()) return;
    const text = draft.trim(); const id = active.id; setDraft("");
    setConvos((cs) => cs.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { from: "agent", text, time: now() }] } : x)));
    if (autoReply) {
      setTimeout(() => {
        setConvos((cs) => cs.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { from: "customer", text: lang === "ar" ? "شكرًا، هل يمكنكم تأكيد ذلك؟" : "Thanks, can you confirm that?", time: now() }, { from: "ai", text: lang === "ar" ? "بالتأكيد! تم التأكيد وسيتابع معك فريقنا قريبًا." : "Of course! Confirmed — our team will follow up shortly.", time: now() }] } : x)));
        toast.success(c.aiReplied);
      }, 1200);
    }
  };

  const Profile = active && (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">{active.name.split(" ").map((p) => p[0]).join("")}</div>
        <div><p className="font-semibold">{active.name}</p><Badge variant="secondary">{c.status[active.status]}</Badge></div>
      </div>
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /><span dir="ltr">{active.phone}</span></p>
        <p className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{active.email}</p>
        <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{active.city}</p>
        <p className="flex items-center gap-2"><ChannelBadge channel={active.channel} />{channelMeta[active.channel].label}</p>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm"><span>{c.score}</span><span className="font-semibold">{active.score}/100</span></div>
        <Progress value={active.score} />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{c.history}</p>
        <ol className="space-y-3 border-s ps-4">
          {active.activity.map((a, i) => (
            <li key={i} className="relative text-sm"><span className="absolute -start-[21px] top-1.5 size-2 rounded-full bg-primary" />{a[lang]}<span className="block text-xs text-muted-foreground">{a.time}</span></li>
          ))}
        </ol>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* List */}
      <aside className={cn("flex w-full flex-col border-e bg-background md:w-80", active && "hidden md:flex")}>
        <div className="space-y-3 border-b p-3">
          <h1 className="text-lg font-bold">{c.title}</h1>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} />
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="unread">{c.unread} ({counts.unread})</TabsTrigger>
              <TabsTrigger value="mine">{c.mine}</TabsTrigger>
              <TabsTrigger value="all">{c.all} ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{c.empty}</li>}
          {list.map((x) => {
            const last = x.messages[x.messages.length - 1] ?? { text: "", time: "" };
            return (
              <li key={x.id}>
                <button onClick={() => open(x.id)} className={cn("flex w-full items-start gap-3 border-b p-3 text-start transition-colors hover:bg-muted/60", activeId === x.id && "bg-muted")}>
                  <div className="relative grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                    {x.name.split(" ").map((p) => p[0]).join("")}
                    <span className="absolute -bottom-1 -end-1"><ChannelBadge channel={x.channel} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2"><span className="truncate font-medium">{x.name}</span><span className="text-xs text-muted-foreground">{last.time}</span></div>
                    <p className="truncate text-sm text-muted-foreground">{last.text}</p>
                  </div>
                  {x.unread > 0 && <Badge className="rounded-full px-1.5">{x.unread}</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Conversation */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !active && "hidden md:flex")}>
        {!active ? <div className="m-auto text-muted-foreground">{c.pick}</div> : (
          <>
            <header className="flex items-center gap-3 border-b bg-background p-3">
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setActiveId(null)} aria-label="Back"><ArrowLeft className="size-4 rtl:rotate-180" /></Button>
              <ChannelBadge channel={active.channel} />
              <button className="min-w-0 flex-1 text-start" onClick={() => setProfileOpen(true)}>
                <p className="truncate font-semibold">{active.name}</p>
                <p className="text-xs text-muted-foreground">{channelMeta[active.channel].label} · {c.status[active.status]}</p>
              </button>
              <label className="flex items-center gap-2 text-sm">
                <Bot className="size-4 text-primary" /><span className="hidden sm:inline">{c.auto}</span>
                <Switch checked={autoReply} onCheckedChange={(v) => { setAutoReply(v); if (v) toast(c.autoOn); }} aria-label={c.auto} />
              </label>
              <Button size="icon" variant="outline" onClick={() => setProfileOpen(true)} aria-label={c.profile}><UserRound className="size-4" /></Button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.from === "customer" ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", m.from === "customer" ? "bg-background border" : m.from === "ai" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>
                    {m.from === "ai" && <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold"><Bot className="size-3" />AI Hema</p>}
                    <p>{m.text}</p>
                    <p className="mt-1 text-end text-[10px] opacity-70">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t bg-background p-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Zap className="size-4 shrink-0 text-primary" />
                {(["sales", "support"] as const).map((k) => (
                  <Button key={k} size="sm" variant={tplTab === k ? "default" : "outline"} className="h-7 shrink-0" onClick={() => setTplTab(k)}>{c[k]}</Button>
                ))}
                {templates[tplTab].map((tp, i) => (
                  <button key={i} onClick={() => setDraft(tp[lang])} className="shrink-0 rounded-full border px-3 py-1 text-xs hover:bg-muted">{tp[lang].slice(0, 36)}…</button>
                ))}
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={c.type} />
                <Button type="submit" disabled={!draft.trim()}><Send className="size-4 rtl:-scale-x-100" /><span className="hidden sm:inline">{c.send}</span></Button>
              </form>
            </div>
          </>
        )}
      </section>

      {/* Desktop profile */}
      {active && <aside className="hidden w-80 overflow-y-auto border-s bg-background p-4 xl:block"><p className="mb-4 text-sm font-semibold text-muted-foreground">{c.profile}</p>{Profile}</aside>}

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side={lang === "ar" ? "left" : "right"} className="overflow-y-auto">
          <SheetHeader><SheetTitle>{c.profile}</SheetTitle></SheetHeader>
          <div className="px-4 pb-4">{Profile}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
