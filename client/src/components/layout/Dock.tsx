import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "../../config/nav";
import { useAuth } from "../../auth/AuthContext";
import { readVisits, recordVisit, type VisitCounts } from "../../lib/moduleVisits";

const DEFAULT_SHORTCUTS = ["/leave", "/incidents", "/workspace", "/work-shift"];
const SHORTCUT_SLOTS = 3;

/** Resolve a URL to its owning nav item (longest prefix wins, "/" only matches exactly). */
function owningItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((i) => (i.path === "/" ? pathname === "/" : pathname === i.path || pathname.startsWith(`${i.path}/`))).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];
}

interface DockProps {
  onOpenLauncher: () => void;
}

export function Dock({ onOpenLauncher }: DockProps) {
  const { session } = useAuth();
  const role = session?.role;
  const { pathname } = useLocation();
  const [visits, setVisits] = useState<VisitCounts>(readVisits);

  useEffect(() => {
    const item = owningItem(pathname);
    if (item && item.path !== "/") setVisits(recordVisit(item.path));
  }, [pathname]);

  const shortcuts = useMemo(() => {
    const allowed = NAV_ITEMS.filter((i) => i.path !== "/" && (!i.roles || (role !== undefined && i.roles.includes(role))));
    const byUse = allowed.filter((i) => (visits[i.path] ?? 0) > 0).sort((a, b) => (visits[b.path] ?? 0) - (visits[a.path] ?? 0));
    const picked = byUse.slice(0, SHORTCUT_SLOTS);
    for (const path of DEFAULT_SHORTCUTS) {
      if (picked.length >= SHORTCUT_SLOTS) break;
      const item = allowed.find((i) => i.path === path);
      if (item && !picked.includes(item)) picked.push(item);
    }
    // Keep the dock stable between visits: order by nav order, not by raw count.
    return picked.sort((a, b) => NAV_ITEMS.indexOf(a) - NAV_ITEMS.indexOf(b));
  }, [visits, role]);

  const home = NAV_ITEMS.find((i) => i.path === "/");
  const items = home ? [home, ...shortcuts] : shortcuts;

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-900/15 backdrop-blur-md">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              aria-label={item.label}
              title={item.label}
              className={({ isActive }) =>
                `flex h-11 shrink-0 items-center justify-center gap-2 rounded-full transition-all ${
                  isActive
                    ? "w-11 bg-slate-900 text-white sm:w-auto sm:px-4"
                    : "w-11 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5 shrink-0" />
                  {isActive && <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:inline">{item.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
        <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden="true" />
        <button
          type="button"
          onClick={onOpenLauncher}
          aria-label="All modules"
          title="All modules (Ctrl K)"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-600 text-white hover:bg-gold-500"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
