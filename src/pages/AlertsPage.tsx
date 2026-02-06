import { Link } from "react-router-dom";
import { mockAlerts } from "@/data/mockData";
import { AlertBadge } from "@/components/AlertBadge";
import { formatTimeAgo, getAlertTypeLabel } from "@/lib/formatters";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AlertsPage() {
  const sorted = [...mockAlerts].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (b.severity === "critical" && a.severity !== "critical") return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Alertas</h1>
        <p className="text-sm text-muted-foreground">Problemas que precisam de atenção no fluxo de entrega</p>
      </div>

      <div className="space-y-3">
        {sorted.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
          >
            <Link
              to={`/pr/${alert.prId}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertBadge type={alert.type} severity={alert.severity} />
                  {alert.jiraTask && (
                    <span className="text-xs font-mono text-primary/70">{alert.jiraTask}</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  #{alert.prNumber} — {alert.prTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.message} · {alert.author} · {formatTimeAgo(alert.createdAt)} atrás
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
