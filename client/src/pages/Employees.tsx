import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Edit, UserCheck, UserX, Search } from "lucide-react";

const roleLabels: Record<string, string> = { worker: "Worker", supervisor: "Supervisor", manager: "Manager" };

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", employeeNumber: "", phone: "", role: "worker" as "worker" | "supervisor" | "manager", notes: "" });

  const { data: employees, isLoading } = trpc.employees.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter });
  const utils = trpc.useUtils();

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); setDialogOpen(false); toast.success("Employee added successfully"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); setDialogOpen(false); toast.success("Employee updated successfully"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = employees?.filter(e => !search || e.name.includes(search) || e.employeeNumber?.includes(search)) ?? [];

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", employeeNumber: "", phone: "", role: "worker" as "worker" | "supervisor" | "manager", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditingId(emp.id);
    setForm({ name: emp.name, employeeNumber: emp.employeeNumber || "", phone: emp.phone || "", role: emp.role as "worker" | "supervisor" | "manager", notes: emp.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Employee name is required"); return; }
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...form });
    } else {
      await createMutation.mutateAsync(form);
    }
  };

  const toggleStatus = async (emp: any) => {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    await updateMutation.mutateAsync({ id: emp.id, status: newStatus });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} employees</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No employees found</div>
        ) : (
          filtered.map(emp => (
            <Card key={emp.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{emp.name}</span>
                      <Badge variant="outline" className={emp.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}>
                        {emp.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{roleLabels[emp.role]}</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {emp.employeeNumber && <span>ID: {emp.employeeNumber}</span>}
                      {emp.phone && <span>Phone: {emp.phone}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(emp)}>
                        {emp.status === "active" ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee Number</Label>
                <Input value={form.employeeNumber} onChange={e => setForm(p => ({ ...p, employeeNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as "worker" | "supervisor" | "manager" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
