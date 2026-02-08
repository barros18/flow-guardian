import { useParams, Link } from "react-router-dom";
import { mockPRs } from "@/data/mockData";
import { BuildBadge } from "@/components/BuildBadge";
import { AlertBadge } from "@/components/AlertBadge";
import { PRTimeline } from "@/components/PRTimeline";
import { formatTimeAgo } from "@/lib/formatters";
import { ArrowLeft, ExternalLink, GitPullRequest, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PRDetailPage() {
  const { id } = useParams();
  const pr = mockPRs.find((p) => p.id === id);

  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">PR não encontrado</p>
        <Link to="/dashboard" className="text-primary mt-2 hover:underline text-sm">Voltar ao Dashboard</Link>
      </div>
    );
  }

  const isReadyForMerge = pr.approvals > 0 && !pr.changesRequested && pr.buildStatus === "success";

  // Build real external URLs from mock data
  const githubUrl = `https://github.com/${pr.repository}/pull/${pr.number}`;
  const jiraUrl = pr.jiraTask ? `https://jira.atlassian.com/browse/${pr.jiraTask.key}` : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
      </Link>

      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground font-mono">#{pr.number}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{pr.repository}</span>
          </div>
          <h1 className="text-xl font-bold mb-3">{pr.title}</h1>
          <div className="flex flex-wrap gap-2">
            <BuildBadge status={pr.buildStatus} />
            {isReadyForMerge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
                Pronto para merge
              </span>
            )}
            {pr.blockedExternally && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 border border-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning">
                Bloqueado externamente
              </span>
            )}
            {pr.alerts.map((alert, i) => (
              <AlertBadge key={i} type={alert.type} severity={alert.severity} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> GitHub
            </a>
          </Button>
          {jiraUrl && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={jiraUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Jira
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detalhes</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Autor</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">{pr.author.avatar}</div>
                  <span className="font-medium">{pr.author.name}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Branch</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{pr.branch}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tarefa</span>
                {pr.jiraTask ? (
                  <a href={`https://jira.atlassian.com/browse/${pr.jiraTask.key}`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary text-xs hover:underline">
                    {pr.jiraTask.key}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aberto há</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(pr.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Última atividade</span>
                <span>{formatTimeAgo(pr.lastActivity)} atrás</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aprovações</span>
                <span>{pr.approvals}/{pr.reviewers.length}</span>
              </div>
            </div>
          </div>

          {pr.reviewers.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Reviewers</h3>
              <div className="space-y-2">
                {pr.reviewers.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">{r.avatar}</div>
                    <span className="text-sm">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Linha do tempo</h3>
            <PRTimeline timeline={pr.timeline} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
