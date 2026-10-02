import { createFileRoute } from "@tanstack/react-router";
import { AgentHub } from "@/components/agent-hub/agent-hub";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/agent-hub")({
  head: () => ({
    meta: [
      { title: "AI Agent & Freelance Hub — Hema Gogo" },
      { name: "description", content: "Autonomous lead intake, AI negotiation, logo generation and approved client handoff." },
      { property: "og:title", content: "AI Agent & Freelance Hub — Hema Gogo" },
      { property: "og:description", content: "Autonomous lead intake, AI negotiation, logo generation and approved client handoff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <AgentHub />
      </SidebarInset>
    </SidebarProvider>
  ),
});
