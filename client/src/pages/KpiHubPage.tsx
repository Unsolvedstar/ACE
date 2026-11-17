import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { EmployeeRole } from "../types/auth";

const TABS = [
  { to: "/kpi", label: "Appraisals", end: true },
  { to: "/kpi/boards", label: "Boards", end: false },
  { to: "/kpi/performance", label: "Performance", end: true },
];

const COLLEAGUES_TAB = { to: "/kpi/colleagues", label: "Colleagues", end: true };

export function KpiHubPage() {
  const { session } = useAuth();
  const canManageColleagues = session?.role === EmployeeRole.HR || session?.role === EmployeeRole.Executive;
  const tabs = canManageColleagues ? [...TABS, COLLEAGUES_TAB] : TABS;

  return (
    <div className="stagger-children flex flex-col gap-4 rounded-2xl bg-slate-50 p-3 sm:p-6 font-['Inter']">
      <div className="flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                isActive ? "bg-gold-600 text-white" : "text-slate-500 hover:bg-slate-50"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
