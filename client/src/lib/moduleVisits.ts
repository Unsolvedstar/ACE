const KEY = "acmehr.moduleVisits";

export type VisitCounts = Record<string, number>;

export function readVisits(): VisitCounts {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VisitCounts) : {};
  } catch {
    return {};
  }
}

export function recordVisit(path: string): VisitCounts {
  const visits = readVisits();
  visits[path] = (visits[path] ?? 0) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(visits));
  } catch {
    // storage unavailable (private mode etc.) — the dock just falls back to defaults
  }
  return visits;
}
