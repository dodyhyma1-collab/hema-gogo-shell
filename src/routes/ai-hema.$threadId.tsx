import { createFileRoute } from "@tanstack/react-router";
import { EvolutionWorkspace } from "@/components/ai-hema/evolution-workspace";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/ai-hema/$threadId")({
  head: () => ({
    meta: [
      { title: "AI Hema — Hema Gogo" },
      { name: "description", content: "Generate, review, and approve governed Hema Gogo workspace configuration changes." },
      { property: "og:title", content: "AI Hema — Hema Gogo" },
      { property: "og:description", content: "A governed workspace for AI-assisted UI and configuration evolution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiHemaPage,
});

function AiHemaPage() {
  const { threadId } = Route.useParams();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-secondary/30">
        <TopNav />
        <EvolutionWorkspace key={threadId} threadId={threadId} />
      </SidebarInset>
    </SidebarProvider>
  );
}
