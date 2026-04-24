import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import { PERMISSION_GROUPS, ALL_PERMISSIONS, PermissionKey } from "@/lib/permissions";

const AdminTeam = () => {
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("members");

  // Roles
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState<{ name: string; description: string; permissions: string[] }>({
    name: "",
    description: "",
    permissions: [],
  });

  // Members
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRoleId, setMemberRoleId] = useState("");

  const { data: roles } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_roles").select("*").order("is_system", { ascending: false }).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: members } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: tm } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
      if (!tm?.length) return [];
      const userIds = tm.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      return tm.map((m: any) => ({ ...m, full_name: profMap.get(m.user_id) || "Unknown" }));
    },
    enabled: !!user,
  });

  // ---------- Role mutations ----------
  const saveRole = useMutation({
    mutationFn: async () => {
      if (!roleForm.name.trim()) throw new Error("Role name required");
      if (editingRole) {
        const { error } = await supabase
          .from("team_roles")
          .update({
            name: roleForm.name.trim(),
            description: roleForm.description.trim() || null,
            permissions: roleForm.permissions,
          })
          .eq("id", editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_roles").insert({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
          permissions: roleForm.permissions,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-roles"] });
      toast.success(editingRole ? "Role updated" : "Role created");
      setRoleDialogOpen(false);
      setEditingRole(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-roles"] });
      toast.success("Role deleted");
    },
    onError: (e: any) => toast.error("Cannot delete: role may be assigned to a member"),
  });

  // ---------- Member mutations ----------

  const assignRole = useMutation({
    mutationFn: async ({ user_id, team_role_id }: { user_id: string; team_role_id: string }) => {
      const { error } = await supabase
        .from("team_members")
        .upsert({ user_id, team_role_id, assigned_by: user?.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team role assigned");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Member removed (reverts to Super Admin)");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Eligible admins not yet in team_members
  const { data: eligibleAdmins } = useQuery({
    queryKey: ["eligible-admins", members?.length],
    queryFn: async () => {
      const { data: adminRows } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminRows || []).map((r: any) => r.user_id);
      if (adminIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", adminIds);
      const assigned = new Set((members || []).map((m: any) => m.user_id));
      return (profiles || []).filter((p: any) => !assigned.has(p.user_id));
    },
    enabled: !!user,
  });

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: [] });
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setRoleDialogOpen(true);
  };

  const togglePerm = (perm: PermissionKey) => {
    setRoleForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const toggleAll = (checked: boolean) => {
    setRoleForm((f) => ({ ...f, permissions: checked ? [...ALL_PERMISSIONS] : [] }));
  };

  const isLockedRole = (role: any) => role.is_system && role.permissions?.includes("*");

  if (!isSuperAdmin) {
    return (
      <div>
        <AdminPageHeader title="Team & Roles" subtitle="Manage staff access and permissions." />
        <AdminEmptyState icon={ShieldCheck} title="Restricted" description="Only Super Admins can manage team roles and members." />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Team & Roles" subtitle="Define roles with scoped permissions and assign them to staff." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members"><UserCog className="h-4 w-4 mr-1.5" /> Members</TabsTrigger>
          <TabsTrigger value="roles"><ShieldCheck className="h-4 w-4 mr-1.5" /> Roles</TabsTrigger>
        </TabsList>

        {/* MEMBERS */}
        <TabsContent value="members" className="space-y-4">
          <div className="admin-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Assign a Team Role</h3>
                <p className="text-xs text-muted-foreground">Pick an existing admin and a role. To add a new admin first, use the Users page.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select onValueChange={(v) => setMemberUserId(v)}>
                <SelectTrigger className="sm:w-64"><SelectValue placeholder="Select an admin" /></SelectTrigger>
                <SelectContent>
                  {(eligibleAdmins || []).length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">No unassigned admins. Grant the Admin role from Users page first.</div>
                  )}
                  {(eligibleAdmins || []).map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => setMemberRoleId(v)}>
                <SelectTrigger className="sm:w-64"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {(roles || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!memberUserId || !memberRoleId || assignRole.isPending}
                onClick={() => assignRole.mutate({ user_id: memberUserId, team_role_id: memberRoleId })}
              >
                <UserPlus className="h-4 w-4 mr-1.5" /> Assign
              </Button>
            </div>
          </div>

          <div className="admin-card overflow-hidden">
            {(members || []).length === 0 ? (
              <AdminEmptyState icon={UserCog} title="No team members assigned" description="All current admins act as Super Admins until you assign them a role." />
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table min-w-[600px]">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Team Role</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(members || []).map((m: any) => {
                      const role = (roles || []).find((r: any) => r.id === m.team_role_id);
                      return (
                        <tr key={m.id}>
                          <td className="font-medium">{m.full_name}</td>
                          <td>
                            <Select
                              value={m.team_role_id}
                              onValueChange={(v) => assignRole.mutate({ user_id: m.user_id, team_role_id: v })}
                            >
                              <SelectTrigger className="h-8 w-56"><SelectValue>{role?.name || "—"}</SelectValue></SelectTrigger>
                              <SelectContent>
                                {(roles || []).map((r: any) => (
                                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="text-right">
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember.mutate(m.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ROLES */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateRole}><Plus className="h-4 w-4 mr-1" /> New Role</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(roles || []).map((r: any) => (
              <div key={r.id} className="admin-card p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-1.5">
                      {r.name}
                      {r.is_system && (
                        <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">System</span>
                      )}
                    </h3>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditRole(r)} disabled={isLockedRole(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={r.is_system} onClick={() => deleteRole.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.permissions?.includes("*")
                    ? "Full access (all permissions)"
                    : `${r.permissions?.length || 0} permissions`}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role editor */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role name</Label>
              <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Logistics Manager" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} rows={2} />
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Permissions</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>Select all</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleAll(false)}>Clear</Button>
                </div>
              </div>
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((g) => (
                  <div key={g.label} className="border rounded-md p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {g.perms.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={roleForm.permissions.includes(p.key)}
                            onCheckedChange={() => togglePerm(p.key)}
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => saveRole.mutate()} disabled={saveRole.isPending}>
              {saveRole.isPending ? "Saving..." : editingRole ? "Save changes" : "Create role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeam;
