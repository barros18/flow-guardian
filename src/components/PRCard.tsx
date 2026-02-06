import { Link } from "react-router-dom";
import { PullRequest } from "@/data/types";
import { BuildBadge } from "./BuildBadge";
import { AlertBadge } from "./AlertBadge";
import { formatTimeAgo } from "@/lib/formatters";
import { GitPullRequest, ExternalLink, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface PRCardProps {
  pr: PullRequest;
  index: number;
}

export function PRCard({ pr, index }: PRCardProps) {
  const isReadyForMerge = pr.approvals > 0 && !pr.changesRequested && pr.buildStatus === "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <Link
        to={`/pr/${pr.id}`}
        className="group block rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <GitPullRequest className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground truncate">{pr.repository}</span>
            </div>
            <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {pr.title}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
                  {pr.author.avatar}
                </div>
                <span>{pr.author.name}</span>
              </div>
              {pr.jiraTask && (
                <>
                  <span>·</span>
                  <span className="font-mono text-primary/70">{pr.jiraTask.key}</span>
                </>
              )}
              <span>·</span>
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{pr.branch}</code>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <BuildBadge status={pr.buildStatus} />
            {isReadyForMerge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
                Pronto para merge
              </span>
            )}
          </div>
        </div>

        {pr.alerts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pr.alerts.map((alert, i) => (
              <AlertBadge key={i} type={alert.type} severity={alert.severity} />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Aberto há {formatTimeAgo(pr.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Última atividade: {formatTimeAgo(pr.lastActivity)}</span>
          </div>
          {pr.reviewers.length > 0 && (
            <div className="ml-auto flex items-center gap-1">
              <span>{pr.approvals}/{pr.reviewers.length} aprovações</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
