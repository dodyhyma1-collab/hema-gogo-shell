import { createFileRoute } from "@tanstack/react-router";
import { IntegrationPicker } from "@/components/integrations/integration-picker";
import { LeadDiscovery } from "@/components/leads/lead-discovery";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Lead Discovery Hub — Hema Gogo" },
      { name: "description", content: "Discover potential clients from multiple sources and track lead qualification scores." },
      { property: "og:title", content: "Lead Discovery Hub — Hema Gogo" },
      { property: "og:description", content: "Scan sources for new leads, score them, and capture the best ones to your CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <IntegrationPicker workspace="leads" />
        <LeadDiscovery />
      </SidebarInset>
    </SidebarProvider>
  ),
});
