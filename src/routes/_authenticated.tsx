import { createFileRoute, Link, Outlet, redirect, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Receipt, LifeBuoy, Gauge, User, LogOut, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
  },
  component: AuthLayout,
});

const navItems: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/financeiro", label: "Faturas", icon: Receipt },
  { to: "/velocidade", label: "Velocidade", icon: Gauge },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/perfil", label: "Perfil", icon: User },
];

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
            <Wifi className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">TRIX</div>
            <div className="text-xs text-sidebar-foreground/60">Portal do Cliente</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium shadow-glow"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
        >
          <LogOut className="size-4" /> Sair
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-card">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors",
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-5", active && "drop-shadow-[0_0_6px_currentColor]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
