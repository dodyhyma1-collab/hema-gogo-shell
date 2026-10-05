import { createFileRoute } from "@tanstack/react-router";
import { IntegrationPicker } from "@/components/integrations/integration-picker";
import { FinanceHub } from "@/components/finance/finance-hub";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/finance")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: typeof s['tab'] === "string" ? s['tab'] : undefined }),
  head: () => ({
    meta: [
      { title: "Financial Verification & Payments — Hema Gogo" },
      { name: "description", content: "InstaPay receipt verification, Paymob, Fawry and Vodafone Cash settings, and Egyptian tax invoices." },
      { property: "og:title", content: "Financial Verification & Payments — Hema Gogo" },
      { property: "og:description", content: "Verify InstaPay transfers, manage Egyptian gateways and issue EGP tax invoices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { tab } = Route.useSearch();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/30">
        <TopNav />
        <IntegrationPicker workspace="finance" />
        <FinanceHub initialTab={tab ?? "ocr"} />
      </SidebarInset>
    </SidebarProvider>
  );
}
