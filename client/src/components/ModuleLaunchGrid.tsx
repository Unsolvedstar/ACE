import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "../config/nav";

export function ModuleLaunchGrid() {
  const { session } = useAuth();
  const items = NAV_ITEMS.filter(
    (item) =>
      item.path !== "/" &&
      item.path !== "/settings" &&
      (!item.roles || (session && item.roles.includes(session.role))),
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="rounded-t-lg border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Core modules</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ path, label, icon: Icon, badge }) => (
          <Link
            key={path}
            to={path}
            className="group flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center transition-colors hover:border-gold-300 hover:bg-gold-500/10"
          >
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-stone-700 transition-colors group-hover:from-gold-300/40 group-hover:to-gold-300 group-hover:text-gold-700">
              <Icon className="h-5 w-5" />
              {badge && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-gold-500 px-1 text-[9px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-slate-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
