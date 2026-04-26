import { Link, useLocation } from "@tanstack/react-router";
import { Home, Map, Bell, User, LayoutDashboard, Users, Package, HeartHandshake, Sparkles, Network, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Role = "volunteer" | "ong";

const navsByRole: Record<Role, { to: string; label: string; icon: typeof Home }[]> = {
  volunteer: [
    { to: "/volunteer", label: "Feed", icon: Home },
    { to: "/volunteer/map", label: "Mapa", icon: Map },
    { to: "/volunteer/notifications", label: "Alertas", icon: Bell },
    { to: "/volunteer/profile", label: "Perfil", icon: User },
  ],
  ong: [
    { to: "/ong", label: "Painel", icon: LayoutDashboard },
    { to: "/ong/actions", label: "Ações", icon: ListChecks },
    { to: "/ong/resources", label: "Recursos", icon: Package },
    { to: "/ong/network", label: "ONGs por ONGs", icon: Network },
    { to: "/ong/volunteers", label: "Voluntários", icon: Users },
    { to: "/ong/profile", label: "Perfil", icon: User },
  ],
};

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const nav = navsByRole[role];
  const location = useLocation();
  const { avatarUrl, user } = useAuth();

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? (role === "volunteer" ? "VC" : "CV");

  const roleMeta = {
    volunteer: { label: "Voluntário", color: "bg-primary" },
    ong: { label: "ONG", color: "bg-success" },
  }[role];

  // Mobile bottom nav: limit to 5 entries for breathing room
  const mobileNav = nav.slice(0, 5);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-subtle">
      <header className="sticky top-0 z-40 glass-card border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
              <HeartHandshake className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight">Orquestra</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ajuda inteligente</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className={cn("hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-primary-foreground", roleMeta.color)}>
              <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
              {roleMeta.label}
            </span>
            {role === "volunteer" && (
            <Link
              to="/volunteer/notifications"
              className="relative rounded-lg p-2 hover:bg-muted transition"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-urgent animate-pulse" />
            </Link>
            )}
            <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                : initials
              }
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 p-4 sticky top-[64px] h-[calc(100vh-64px)]">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/ong" || item.to === "/volunteer"
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Card Agente de ia do canto inferior esquerdo */}
          {/* <div className="mt-auto rounded-2xl bg-gradient-ai p-4 text-ai-foreground shadow-elegant">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Agente IA ativo</p>
            </div>
            <p className="mt-2 text-xs opacity-90">
              Analisando 1.247 ações em tempo real para sugerir os melhores matches.
            </p>
          </div> */}
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:pb-12 md:pt-8">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-card border-t border-border/60">
        <div className={cn("grid gap-1 px-2 py-2", mobileNav.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/ong" || item.to === "/volunteer"
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn("rounded-lg p-1.5 transition", active && "bg-primary/10")}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="truncate max-w-full px-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
