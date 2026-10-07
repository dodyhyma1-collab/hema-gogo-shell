import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { setAppState, useAppState } from "@/lib/app-state";
import { checkGeminiKey } from "@/lib/api-settings.functions";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "API Settings — Hema Gogo" },
      { name: "description", content: "Choose which AI provider powers AI Hema and check your Gemini key." },
      { property: "og:title", content: "API Settings — Hema Gogo" },
      { property: "og:description", content: "Choose which AI provider powers AI Hema and check your Gemini key." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <ApiSettings />
      </SidebarInset>
    </SidebarProvider>
  ),
});

function ApiSettings() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const router = useAppState((s) => s.router);
  const set = (p: Partial<typeof router>) => setAppState((s) => ({ router: { ...s.router, ...p } }));
  const check = useServerFn(checkGeminiKey);
  const model = router.ownModel || "gemini-2.5-flash";
  const [status, setStatus] = useState<{ ok: boolean; configured: boolean; message: string; models: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { setStatus(await check({ data: { model } })); } finally { setBusy(false); } };
  useEffect(() => { void run(); }, [model]); // eslint-disable-line react-hooks/exhaustive-deps
  const models = status?.models.length ? status.models : ["gemini-2.5-flash", "gemini-2.5-pro"];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">{ar ? "إعدادات الـ API" : "API Settings"}</h1>
        <p className="text-sm text-muted-foreground">{ar ? "اختر المزود الذي يشغّل هيما." : "Choose what powers AI Hema."}</p>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <RadioGroup value={router.provider ?? "builtin"} onValueChange={(v) => set({ provider: v as "builtin" | "own_gemini" })} className="gap-3">
          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <RadioGroupItem value="own_gemini" className="mt-1" />
            <div>
              <p className="font-medium">{ar ? "مفتاح Google Gemini الخاص بي" : "My Google Gemini key"}</p>
              <p className="text-sm text-muted-foreground">{ar ? "هيما يستخدم مفتاحك أولاً، ويُحاسَب على حسابك في جوجل." : "AI Hema uses your key first; usage is billed to your Google account."}</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <RadioGroupItem value="builtin" className="mt-1" />
            <div>
              <p className="font-medium">{ar ? "النماذج المدمجة" : "Built-in models"}</p>
              <p className="text-sm text-muted-foreground">{ar ? "بدون مفتاح، تُخصم من رصيد مساحة العمل." : "No key needed; uses workspace credits."}</p>
            </div>
          </label>
        </RadioGroup>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><KeyRound className="size-4" /><p className="font-medium">Gemini</p></div>
          {status && (status.ok
            ? <Badge className="gap-1"><CheckCircle2 className="size-3" />{ar ? "يعمل" : "Working"}</Badge>
            : <Badge variant="destructive" className="gap-1"><XCircle className="size-3" />{ar ? "مشكلة" : "Problem"}</Badge>)}
        </div>
        <p className="text-sm text-muted-foreground">{status ? status.message : ar ? "جارٍ الفحص…" : "Checking…"} {ar ? "المفتاح محفوظ بأمان ولا يظهر هنا." : "Your key is stored securely and never shown here."}</p>
        <div className="space-y-1.5">
          <Label>{ar ? "النموذج" : "Model"}</Label>
          <Select value={model} onValueChange={(v) => set({ ownModel: v })}>
            <SelectTrigger aria-label="Gemini model"><SelectValue /></SelectTrigger>
            <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{ar ? "بدون احتياطي" : "Gemini only"}</p>
            <p className="text-xs text-muted-foreground">{ar ? "عند الإيقاف، يتحوّل هيما للنماذج المدمجة إذا كان Gemini مشغولاً حتى لا يتوقف." : "When off, AI Hema switches to built-in models if Gemini is busy or down, so it never stops."}</p>
          </div>
          <Switch checked={!!router.ownOnly} onCheckedChange={(ownOnly) => set({ ownOnly })} aria-label="Gemini only" />
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void run()}>{ar ? "اختبار المفتاح" : "Test key"}</Button>
      </section>
    </main>
  );
}
