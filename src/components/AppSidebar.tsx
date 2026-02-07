import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Bell, Settings, Users, Zap, LogOut, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Alertas", icon: Bell },
  { to: "/integrations", label: "Integrações", icon: Plug },
  { to: "/rules", label: "Regras", icon: Settings },
  { to: "/users", label: "Usuários", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">DevSync</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
              {item.to === "/alerts" && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  5
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            AS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Ana Silva</p>
            <p className="text-xs text-muted-foreground truncate">Admin</p>
          </div>
          <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
