import { createFileRoute } from "@tanstack/react-router";
import { AutomationBuilder } from "@/components/automations/automation-builder";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automation Workflows — Hema Gogo" },
      { name: "description", content: "Visual trigger-to-action automation builder with Make.com and n8n webhook triggers." },
      { property: "og:title", content: "Automation Workflows — Hema Gogo" },
      { property: "og:description", content: "Build lead, form, and message automations and connect Make.com or n8n." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <AutomationBuilder />
      </SidebarInset>
    </SidebarProvider>
  ),
});
