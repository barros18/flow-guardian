import { motion } from "framer-motion";
import { mockPRs, mockAlerts } from "@/data/mockData";
import { PRCard } from "@/components/PRCard";
import { GitPullRequest, AlertTriangle, Clock, GitMerge } from "lucide-react";

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const openPRs = mockPRs.filter((pr) => pr.status === "open");
  const waitingReview = openPRs.filter((pr) => pr.approvals === 0 && !pr.blockedExternally);
  const withBuildAlerts = openPRs.filter((pr) => pr.buildStatus === "failure");
  const readyForMerge = openPRs.filter((pr) => pr.approvals > 0 && !pr.changesRequested && pr.buildStatus === "success");

  // Sort: alerts first (by priority), then by time open
  const sortedPRs = [...openPRs].sort((a, b) => {
    const priorityMap = { build_failed: 0, approved_no_merge: 1, no_activity: 2, no_task: 3 };
    const aMaxPriority = a.alerts.length > 0 ? Math.min(...a.alerts.map((al) => priorityMap[al.type] ?? 99)) : 99;
    const bMaxPriority = b.alerts.length > 0 ? Math.min(...b.alerts.map((al) => priorityMap[al.type] ?? 99)) : 99;
    if (aMaxPriority !== bMaxPriority) return aMaxPriority - bMaxPriority;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do fluxo de desenvolvimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={GitPullRequest} label="PRs abertos" value={openPRs.length} color="bg-primary/15 text-primary" />
        <StatCard icon={AlertTriangle} label="Build com alertas" value={withBuildAlerts.length} color="bg-destructive/15 text-destructive" />
        <StatCard icon={Clock} label="Aguardando review" value={waitingReview.length} color="bg-warning/15 text-warning" />
        <StatCard icon={GitMerge} label="Prontos para merge" value={readyForMerge.length} color="bg-success/15 text-success" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pull Requests</h2>
          <span className="text-xs text-muted-foreground">{sortedPRs.length} abertos</span>
        </div>
        {sortedPRs.map((pr, i) => (
          <PRCard key={pr.id} pr={pr} index={i} />
        ))}
      </div>
    </div>
  );
}
