import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "App Integrations Hub — Hema Gogo" },
      { name: "description", content: "Connect WhatsApp, Messenger, Instagram, OpenAI, Midjourney, Claude, InstaPay, Paymob, Fawry, Bosta and Aramex." },
      { property: "og:title", content: "App Integrations Hub — Hema Gogo" },
      { property: "og:description", content: "One marketplace to connect messaging, AI, payment and shipping apps to every workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <IntegrationsHub />
      </SidebarInset>
    </SidebarProvider>
  ),
});
