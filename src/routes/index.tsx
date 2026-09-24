import { createFileRoute } from "@tanstack/react-router";
import { LanguageProvider } from "@/lib/i18n";
import { TopNav } from "@/components/shell/top-nav";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MainDashboard } from "@/components/dashboard/main-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hema Gogo — Main Dashboard" },
      {
        name: "description",
        content:
          "Track leads, conversations, revenue, tasks, automation health, and AI performance across your Hema Gogo workspace.",
      },
      { property: "og:title", content: "Hema Gogo — Main Dashboard" },
      {
        property: "og:description",
        content:
          "A bilingual operations dashboard for leads, conversations, revenue, tasks, automation, and AI performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function Dashboard() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-secondary/40">
        <TopNav />
        <MainDashboard />
      </SidebarInset>
    </SidebarProvider>
  );
}

function HomePage() {
  return (
    <LanguageProvider>
      <Dashboard />
    </LanguageProvider>
  );
}
