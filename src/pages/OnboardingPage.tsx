import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Check, MessageSquare, ArrowRight, Zap, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useIntegrations } from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Team state
  const [members, setMembers] = useState<{ email: string; role: string }[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("developer");

  const { status: connected, loading, getOAuthUrl, fetchStatus, isProviderConfigured } = useIntegrations();

  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    if (connectedProvider) {
      toast.success(`${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)} conectado!`);
      fetchStatus();
      if (connectedProvider === "github") setStep(3); // Updated step reference
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
            <h2 className="text-xl font-bold mb-2">Configure seu Workspace</h2>
            <p className="text-sm text-muted-foreground mb-6">Dê um nome para a sua organização ou time.</p>
            <Input
              placeholder="Ex: Acme Corp ou Time de Engenharia"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="h-11 mb-4"
              disabled={isCreating}
            />
            <Button
              className="w-full h-11 gradient-primary border-0 gap-2"
              disabled={!orgName || isCreating}
              onClick={async () => {
                if (profile?.organization_id) {
                  setStep(2);
                  return;
                }

                setIsCreating(true);
                try {
                  // Create Org
                  const { data: org, error: orgError } = await supabase
                    .from("organizations")
                    .insert({ name: orgName })
                    .select()
                    .single();

                  if (orgError) throw orgError;

                  // Add self as admin
                  await Promise.all([
                    supabase.from("organization_members").insert({
                      user_id: user?.id,
                      organization_id: org.id,
                      role: 'admin'
                    }),
                    supabase.from("profiles").update({
                      organization_id: org.id
                    }).eq("user_id", user?.id)
                  ]);

                  await refreshProfile();
                  toast.success("Workspace criado!");
                  setStep(2);
                } catch (err) {
                  console.error("Error creating org:", err);
                  toast.error("Falha ao criar workspace.");
                } finally {
                  setIsCreating(false);
                }
              }}
            >
              {isCreating ? "Criando..." : "Continuar"} <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Convide seu time</h2>
            <p className="text-sm text-muted-foreground mb-6">Adicione colaboradores ao seu workspace.</p>

            <div className="space-y-3 mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="email@empresa.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="bg-muted border border-border rounded-md px-2 text-xs font-medium"
                >
                  <option value="developer">Dev</option>
                  <option value="lead">Lead</option>
                  <option value="admin">Admin</option>
                </select>
                <Button
                  size="sm"
                  onClick={() => {
                    if (newMemberEmail && !members.find(m => m.email === newMemberEmail)) {
                      setMembers([...members, { email: newMemberEmail, role: newMemberRole }]);
                      setNewMemberEmail("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {members.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {members.map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-card/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.email}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{member.role}</p>
                      </div>
                      <button
                        onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Zap className="h-4 w-4 rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full h-11 gradient-primary border-0 gap-2"
              disabled={isCreating}
              onClick={async () => {
                if (members.length > 0 && profile?.organization_id) {
                  setIsCreating(true);
                  try {
                    for (const member of members) {
                      // Find user by email
                      const { data: targetProfile } = await supabase
                        .from("profiles")
                        .select("user_id")
                        .eq("email", member.email)
                        .maybeSingle();

                      if (targetProfile) {
                        // Add to organization_members
                        await supabase
                          .from("organization_members")
                          .insert({
                            user_id: targetProfile.user_id,
                            organization_id: profile.organization_id,
                            role: member.role as any
                          });

                        // Update target user's profile
                        await supabase
                          .from("profiles")
                          .update({ organization_id: profile.organization_id })
                          .eq("user_id", targetProfile.user_id);
                      }
                    }

                    toast.success("Membros processados!");
                    setStep(3);
                  } catch (err) {
                    console.error("Error inviting members:", err);
                    toast.error("Alguns membros não puderam ser adicionados.");
                    setStep(3); // Continue anyway
                  } finally {
                    setIsCreating(false);
                  }
                } else {
                  setStep(3);
                }
              }}
            >
              {isCreating ? "Salvando..." : "Continuar"} <ArrowRight className="h-4 w-4" />
            </Button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground text-center transition-colors"
            >
              Adicionar mais tarde
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-2">Conectar Integrações</h2>
            <p className="text-sm text-muted-foreground mb-6">Vincule suas ferramentas de trabalho.</p>
            <div className="space-y-3 mb-6">
              <ConnectButton provider="github" label="GitHub" icon={Github} connected={connected.github} />
              <ConnectButton provider="jira" label="Jira" icon={ExternalLink} connected={connected.jira} />
              <ConnectButton provider="slack" label="Slack" icon={MessageSquare} connected={connected.slack} />
            </div>
            <Button className="w-full h-11 gradient-primary border-0 gap-2" onClick={() => setStep(4)}>
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
            <button type="button" onClick={() => setStep(4)} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
              Pular por agora
            </button>
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
