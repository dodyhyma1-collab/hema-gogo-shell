import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Copy, Pause, Play, Radio, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { emitWebhook, setAppState, useAppState } from "@/lib/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Feed = "fbGroups" | "upwork" | "mostaql" | "khamsat" | "linkedinJobs";
type Post = { id: string; feed: Feed; author: string; text: string; budget: number; score: number; at: string; captured: boolean };

const feedName: Record<Feed, string> = { fbGroups: "Facebook Groups", upwork: "Upwork", mostaql: "Mostaql", khamsat: "Khamsat", linkedinJobs: "LinkedIn Jobs" };
const pool: Omit<Post, "id" | "at" | "captured" | "score">[] = [
  { feed: "fbGroups", author: "Mona El-Sayed", text: "Looking for a logo designer for my bakery in Maadi", budget: 2500 },
  { feed: "mostaql", author: "Khaled Samir", text: "مطلوب مصمم جرافيك لعمل لوجو وهوية بصرية لشركة عقارات", budget: 6000 },
  { feed: "upwork", author: "Dubai Retail LLC", text: "Need graphic designer for full branding package", budget: 12000 },
  { feed: "khamsat", author: "Aya Mahmoud", text: "محتاجة لوجو بسيط لبراند ملابس أطفال", budget: 1200 },
  { feed: "linkedinJobs", author: "Nile Ventures", text: "Freelance brand designer – logo + social media kit", budget: 8000 },
  { feed: "fbGroups", author: "Hassan Ali", text: "Anyone recommend a designer for a restaurant menu & logo?", budget: 3000 },
];

const scorePost = (p: { text: string; budget: number }, kws: string[]) => {
  const hits = kws.filter((k) => p.text.toLowerCase().includes(k.toLowerCase())).length;
  return Math.min(99, 35 + hits * 18 + Math.min(30, Math.round(p.budget / 400)));
};

