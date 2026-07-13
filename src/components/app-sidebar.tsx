import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  Library,
  CreditCard,
  LogOut,
  Coins,
  Globe,
  Crown,
  ShieldCheck,
  Wallet,
  Shield,
  FileText,
  Rocket,
  Gift,
  CalendarClock,
  Network,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_LABELS } from "@/lib/constants";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Gerar Artigo", url: "/generate", icon: Sparkles },
  { title: "Biblioteca", url: "/library", icon: Library },
  { title: "Agendamentos", url: "/agendamentos", icon: CalendarClock },
  { title: "Clusters de Conteúdo", url: "/clusters", icon: Network },
  { title: "Desempenho SEO", url: "/desempenho", icon: BarChart3 },
  { title: "Central de Recompensas", url: "/recompensas", icon: Gift },
  { title: "Páginas", url: "/paginas", icon: FileText },
  { title: "Blogger", url: "/connections", icon: Globe },
  { title: "Assinatura", url: "/pricing", icon: CreditCard },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Atualizações Futuras", url: "/atualizacoes", icon: Rocket },
  { title: "Central de Ajuda", url: "/ajuda", icon: LifeBuoy },
];

const premiumItems = [
  { title: "Central de Monetização", url: "/monetizacao", icon: Crown },
  { title: "Verificar Meu Blog", url: "/verificar-blog", icon: ShieldCheck },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { profile, user, signOut, isAdmin } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    closeMobileSidebar();
    await signOut();
    navigate({ to: "/login" });
  };

  const isUnlimited = profile?.plan === "premium";

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <BrandLogo invert />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        className="flex items-center gap-3"
                        onClick={closeMobileSidebar}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Premium</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {premiumItems.map((item) => {
                const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        className="flex items-center gap-3"
                        onClick={closeMobileSidebar}
                      >
                        <item.icon className="h-4 w-4 text-primary" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/admin" || currentPath.startsWith("/admin/")}
                  >
                    <Link
                      to="/admin"
                      className="flex items-center gap-3"
                      onClick={closeMobileSidebar}
                    >
                      <Shield className="h-4 w-4 text-primary" />
                      <span>Administração</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <div className="mx-2 rounded-xl bg-sidebar-accent p-4">
              <div className="flex items-center gap-2 text-sidebar-accent-foreground">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {isUnlimited ? "Ilimitado" : `${profile?.credits ?? 0} créditos`}
                </span>
              </div>
              <p className="mt-1 text-xs text-sidebar-foreground/60">
                Plano {PLAN_LABELS[profile?.plan ?? "free"]}
              </p>
              {profile?.plan !== "premium" && (
                <Button
                  size="sm"
                  variant="hero"
                  className="mt-3 w-full"
                  onClick={() => {
                    closeMobileSidebar();
                    navigate({ to: "/pricing" });
                  }}
                >
                  Fazer upgrade
                </Button>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {(profile?.full_name ?? user?.email ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name ?? "Usuário"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={handleSignOut}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
