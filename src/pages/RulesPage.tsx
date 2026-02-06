import { useState } from "react";
import { mockRules } from "@/data/mockData";
import { Rule } from "@/data/types";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Settings, Clock, AlertTriangle, Link2Off, GitMerge } from "lucide-react";

const ruleIcons: Record<string, React.ElementType> = {
  r1: Clock,
  r2: GitMerge,
  r3: Link2Off,
  r4: AlertTriangle,
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(mockRules);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const updateHours = (id: string, hours: number) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, hours } : r)));
  };

  const handleSave = () => {
    toast.success("Regras salvas com sucesso!");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Regras de Alerta</h1>
          <p className="text-sm text-muted-foreground">Configure quando os alertas devem ser disparados</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary border-0 gap-2">
          <Settings className="h-4 w-4" /> Salvar regras
        </Button>
      </div>

      <div className="space-y-4">
        {rules.map((rule, i) => {
          const Icon = ruleIcons[rule.id] || Settings;
          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{rule.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {rule.hours > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Limite:</span>
                      <Input
                        type="number"
                        value={rule.hours}
                        onChange={(e) => updateHours(rule.id, parseInt(e.target.value) || 0)}
                        className="w-20 h-8 text-center text-sm"
                        min={1}
                      />
                      <span className="text-xs text-muted-foreground">horas</span>
                    </div>
                  )}
                  <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
