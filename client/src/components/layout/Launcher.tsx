import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { NAV_GROUPS, NAV_ITEMS, type NavItem } from "../../config/nav";
import { useAuth } from "../../auth/AuthContext";

interface LauncherProps {
  open: boolean;
  onClose: () => void;
}

export function Launcher({ open, onClose }: LauncherProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const role = session?.role;
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const sections = useMemo(() => {
    const visible = (item: NavItem) => !item.roles || (role !== undefined && item.roles.includes(role));
    const home = NAV_ITEMS.filter((i) => !i.category && visible(i));
    const groups = NAV_GROUPS.map((g) => ({ label: g.label, items: g.items.filter(visible) }));
    return [{ label: "Overview", items: home }, ...groups].filter((s) => s.items.length > 0);
  }, [role]);

  const trimmed = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      sections
        .map((s) => ({ ...s, items: trimmed ? s.items.filter((i) => i.label.toLowerCase().includes(trimmed)) : s.items }))
        .filter((s) => s.items.length > 0),
    [sections, trimmed],
  );
  const flat = useMemo(() => shown.flatMap((s) => s.items), [shown]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    // Only auto-focus on devices with a real keyboard; on phones it would pop the keyboard up over the grid.
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => setHighlight(0), [trimmed]);

  if (!open) return null;

  function go(item: NavItem) {
    navigate(item.path);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flat.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && flat[highlight]) {
      e.preventDefault();
      go(flat[highlight]);
    }
  }

  let index = -1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All modules"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-slate-900/40 backdrop-blur-sm sm:items-start sm:p-6 sm:pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-3xl flex-col bg-white shadow-2xl sm:max-h-[80vh] sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where to?"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
          {flat.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Nothing matches &ldquo;{query}&rdquo;.</p>
          ) : (
            shown.map((section) => (
              <section key={section.label} className="mb-6 last:mb-0">
                <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{section.label}</h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {section.items.map((item) => {
                    index += 1;
                    const i = index;
                    const Icon = item.icon;
                    const active = i === highlight;
                    return (
                      <li key={item.path}>
                        <button
                          type="button"
                          onClick={() => go(item)}
                          onMouseEnter={() => setHighlight(i)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                            active ? "border-gold-500/40 bg-gold-500/10" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{item.label}</span>
                          {item.badge && (
                            <span className="shrink-0 rounded-full bg-gold-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-gold-700">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
