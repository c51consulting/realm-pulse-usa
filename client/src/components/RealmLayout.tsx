import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Archive,
  TrendingUp,
  Wheat,
  Tractor,
  MapPin,
  Menu,
  X,
  Activity,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REALM_LOGO_URL = "https://realmgroup.global/wp-content/uploads/2025/11/realm-global-logo.png";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/trends", label: "Trends", icon: LineChart },
];

const sections = [
  { href: "/#commodities", label: "Commodities", icon: Wheat },
  { href: "/#livestock", label: "Livestock", icon: TrendingUp },
  { href: "/#machinery", label: "Machinery", icon: Tractor },
  { href: "/#land", label: "Rural Land", icon: MapPin },
];

export default function RealmLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[oklch(0.12_0.010_60)] border-r border-border flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:flex",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <a href="https://realmgroup.global" target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={REALM_LOGO_URL}
              alt="REALM Group Global"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </a>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400/80 tracking-widest uppercase font-medium">PULSE DAILY</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-2 mb-2">
              Navigation
            </p>
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <a
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    location === href
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </a>
              </Link>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-2 mb-2">
              Market Sections
            </p>
            {sections.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            {"\u00A9"} {new Date().getFullYear()} REALM Group Global
          </p>
          <a
            href="https://realmgroup.global"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline"
          >
            realmgroup.global
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-[oklch(0.12_0.010_60)] sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img
              src={REALM_LOGO_URL}
              alt="REALM Group Global"
              className="h-9 w-auto object-contain brightness-0 invert"
            />
            <span className="text-[9px] text-amber-400/80 tracking-widest uppercase font-medium">
              PULSE DAILY
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}