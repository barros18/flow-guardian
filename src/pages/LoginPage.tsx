import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail, ArrowRight, Lock, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    if (isSignUp && !name) {
      toast.error("Preencha o nome");
      return;
    }
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message?.includes("already registered")) {
            toast.error("Este email já está cadastrado. Faça login.");
          } else {
            toast.error(error.message || "Erro ao criar conta");
          }
        } else {
          toast.success("Conta criada! Verifique seu email ou faça login.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error("Email ou senha incorretos");
        }
      }
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (loginEmail: string, loginPassword: string) => {
    setEmail(loginEmail);
    setPassword(loginPassword);
    setLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) toast.error("Erro ao fazer login. Verifique se os usuários de teste foram criados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen dark">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-card p-12 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">DevSync</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Visibilidade total do seu{" "}
              <span className="text-gradient">fluxo de entrega</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Monitore PRs, builds e alertas em tempo real. Elimine gargalos invisíveis
              e automatize lembretes no fluxo de desenvolvimento.
            </p>
          </motion.div>
        </div>
        <div className="relative z-10 space-y-4">
          {["PRs monitorados em tempo real via webhooks", "Alertas inteligentes para builds e inatividade", "Integração com GitHub, Jira e Slack"].map((text, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                <Zap className="h-3 w-3 text-primary" />
              </div>
              {text}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">DevSync</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {isSignUp ? "Criar conta" : "Entrar no DevSync"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isSignUp ? "Preencha os dados para se cadastrar" : "Acesse sua conta para continuar"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            )}
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            <Button className="w-full h-11 gap-2 gradient-primary border-0" disabled={loading}>
              {loading ? (
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar conta
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar agora"}
          </button>

          {/* Test users */}
          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Usuários de teste
            </p>
            <div className="space-y-2">
              {[
                { email: "admin@devsync.io", password: "admin123456", name: "Ana Silva", role: "Admin" },
                { email: "lead@devsync.io", password: "lead123456", name: "Carlos Lima", role: "Tech Lead" },
                { email: "dev@devsync.io", password: "dev123456", name: "Pedro Santos", role: "Developer" },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => quickLogin(u.email, u.password)}
                  disabled={loading}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-accent disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                      {u.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{u.role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os{" "}
            <span className="text-primary cursor-pointer hover:underline">Termos de Uso</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
