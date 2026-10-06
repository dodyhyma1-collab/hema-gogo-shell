import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setAppState, useAppState, type TaskType } from "@/lib/app-state";

const MODELS = [
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet", role: "Code & system building" },
  { id: "openai/gpt-6-astra", name: "GPT Astra", role: "Complex reasoning & analytics" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini Pro", role: "Long documents & large context" },
  { id: "google/gemini-3.8-flash", name: "Gemini Flash", role: "Fast, low-cost messaging & webhooks" },
];
const TASKS: { id: TaskType; label: string; primary: string }[] = [
  { id: "code", label: "Code generation", primary: "anthropic/claude-sonnet-5" },
  { id: "reasoning", label: "Reasoning & analytics", primary: "openai/gpt-6-astra" },
  { id: "long_context", label: "Long documents", primary: "google/gemini-3.1-pro-preview" },
  { id: "fast", label: "Fast messaging", primary: "google/gemini-3.8-flash" },
];

/** AI Provider & Model Router settings: routing rules, overrides, and the learned performance log. */
export function ModelRouterPanel() {
  const router = useAppState((s) => s.router);
  const stats = useAppState((s) => s.modelStats);
  const setRouter = (patch: Partial<typeof router>) => setAppState((s) => ({ router: { ...s.router, ...patch } }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="font-medium">Automatic routing</p>
          <p className="text-sm text-muted-foreground">AI Hema picks the best model for each request, learns from your ratings, and switches to a backup if a model is busy or down.</p>
        </div>
        <Switch checked={router.auto} onCheckedChange={(auto) => setRouter({ auto })} aria-label="Automatic routing" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead><TableHead>Best for</TableHead><TableHead>Access</TableHead>
              <TableHead className="text-end">Replies</TableHead><TableHead className="text-end">Avg time</TableHead>
              <TableHead className="text-end">Failures</TableHead><TableHead className="text-end">Liked</TableHead><TableHead className="text-end">Tokens</TableHead><TableHead>On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODELS.map((m) => {
              const s = stats[m.id];
              const ok = s ? s.calls - s.fails : 0;
              const rated = s ? s.accepted + s.rejected : 0;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.role}</TableCell>
                  <TableCell><Badge variant="outline">Built in</Badge></TableCell>
                  <TableCell className="text-end">{ok}</TableCell>
                  <TableCell className="text-end">{ok ? `${(s!.totalMs / ok / 1000).toFixed(1)}s` : "—"}</TableCell>
                  <TableCell className="text-end">{s?.fails ?? 0}</TableCell>
                  <TableCell className="text-end">{rated ? `${Math.round((s!.accepted / rated) * 100)}%` : "—"}</TableCell>
                  <TableCell className="text-end">{s?.tokens?.toLocaleString() ?? 0}</TableCell>
                  <TableCell>
                    <Switch checked={!router.disabled.includes(m.id)} aria-label={`Use ${m.name}`}
                      onCheckedChange={(on) => setRouter({ disabled: on ? router.disabled.filter((x) => x !== m.id) : [...router.disabled, m.id] })} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TASKS.map((t) => (
          <div key={t.id} className="space-y-1.5 rounded-lg border border-border bg-card p-3">
            <Label>{t.label}</Label>
            <Select value={router.overrides[t.id] ?? "auto"} onValueChange={(v) => setRouter({ overrides: { ...router.overrides, [t.id]: v === "auto" ? undefined : v } })}>
              <SelectTrigger aria-label={`${t.label} model`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto ({MODELS.find((m) => m.id === t.primary)?.name} first)</SelectItem>
                {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { setAppState({ modelStats: {} }); toast.success("Performance log cleared"); }}>Reset performance log</Button>
      </div>
    </div>
  );
}
