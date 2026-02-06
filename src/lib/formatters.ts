export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}min`;
  }
  if (diffHours < 48) return `${diffHours}h`;
  return `${diffDays}d`;
}

export function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    no_activity: "Sem atividade",
    approved_no_merge: "Aprovado sem merge",
    build_failed: "Build falhou",
    no_task: "Sem tarefa",
  };
  return labels[type] || type;
}

export function getBuildStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    success: "Sucesso",
    failure: "Falhou",
    running: "Executando",
    pending: "Pendente",
  };
  return labels[status] || status;
}
