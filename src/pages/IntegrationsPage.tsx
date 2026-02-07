import { useState, useEffect } from "react";
import { Github, MessageSquare, Check, ExternalLink, Loader2, Lock, Globe, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIntegrations } from "@/hooks/useIntegrations";
import { toast } from "sonner";

interface GithubRepo {
  name: string;
  full_name: string;
  description: string | null;
  visibility: string;
  url: string;
  language: string | null;
  updated_at: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

interface JiraProject {
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrl: string | null;
}

export default function IntegrationsPage() {
  const { status, loading, getOAuthUrl, fetchProviderData, fetchStatus } = useIntegrations();
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [loadingData, setLoadingData] = useState({ github: false, slack: false, jira: false });

  const handleConnect = (provider: "github" | "slack" | "jira") => {
    const userId = "demo-user";
    const url = getOAuthUrl(provider, userId);
    if (url && !url.includes("client_id=&") && !url.includes("client_id=undefined")) {
      window.location.href = url;
    } else {
      toast.info("Configure os OAuth Client IDs para conectar.");
    }
  };

  const handleFetchData = async (provider: "github" | "slack" | "jira") => {
    setLoadingData((prev) => ({ ...prev, [provider]: true }));
    try {
      const result = await fetchProviderData(provider);
      if (result.connected && result.data) {
        if (provider === "github") setGithubRepos(result.data);
        else if (provider === "slack") setSlackChannels(result.data);
        else if (provider === "jira") setJiraProjects(result.data);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error(`Erro ao buscar dados do ${provider}`);
    } finally {
      setLoadingData((prev) => ({ ...prev, [provider]: false }));
    }
  };

  useEffect(() => {
    if (status.github) handleFetchData("github");
    if (status.slack) handleFetchData("slack");
    if (status.jira) handleFetchData("jira");
  }, [status]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas conexões com GitHub, Slack e Jira</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* GitHub Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">GitHub</h3>
                <p className="text-xs text-muted-foreground">Repositórios</p>
              </div>
            </div>
            {status.github ? (
              <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> Conectado
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleConnect("github")} className="gap-1.5">
                Conectar <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {status.github ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loadingData.github ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : githubRepos.length > 0 ? (
                githubRepos.map((repo) => (
                  <a key={repo.full_name} href={repo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent transition-colors">
                    {repo.visibility === "private" ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{repo.name}</p>
                      {repo.description && <p className="text-xs text-muted-foreground truncate">{repo.description}</p>}
                    </div>
                    {repo.language && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{repo.language}</span>}
                  </a>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum repositório encontrado</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Conecte sua conta GitHub para ver seus repositórios</p>
          )}
        </div>

        {/* Slack Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Slack</h3>
                <p className="text-xs text-muted-foreground">Canais</p>
              </div>
            </div>
            {status.slack ? (
              <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> Conectado
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleConnect("slack")} className="gap-1.5">
                Conectar <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {status.slack ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loadingData.slack ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : slackChannels.length > 0 ? (
                slackChannels.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    {ch.is_private ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <span className="text-muted-foreground text-sm">#</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">{ch.num_members} membros</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum canal encontrado</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Conecte sua conta Slack para ver os canais</p>
          )}
        </div>

        {/* Jira Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Jira</h3>
                <p className="text-xs text-muted-foreground">Projetos</p>
              </div>
            </div>
            {status.jira ? (
              <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> Conectado
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleConnect("jira")} className="gap-1.5">
                Conectar <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {status.jira ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loadingData.jira ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : jiraProjects.length > 0 ? (
                jiraProjects.map((proj) => (
                  <div key={proj.key} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{proj.key}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proj.name}</p>
                      <p className="text-xs text-muted-foreground">{proj.projectTypeKey}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum projeto encontrado</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Conecte sua conta Jira para ver os projetos</p>
          )}
        </div>
      </div>
    </div>
  );
}
