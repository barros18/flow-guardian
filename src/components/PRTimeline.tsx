import { PullRequest } from "@/data/types";
import { formatTimeAgo } from "@/lib/formatters";
import { GitPullRequest, Play, Check, X, GitMerge, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

interface PRTimelineProps {
  timeline: PullRequest["timeline"];
}

const eventConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pr_opened: { icon: GitPullRequest, label: "PR aberto", color: "text-primary" },
  build_started: { icon: Play, label: "Build iniciado", color: "text-info" },
  build_success: { icon: Check, label: "Build sucesso", color: "text-success" },
  build_failed: { icon: X, label: "Build falhou", color: "text-destructive" },
  approved: { icon: Check, label: "Aprovado", color: "text-success" },
  merged: { icon: GitMerge, label: "Merge", color: "text-primary" },
  commit_pushed: { icon: GitCommit, label: "Commit", color: "text-muted-foreground" },
};

export function PRTimeline({ timeline }: PRTimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {timeline.map((event, i) => {
          const config = eventConfig[event.event] || { icon: GitCommit, label: event.event, color: "text-muted-foreground" };
          const Icon = config.icon;
          return (
            <div key={i} className="relative flex items-start gap-4 pl-0">
              <div className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card", config.color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{formatTimeAgo(event.timestamp)} atrás</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
