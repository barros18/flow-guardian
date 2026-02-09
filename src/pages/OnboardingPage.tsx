import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Github, Check, MessageSquare, ArrowRight, Zap, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);

  const { status: connected, loading, initiateOAuth, fetchStatus } = useIntegrations();

  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    if (connectedProvider) {
      toast.success(`${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)} conectado!`);
      fetchStatus();
    }
    const error = searchParams.get("error");
    if (error) {
      toast.error("Falha na autorização OAuth. Tente novamente.");
    }
  }, [searchParams, fetchStatus]);

  const handleConnect = async (provider: "github" | "slack" | "jira") => {
    try {
      const url = await initiateOAuth(provider);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.info(`Autorize o ${provider} na nova aba aberta.`);
      }
    } catch (err: any) {
      console.error(`OAuth connect error for ${provider}:`, err);
      toast.error(err.message || `Erro ao iniciar conexão com ${provider}. Tente novamente.`);
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
  }) => (
    <Button
      variant={isConnected ? "outline" : "default"}
      className={`w-full h-11 gap-2 ${isConnected ? "border-success/30 text-success" : "gradient-primary border-0"}`}
      onClick={() => handleConnect(provider)}
      disabled={isConnected}
    >
      {isConnected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      {isConnected ? `${label} conectado` : `Conectar ${label}`}
      {!isConnected && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
    </Button>
  );

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
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "gradient-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">Passo {step} de 3</p>

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Bem-vindo ao DevSync!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Vamos configurar suas integrações para monitorar repositórios, canais e projetos.
            </p>
            <Button
              className="w-full h-11 gradient-primary border-0 gap-2"
              onClick={() => setStep(2)}
            >
              Começar <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Conectar Integrações</h2>
            <p className="text-sm text-muted-foreground mb-6">Vincule suas ferramentas de trabalho.</p>
            <div className="space-y-3 mb-6">
              <ConnectButton provider="github" label="GitHub" icon={Github} connected={connected.github} />
              <ConnectButton provider="jira" label="Jira" icon={ExternalLink} connected={connected.jira} />
              <ConnectButton provider="slack" label="Slack" icon={MessageSquare} connected={connected.slack} />
            </div>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" onClick={() => setStep(3)}>
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
            <button type="button" onClick={() => setStep(3)} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
              Pular por agora
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
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
