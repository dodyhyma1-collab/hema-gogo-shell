import { Link } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HitlControls } from "@/components/ai-hema/change-views";
import { useLanguage } from "@/lib/i18n";
import { INTEGRATIONS, WORKSPACE_TASKS, assignIntegration, useAssignments, useConnections, type WorkspaceKey } from "@/lib/integrations";

/** Active Integrations Bar: picks which connected app handles this workspace's tasks. */
export function IntegrationPicker({ workspace }: { workspace: WorkspaceKey }) {
  const { lang } = useLanguage();
  const connections = useConnections();
  const assignments = useAssignments();
  const options = INTEGRATIONS.filter((i) => i.workspaces.includes(workspace));
  const current = assignments[workspace];
  const status = current ? connections[current]?.status ?? "disconnected" : undefined;
  const ar = lang === "ar";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 sm:px-6">
      <Plug className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">{WORKSPACE_TASKS[workspace][lang]}:</span>
      <Select
        value={current ?? ""}
        onValueChange={(id) => {
          assignIntegration(workspace, id);
          toast.success(ar ? "تم تعيين التكامل" : "Integration assigned");
        }}
      >
        <SelectTrigger className="h-8 w-56" aria-label={ar ? "التطبيق المتصل" : "Connected app"}>
          <SelectValue placeholder={ar ? "اختر تطبيقاً" : "Choose an app"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name} {connections[o.id]?.status === "connected" ? "✓" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status && (
        <Badge variant={status === "connected" ? "default" : status === "reauth" ? "destructive" : "outline"}>
          {status === "connected" ? (ar ? "متصل" : "Connected") : status === "reauth" ? (ar ? "يحتاج إعادة توثيق" : "Re-authenticate") : ar ? "غير متصل" : "Disconnected"}
        </Badge>
      )}
      <div className="ms-auto"><HitlControls /></div>
      <Button asChild variant="ghost" size="sm">
        <Link to="/integrations">{ar ? "إدارة التكاملات" : "Manage integrations"}</Link>
      </Button>
    </div>
  );
}
