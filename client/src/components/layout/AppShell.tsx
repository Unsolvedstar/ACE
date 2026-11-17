import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Siren } from "lucide-react";
import { Dock } from "./Dock";
import { Launcher } from "./Launcher";
import { NotificationBell } from "../NotificationBell";
import { MailDropdown } from "../MailDropdown";
import { PolicyAcknowledgmentPopup } from "../PolicyAcknowledgmentPopup";
import { ProfileDropdown } from "../ProfileDropdown";
import { NAV_ITEMS } from "../../config/nav";

export function AppShell() {
  const location = useLocation();
  const [launcherOpen, setLauncherOpen] = useState(false);

  // Nested routes (e.g. /kpi/boards/:id) have no NAV_ITEMS entry of their own, so the
  // title falls back to the longest matching parent. Entity pages render their own back link.
  const title =
    NAV_ITEMS.find((item) => item.path === location.pathname)?.label ??
    NAV_ITEMS.filter((item) => item.path !== "/" && location.pathname.startsWith(`${item.path}/`)).sort(
      (a, b) => b.path.length - a.path.length,
    )[0]?.label ??
    "AcmeHR";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLauncherOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bg-cream flex h-screen flex-col">
      <PolicyAcknowledgmentPopup />
      <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-8 sm:pt-5">
        <div className="min-w-0">
          <h1 className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <MailDropdown />
          <NotificationBell />
          <Link
            to="/emergency"
            aria-label="Emergency SOS"
            className="sos-pulse flex h-10 w-10 items-center justify-center gap-1.5 rounded-full bg-red-600 text-xs font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto sm:px-3.5"
          >
            <Siren className="h-4 w-4" />
            <span className="hidden sm:inline">SOS</span>
          </Link>
          <ProfileDropdown />
        </div>
      </header>
      {/* Bottom padding keeps content clear of the floating dock. */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-3 sm:px-8 sm:pt-4">
        <Outlet />
      </main>
      <Dock onOpenLauncher={() => setLauncherOpen(true)} />
      <Launcher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </div>
  );
}
