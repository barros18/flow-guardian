import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Check, MessageSquare, ArrowRight, Zap, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const { status: connected, loading, getOAuthUrl, fetchStatus, isProviderConfigured } = useIntegrations();

  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    if (connectedProvider) {
      toast.success(`${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)} conectado!`);
      fetchStatus();
      if (connectedProvider === "github") setStep(3);
      else if (connectedProvider === "slack" || connectedProvider === "jira") setStep(3);
    }
  }, [searchParams, fetchStatus]);

  const handleConnect = async (provider: "github" | "slack" | "jira") => {
    if (!isProviderConfigured(provider)) {
      toast.warning(`Integração com ${provider} não está configurada. Verifique os Client IDs.`);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || "demo-user";
      const url = getOAuthUrl(provider, userId);

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.info(`Autorize o ${provider} na nova aba aberta.`);
      } else {
        toast.warning(`Não foi possível gerar a URL de autorização para ${provider}.`);
      }
    } catch (err) {
      console.error(`OAuth connect error for ${provider}:`, err);
      toast.error(`Erro ao iniciar conexão com ${provider}. Tente novamente.`);
    }
  };

  const handleFinish = () => {
    toast.success("Onboarding concluído! Monitoramento iniciado.");
    navigate("/dashboard");
  };

  const ConnectButton = ({ provider, label, icon: Icon, connected: isConnected }: {
    provider: "github" | "slack" | "jira";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    connected: boolean;
  }) => {
    const configured = isProviderConfigured(provider);
    return (
      <div>
        <Button
          variant={isConnected ? "outline" : "default"}
          className={`w-full h-11 gap-2 ${isConnected ? "border-success/30 text-success" : !configured ? "opacity-60" : "gradient-primary border-0"}`}
          onClick={() => handleConnect(provider)}
          disabled={isConnected}
        >
          {isConnected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          {isConnected ? `${label} conectado` : `Conectar ${label}`}
          {!isConnected && configured && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
        </Button>
        {!configured && !isConnected && (
          <p className="text-[11px] text-warning flex items-center gap-1 mt-1.5">
            <AlertCircle className="h-3 w-3" /> Client ID não configurado
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8 dark">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">DevSync</span>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "gradient-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">Passo {step} de 4</p>

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Nome da organização</h2>
            <p className="text-sm text-muted-foreground mb-6">Como seu time/empresa será identificado</p>
            <Input placeholder="Ex: Acme Corp" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="h-11 mb-4" />
            <Button className="w-full h-11 gradient-primary border-0 gap-2" disabled={!orgName} onClick={() => setStep(2)}>
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Conectar GitHub</h2>
            <p className="text-sm text-muted-foreground mb-6">Selecione os repositórios para monitorar</p>
            <div className="mb-4">
              <ConnectButton provider="github" label="GitHub" icon={Github} connected={connected.github} />
            </div>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" disabled={!connected.github} onClick={() => setStep(3)}>
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
            <button type="button" onClick={() => setStep(3)} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
              Pular por agora
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Conectar Jira & Slack</h2>
            <p className="text-sm text-muted-foreground mb-6">Vincule tarefas e receba alertas</p>
            <div className="space-y-3 mb-6">
              <ConnectButton provider="jira" label="Jira" icon={ExternalLink} connected={connected.jira} />
              <ConnectButton provider="slack" label="Slack" icon={MessageSquare} connected={connected.slack} />
            </div>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" onClick={() => setStep(4)}>
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">Não se preocupe, você pode reconectar depois</p>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary mx-auto mb-6 glow-primary">
              <Check className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Tudo pronto!</h2>
            <p className="text-sm text-muted-foreground mb-4">O DevSync vai monitorar seus repositórios e enviar alertas automaticamente.</p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {connected.github && <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full">✓ GitHub</span>}
              {connected.jira && <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full">✓ Jira</span>}
              {connected.slack && <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full">✓ Slack</span>}
              {!connected.github && !connected.jira && !connected.slack && (
                <span className="text-xs text-muted-foreground">Nenhuma integração conectada (pode configurar depois)</span>
              )}
            </div>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" onClick={handleFinish}>
              Ir para o Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
