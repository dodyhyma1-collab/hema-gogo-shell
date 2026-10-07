import { useMemo, useState } from "react";
import { MessageCircle, Send, Target } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Budget = "low" | "mid" | "high";
type Prospect = { id: string; name: string; company: string; industry: string; service: string; budget: Budget; channel: "WhatsApp" | "Messenger" | "Instagram" | "Email"; arabic: boolean };
type Sent = { id: string; text: string; at: string; status: "sent" | "replied" };

const INDUSTRIES = ["Restaurants", "Clinics", "Real estate", "Fashion", "Tech startups"];
const SERVICES = ["Logo design", "Brand identity", "Social media kit", "Website"];

const PROSPECTS: Prospect[] = [
  { id: "p1", name: "Mahmoud Adel", company: "Koshary El Tahrir", industry: "Restaurants", service: "Logo design", budget: "low", channel: "WhatsApp", arabic: true },
  { id: "p2", name: "Sara Nabil", company: "Smile Dental", industry: "Clinics", service: "Brand identity", budget: "mid", channel: "Instagram", arabic: true },
  { id: "p3", name: "Karim Fathy", company: "Palm Hills Brokers", industry: "Real estate", service: "Website", budget: "high", channel: "Email", arabic: false },
  { id: "p4", name: "Laila Hassan", company: "Zay Boutique", industry: "Fashion", service: "Social media kit", budget: "mid", channel: "Messenger", arabic: true },
  { id: "p5", name: "Ahmed Samir", company: "Fintrack", industry: "Tech startups", service: "Brand identity", budget: "high", channel: "Email", arabic: false },
  { id: "p6", name: "Mona Reda", company: "Grill House", industry: "Restaurants", service: "Social media kit", budget: "mid", channel: "WhatsApp", arabic: true },
  { id: "p7", name: "Omar Khaled", company: "Care Clinic", industry: "Clinics", service: "Logo design", budget: "low", channel: "WhatsApp", arabic: true },
  { id: "p8", name: "Nadine Aziz", company: "Bloom Studio", industry: "Fashion", service: "Logo design", budget: "high", channel: "Instagram", arabic: false },
];

/** Writes a natural opener that adapts to dialect, service and budget. */
function opener(p: Prospect) {
  const first = p.name.split(" ")[0];
  if (p.arabic) {
    const tone = p.budget === "high" ? "عندنا باقة مميزة تليق بيكم" : p.budget === "mid" ? "عندنا باقة مناسبة جدًا" : "عندنا عرض بسيط وسعره حلو";
    return `أهلاً يا ${first}، إزيك؟ شفت شغل ${p.company} وعجبني جدًا 👌 لو حابين ${p.service === "Logo design" ? "لوجو جديد" : "تطوير الهوية"}، ${tone}. تحب أبعتلك أمثلة؟`;
  }
  const tone = p.budget === "high" ? "a premium package built for growing brands" : p.budget === "mid" ? "a package that fits nicely" : "a simple, affordable starter offer";
  return `Hi ${first}, I came across ${p.company} and really liked what you're building. If a fresh ${p.service.toLowerCase()} is on your list, we have ${tone}. Want me to send a few examples?`;
}

const ALL = "all";

export function TargetOutreach() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [industry, setIndustry] = useState(ALL);
  const [service, setService] = useState(ALL);
  const [budget, setBudget] = useState(ALL);
  const [sent, setSent] = useState<Record<string, Sent>>({});

  const matches = useMemo(() => PROSPECTS.filter((p) => (industry === ALL || p.industry === industry) && (service === ALL || p.service === service) && (budget === ALL || p.budget === budget)), [industry, service, budget]);
  const pending = matches.filter((p) => !sent[p.id]);

  const reach = (list: Prospect[]) => {
    const now = new Date().toLocaleTimeString();
    setSent((s) => ({ ...s, ...Object.fromEntries(list.map((p) => [p.id, { id: p.id, text: opener(p), at: now, status: "sent" as const }])) }));
    toast.success(ar ? `تم التواصل مع ${list.length} عميل` : `Reached out to ${list.length} lead${list.length === 1 ? "" : "s"}`);
    list.forEach((p, i) => setTimeout(() => setSent((s) => (s[p.id] ? { ...s, [p.id]: { ...s[p.id]!, status: "replied" } } : s)), 2500 + i * 1500));
  };

  const pick = (label: string, value: string, set: (v: string) => void, opts: { v: string; l: string }[]) => (
    <Select value={value} onValueChange={set}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{ar ? "الكل" : `Any ${label.toLowerCase()}`}</SelectItem>
        {opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Target className="size-5 text-primary" />
        <div className="me-auto">
          <h2 className="font-semibold">{ar ? "استهداف العملاء والتواصل" : "Target leads & outreach"}</h2>
          <p className="text-xs text-muted-foreground">{ar ? "حدد المجال والخدمة والميزانية، وAI Hema يكلم المناسبين بأسلوب طبيعي." : "Pick industry, service and budget — AI Hema messages matching leads in a natural tone."}</p>
        </div>
        <Button onClick={() => reach(pending)} disabled={!pending.length}><Send className="size-4" />{ar ? `تواصل مع ${pending.length}` : `Reach out to ${pending.length}`}</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {pick(ar ? "المجال" : "Industry", industry, setIndustry, INDUSTRIES.map((v) => ({ v, l: v })))}
        {pick(ar ? "الخدمة" : "Service", service, setService, SERVICES.map((v) => ({ v, l: v })))}
        {pick(ar ? "الميزانية" : "Budget", budget, setBudget, [{ v: "low", l: ar ? "منخفضة" : "Low" }, { v: "mid", l: ar ? "متوسطة" : "Mid" }, { v: "high", l: ar ? "عالية" : "High" }])}
      </div>
      <ul className="divide-y rounded-lg border">
        {matches.length === 0 && <li className="p-3 text-sm text-muted-foreground">{ar ? "لا يوجد عملاء مطابقون." : "No leads match these filters."}</li>}
        {matches.map((p) => {
          const m = sent[p.id];
          return (
            <li key={p.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.company} · {p.industry} · {p.service}</span>
                <Badge variant="outline">{p.channel}</Badge>
                <Badge variant="secondary">{p.budget}</Badge>
                <span className="ms-auto">
                  {m ? <Badge>{m.status === "replied" ? (ar ? "رد العميل" : "Replied") : (ar ? "تم الإرسال" : "Sent")}</Badge>
                    : <Button size="sm" variant="outline" onClick={() => reach([p])}><MessageCircle className="size-4" />{ar ? "تواصل" : "Message"}</Button>}
                </span>
              </div>
              {m && <p dir={p.arabic ? "rtl" : "ltr"} className="rounded-md bg-muted p-2 text-sm">{m.text}</p>}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{ar ? "الإرسال تجريبي حاليًا — لا تصل رسائل حقيقية." : "Sending is simulated for now — no real messages go out."}</p>
    </section>
  );
}
