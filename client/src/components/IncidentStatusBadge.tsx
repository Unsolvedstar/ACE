import { Badge, type BadgeTone } from "./Badge";
import { IncidentStatus, IncidentStatusLabels } from "../types/incident";

const toneByStatus: Record<IncidentStatus, BadgeTone> = {
  [IncidentStatus.Reported]: "slate",
  [IncidentStatus.UnderInvestigation]: "amber",
  [IncidentStatus.Closed]: "emerald",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge label={IncidentStatusLabels[status]} tone={toneByStatus[status]} />;
}
