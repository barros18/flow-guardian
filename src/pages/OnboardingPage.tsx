import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Check, MessageSquare, ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const [connected, setConnected] = useState({ github: false, jira: false, slack: false });

  const handleConnect = (service: "github" | "jira" | "slack") => {
    setTimeout(() => {
      setConnected((prev) => ({ ...prev, [service]: true }));
      toast.success(`${service.charAt(0).toUpperCase() + service.slice(1)} conectado!`);
    }, 600);
  };

  const handleFinish = () => {
    toast.success("Onboarding concluído! Monitoramento iniciado.");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8 dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center gap-2.5 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">DevSync</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "gradient-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">Passo {step} de 4</p>

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Nome da organização</h2>
            <p className="text-sm text-muted-foreground mb-6">Como seu time/empresa será identificado</p>
            <Input
              placeholder="Ex: Acme Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="h-11 mb-4"
            />
            <Button
              className="w-full h-11 gradient-primary border-0 gap-2"
              disabled={!orgName}
              onClick={() => setStep(2)}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Conectar GitHub</h2>
            <p className="text-sm text-muted-foreground mb-6">Selecione os repositórios para monitorar</p>
            <Button
              variant={connected.github ? "outline" : "default"}
              className={`w-full h-11 gap-2 mb-4 ${!connected.github ? "gradient-primary border-0" : "border-success/30 text-success"}`}
              onClick={() => handleConnect("github")}
              disabled={connected.github}
            >
              {connected.github ? <Check className="h-4 w-4" /> : <Github className="h-4 w-4" />}
              {connected.github ? "GitHub conectado" : "Conectar GitHub"}
            </Button>
            <Button
              className="w-full h-11 gradient-primary border-0 gap-2"
              disabled={!connected.github}
              onClick={() => setStep(3)}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Conectar Jira & Slack</h2>
            <p className="text-sm text-muted-foreground mb-6">Vincule tarefas e receba alertas</p>
            <div className="space-y-3 mb-6">
              <Button
                variant={connected.jira ? "outline" : "default"}
                className={`w-full h-11 gap-2 ${!connected.jira ? "" : "border-success/30 text-success"}`}
                onClick={() => handleConnect("jira")}
                disabled={connected.jira}
              >
                {connected.jira ? <Check className="h-4 w-4" /> : null}
                {connected.jira ? "Jira conectado" : "Conectar Jira"}
              </Button>
              <Button
                variant={connected.slack ? "outline" : "default"}
                className={`w-full h-11 gap-2 ${!connected.slack ? "" : "border-success/30 text-success"}`}
                onClick={() => handleConnect("slack")}
                disabled={connected.slack}
              >
                {connected.slack ? <Check className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                {connected.slack ? "Slack conectado" : "Conectar Slack"}
              </Button>
            </div>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" onClick={() => setStep(4)}>
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Não se preocupe, você pode reconectar depois
            </p>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary mx-auto mb-6 glow-primary">
              <Check className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Tudo pronto!</h2>
            <p className="text-sm text-muted-foreground mb-8">
              O DevSync vai monitorar seus repositórios e enviar alertas automaticamente.
            </p>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" onClick={handleFinish}>
              Ir para o Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
