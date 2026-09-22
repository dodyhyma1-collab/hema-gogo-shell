import { useState } from "react";
import {
  Bot,
  Boxes,
  CreditCard,
  FileSignature,
  Kanban,
  MessageSquareText,
  ScanSearch,
  Settings2,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useLanguage, type TKey } from "@/lib/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

type NavigationItem = {
  id: string;
  label: TKey;
  icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  { id: "assistant", label: "aiAssistant", icon: Bot },
  { id: "inbox", label: "multiChannelInbox", icon: MessageSquareText },
  { id: "leads", label: "leadDiscovery", icon: ScanSearch },
  { id: "pipeline", label: "salesPipeline", icon: Kanban },
  { id: "logistics", label: "logisticsShipping", icon: Boxes },
  { id: "wallets", label: "instapayWallets", icon: WalletCards },
  { id: "payments", label: "paymentsInvoices", icon: CreditCard },
  { id: "signatures", label: "eSignatures", icon: FileSignature },
  { id: "settings", label: "settingsRbac", icon: Settings2 },
];

export function AppSidebar() {
  const { lang, t } = useLanguage();
  const { isMobile, setOpenMobile } = useSidebar();
  const [activeItem, setActiveItem] = useState("assistant");

  return (
    <Sidebar side={lang === "ar" ? "right" : "left"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex h-10 items-center gap-3 overflow-hidden px-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-xs font-black text-sidebar-primary-foreground">
            HG
          </span>
          <div className="min-w-0 whitespace-nowrap group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold">{t("appName")}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{t("workspaceConsole")}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-4">
          <SidebarGroupLabel>{t("workspaceTools")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navigationItems.map((item) => {
                const isActive = activeItem === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={{
                        children: t(item.label),
                        side: lang === "ar" ? "left" : "right",
                      }}
                      onClick={() => {
                        setActiveItem(item.id);
                        if (isMobile) setOpenMobile(false);
                      }}
                      className="h-10 gap-3 px-2.5 text-sidebar-foreground/75 transition-colors data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2"
                    >
                      <item.icon className="size-4.5" strokeWidth={1.8} />
                      <span>{t(item.label)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}