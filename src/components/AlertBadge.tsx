import { cn } from "@/lib/utils";
import { AlertType, AlertSeverity } from "@/data/types";
import { getAlertTypeLabel } from "@/lib/formatters";
import { AlertTriangle, Clock, GitMerge, Link2Off } from "lucide-react";

interface AlertBadgeProps {
  type: AlertType;
  severity: AlertSeverity;
  className?: string;
}

const icons: Record<AlertType, React.ElementType> = {
  build_failed: AlertTriangle,
  no_activity: Clock,
  approved_no_merge: GitMerge,
  no_task: Link2Off,
};

export function AlertBadge({ type, severity, className }: AlertBadgeProps) {
  const Icon = icons[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        severity === "critical"
          ? "bg-destructive/15 text-destructive border-destructive/20"
          : "bg-warning/15 text-warning border-warning/20",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {getAlertTypeLabel(type)}
    </span>
  );
}
