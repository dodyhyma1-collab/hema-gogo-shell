import { createFileRoute } from "@tanstack/react-router";
import { IntegrationPicker } from "@/components/integrations/integration-picker";
import { UnifiedInbox } from "@/components/inbox/unified-inbox";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Multi-Channel Inbox — Hema Gogo" },
      { name: "description", content: "Unified WhatsApp, Messenger, Instagram, and SMS inbox with a live customer CRM profile." },
      { property: "og:title", content: "Multi-Channel Inbox — Hema Gogo" },
      { property: "og:description", content: "One conversation stream for every channel, with AI Hema auto-replies and quick templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-secondary/30">
        <TopNav />
        <IntegrationPicker workspace="inbox" />
        <UnifiedInbox />
      </SidebarInset>
    </SidebarProvider>
  );
}
