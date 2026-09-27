import { createFileRoute } from "@tanstack/react-router";
import { ApprovalCenter } from "@/components/approvals/approval-center";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Center — Hema Gogo" },
      { name: "description", content: "Review AI-flagged orders, receipts and messages before they reach clients." },
      { property: "og:title", content: "Approval Center — Hema Gogo" },
      { property: "og:description", content: "One-click approve or reject for AI-flagged actions with client notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <ApprovalCenter />
      </SidebarInset>
    </SidebarProvider>
  ),
});
