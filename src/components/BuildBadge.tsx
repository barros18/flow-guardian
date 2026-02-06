import { cn } from "@/lib/utils";
import { BuildStatus } from "@/data/types";
import { Check, X, Loader2, Clock } from "lucide-react";

interface BuildBadgeProps {
  status: BuildStatus;
  className?: string;
}

const config: Record<BuildStatus, { icon: React.ElementType; label: string; classes: string }> = {
  success: { icon: Check, label: "Sucesso", classes: "bg-success/15 text-success border-success/20" },
  failure: { icon: X, label: "Falhou", classes: "bg-destructive/15 text-destructive border-destructive/20" },
  running: { icon: Loader2, label: "Executando", classes: "bg-info/15 text-info border-info/20" },
  pending: { icon: Clock, label: "Pendente", classes: "bg-muted text-muted-foreground border-border" },
};

export function BuildBadge({ status, className }: BuildBadgeProps) {
  const { icon: Icon, label, classes } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", classes, className)}>
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {label}
    </span>
  );
}
