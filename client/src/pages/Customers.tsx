import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Search, UserCheck, UserX, Users } from "lucide-react";

type CustomerForm = {
  name: string;
  rivuchitAccountNumber: string;
  phone: string;
  address: string;
  notes: string;
  status: "active" | "inactive";
};

const EMPTY_FORM: CustomerForm = {
  name: "",
  rivuchitAccountNumber: "",
  phone: "",
  address: "",
  notes: "",
  status: "active",
};

export default function Customers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);

  const utils = trpc.useUtils();

  const { data: customers, isLoading } = trpc.customers.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  } as any);

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      setDialogOpen(false);
      toast.success("Customer added successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      setDialogOpen(false);
      toast.success("Customer updated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (customers ?? []).filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.address ?? "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (customer: any) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name ?? "",
      rivuchitAccountNumber: customer.rivuchitAccountNumber ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
      status: customer.status ?? "active",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...form } as any);
    } else {
      await createMutation.mutateAsync(form as any);
    }
  };

  const toggleStatus = async (customer: any) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    await updateMutation.mutateAsync({ id: customer.id, status: newStatus } as any);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Customers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          filtered.map((customer: any) => (
            <Card key={customer.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{customer.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          customer.status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500"
                        }
                      >
                        {customer.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {customer.rivuchitAccountNumber && (
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Account: <span className="font-mono">{customer.rivuchitAccountNumber}</span>
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                      {customer.phone && <span>Phone: {customer.phone}</span>}
                      {customer.address && (
                        <span className="truncate max-w-xs">Address: {customer.address}</span>
                      )}
                    </div>
                    {customer.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate">{customer.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(customer)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleStatus(customer)}
                    >
                      {customer.status === "active" ? (
                        <UserX className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name or company name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rivuchit Account #</Label>
              <Input
                value={form.rivuchitAccountNumber}
                onChange={(e) => setForm((p) => ({ ...p, rivuchitAccountNumber: e.target.value }))}
                placeholder="e.g. 1234"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street address, city, country…"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes…"
                rows={2}
              />
            </div>
            {editingId && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as "active" | "inactive" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Update" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
