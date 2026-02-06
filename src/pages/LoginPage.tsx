import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Github, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate("/dashboard"), 800);
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
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
          {[
            "PRs monitorados em tempo real via webhooks",
            "Alertas inteligentes para builds e inatividade",
            "Integração com GitHub, Jira e Slack",
          ].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">DevSync</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Entrar no DevSync</h2>
          <p className="text-sm text-muted-foreground mb-8">Acesse sua conta para continuar</p>

          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full justify-center gap-2.5 h-11"
              onClick={() => navigate("/dashboard")}
            >
              <Github className="h-4 w-4" />
              Continuar com GitHub
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center gap-2.5 h-11"
              onClick={() => navigate("/dashboard")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar com Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">ou via magic link</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Button className="w-full h-11 gap-2 gradient-primary border-0" disabled={loading}>
              {loading ? (
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Enviar magic link
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os{" "}
            <span className="text-primary cursor-pointer hover:underline">Termos de Uso</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
