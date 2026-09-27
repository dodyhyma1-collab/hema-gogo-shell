import { createFileRoute } from "@tanstack/react-router";
import { DispatchHub } from "@/components/logistics/dispatch-hub";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/logistics")({
  head: () => ({
    meta: [
      { title: "Shipping Dispatch Hub — Hema Gogo" },
      { name: "description", content: "Dispatch Bosta and Aramex shipments, generate AWBs and track deliveries." },
      { property: "og:title", content: "Shipping Dispatch Hub — Hema Gogo" },
      { property: "og:description", content: "Bosta and Aramex dispatch with AWB generation and live tracking status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <DispatchHub />
      </SidebarInset>
    </SidebarProvider>
  ),
});