export function JobAggregator() {
  const { lang } = useLanguage();
  const L = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { leadScoreMin, jobKeywords, webhookUrl } = useAppState((s) => ({ leadScoreMin: s.leadScoreMin, jobKeywords: s.jobKeywords, webhookUrl: s.webhookUrl }));
  const [posts, setPosts] = useState<Post[]>([]);
  const [live, setLive] = useState(true);
  const [autoCapture, setAutoCapture] = useState(false);
  const [feeds, setFeeds] = useState<Record<Feed, boolean>>({ fbGroups: true, upwork: true, mostaql: true, khamsat: true, linkedinJobs: false });
  const [kwInput, setKwInput] = useState("");
  const inbound = "https://hooks.hemagogo.app/v1/in/jobs/hg_sk_92ab";

  useEffect(() => {
    if (!live) return;
    const tick = () => {
      const opts = pool.filter((p) => feeds[p.feed]);
      if (!opts.length) return;
      const base = opts[Math.floor(Math.random() * opts.length)]!;
      const score = scorePost(base, jobKeywords);
      const post: Post = { ...base, id: crypto.randomUUID(), at: new Date().toLocaleTimeString(), score, captured: false };
      if (autoCapture && score >= leadScoreMin) { post.captured = true; capture(post, true); }
      setPosts((cur) => [post, ...cur].slice(0, 40));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, feeds, autoCapture, leadScoreMin, jobKeywords]);

  function capture(p: Post, silent = false) {
    setAppState((s) => ({ aiLeads: [{ id: `job-${p.id}`, name: p.author, company: feedName[p.feed], city: "Remote", score: p.score }, ...s.aiLeads] }));
    emitWebhook("job_post.captured", { author: p.author, feed: p.feed, budget: p.budget, score: p.score, text: p.text });
    if (!silent) toast.success(L("Captured as lead", "تمت الإضافة كعميل"));
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 font-semibold"><Briefcase className="size-4" />{L("Lead Prospecting & Job Aggregator", "مجمّع طلبات التصميم والعملاء")}</h2>
          <p className="text-xs text-muted-foreground">{L("Design requests streamed from social groups and freelance feeds via n8n / Make.com.", "طلبات تصميم من المجموعات ومنصات العمل الحر عبر n8n / Make.com.")}</p></div>
        <div className="flex items-center gap-2">
          <Badge variant={live ? "default" : "secondary"}><Radio className="me-1 size-3" />{live ? L("Live", "مباشر") : L("Paused", "متوقف")}</Badge>
          <Button size="sm" variant="outline" onClick={() => setLive(!live)}>{live ? <Pause /> : <Play />}{live ? L("Pause", "إيقاف") : L("Resume", "استئناف")}</Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-md border p-3 text-xs">
          <p className="font-medium">{L("Inbound webhook (paste into n8n / Make HTTP module)", "رابط الاستقبال (ضعه في n8n / Make)")}</p>
          <div className="flex gap-2"><Input readOnly value={inbound} className="h-8 font-mono text-xs" /><Button size="sm" variant="outline" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(inbound); toast.success(L("Copied", "تم النسخ")); }}><Copy /></Button></div>
          <p className="text-muted-foreground">{L("Status events go out to", "الأحداث تُرسل إلى")}: <span className="font-mono">{webhookUrl}</span></p>
          <div className="flex flex-wrap gap-1.5 pt-1">{(Object.keys(feedName) as Feed[]).map((f) => (
            <Button key={f} size="sm" className="h-7 text-xs" variant={feeds[f] ? "default" : "outline"} onClick={() => setFeeds({ ...feeds, [f]: !feeds[f] })}>{feedName[f]}</Button>
          ))}</div>
        </div>
        <div className="space-y-2 rounded-md border p-3 text-xs">
          <p className="font-medium">{L("Scoring rules", "قواعد التقييم")} · {L("min score", "الحد الأدنى")} <b>{leadScoreMin}</b></p>
          <Input type="number" className="h-8" value={leadScoreMin} onChange={(e) => setAppState({ leadScoreMin: +e.target.value })} />
          <div className="flex flex-wrap gap-1">{jobKeywords.map((k) => <Badge key={k} variant="secondary" className="cursor-pointer" onClick={() => setAppState({ jobKeywords: jobKeywords.filter((x) => x !== k) })}>{k} ×</Badge>)}</div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (kwInput.trim()) setAppState({ jobKeywords: [...jobKeywords, kwInput.trim()] }); setKwInput(""); }}>
            <Input className="h-8" value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder={L("Add keyword", "أضف كلمة")} /><Button size="sm" type="submit">+</Button>
          </form>
          <label className="flex items-center justify-between">{L("Auto-capture posts above threshold", "إضافة تلقائية فوق الحد")}<Switch checked={autoCapture} onCheckedChange={setAutoCapture} /></label>
        </div>
      </div>

      <ul className="max-h-96 divide-y overflow-y-auto rounded-md border">
        {posts.map((p) => (
          <li key={p.id} className="flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{p.text}</p>
              <p className="text-xs text-muted-foreground">{p.author} · {feedName[p.feed]} · {p.budget.toLocaleString()} EGP · {p.at}</p>
            </div>
            <Badge variant={p.score >= leadScoreMin ? "default" : "outline"}>{p.score}</Badge>
            <Button size="sm" variant={p.captured ? "secondary" : "default"} disabled={p.captured} onClick={() => { setPosts((x) => x.map((y) => (y.id === p.id ? { ...y, captured: true } : y))); capture(p); }}>
              <UserPlus />{p.captured ? L("In CRM", "في CRM") : L("Capture", "إضافة")}
            </Button>
          </li>
        ))}
        {!posts.length && <li className="p-6 text-center text-sm text-muted-foreground">{L("Waiting for posts…", "بانتظار المنشورات…")}</li>}
      </ul>
    </section>
  );
}
