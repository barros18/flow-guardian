import { useState, useEffect } from "react";
import { UserRole } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Shield, Code, Eye, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

interface ProfileWithRole extends User {
  user_id: string;
  organization_id: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: Date;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-primary bg-primary/15" },
  lead: { label: "Tech Lead", icon: Eye, color: "text-warning bg-warning/15" },
  developer: { label: "Developer", icon: Code, color: "text-success bg-success/15" },
};

export default function UsersPage() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProfileWithRole | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const fetchUsers = async () => {
    if (!currentUser?.organization_id) return;
    setLoading(true);
    try {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", currentUser.organization_id);
      if (pError) throw pError;

      const { data: roles, error: rError } = await supabase.from("user_roles").select("*");
      if (rError) throw rError;

      const mappedUsers = profiles.map(p => ({
        id: p.id,
        user_id: p.user_id,
        organization_id: p.organization_id,
        name: p.name,
        email: p.email,
        avatar: p.avatar,
        role: (roles.find(r => r.user_id === p.user_id)?.role || "developer") as UserRole
      }));

      setUsers(mappedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addLog = (action: string, target: string) => {
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        action,
        user: currentUser?.name || "Sistema",
        target,
        timestamp: new Date(),
      },
      ...prev,
    ]);
  };

  const handleRoleChange = async (userId: string, targetUserId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });

      if (error) throw error;

      const user = users.find((u) => u.user_id === targetUserId);
      setUsers((prev) => prev.map((u) => (u.user_id === targetUserId ? { ...u, role } : u)));
      addLog(`Papel alterado para ${roleConfig[role].label}`, user?.name || "");
      toast.success("Papel atualizado!");
    } catch (error: any) {
      toast.error("Erro ao atualizar papel: " + error.message);
    }
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    addLog("Convite enviado", inviteEmail);
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail("");
    setOpen(false);
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== removeTarget.id));
    addLog("Usuário removido", removeTarget.name);
    toast.success("Usuário removido");
    setRemoveTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie os membros da organização</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 gap-2">
              <UserPlus className="h-4 w-4" /> Convidar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="email@empresa.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={handleInvite} className="w-full gradient-primary border-0">
                Enviar convite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>Email</span>
          <span>Papel</span>
          <span>Ação</span>
        </div>
        {users.map((user, i) => {
          const rc = roleConfig[user.role];
          const Icon = rc.icon;
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {user.avatar}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Select
                value={user.role}
                onValueChange={(val) => handleRoleChange(user.id, user.user_id, val as UserRole)}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="lead">Tech Lead</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setRemoveTarget(user)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Audit logs */}
      {auditLogs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Logs de auditoria
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 text-sm"
              >
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDistanceToNow(log.timestamp, { addSuffix: true, locale: ptBR })}
                </span>
                <span className="font-medium">{log.user}</span>
                <span className="text-muted-foreground">{log.action}</span>
                <span className="text-primary font-medium ml-auto">{log.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong> ({removeTarget?.email}) da organização? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
