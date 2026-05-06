import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { CheckCircle, XCircle, Edit, Filter, Weight, Package } from "lucide-react";

const statusLabels: Record<string, string> = { draft: "Draft", approved: "Approved", cancelled: "Cancelled" };
const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function HarvestRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    employeeId: undefined as number | undefined,
    roomId: undefined as number | undefined,
    shiftId: undefined as number | undefined,
    status: undefined as string | undefined,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ boxCount: "", totalWeight: "", notes: "" });

  const { data: employeesList } = trpc.employees.list.useQuery({ status: "active" });
  const { data: roomsList } = trpc.rooms.list.useQuery({ status: "active" });
  const { data: shiftsList } = trpc.shifts.list.useQuery({ status: "active" });
  const { data: packagingList } = trpc.packagingTypes.list.useQuery({ status: "active" });
  const { data: categoriesList } = trpc.categories.list.useQuery({ status: "active" });
  const { data: sizesList } = trpc.sizes.list.useQuery({ status: "active" });

  const { data, isLoading } = trpc.harvest.list.useQuery({
    startDate: filters.startDate,
    endDate: filters.endDate,
    employeeId: filters.employeeId,
    roomId: filters.roomId,
    shiftId: filters.shiftId,
    status: filters.status,
    limit: 200,
  });

  const utils = trpc.useUtils();
  const approveMutation = trpc.harvest.approve.useMutation({
    onSuccess: () => { utils.harvest.list.invalidate(); toast.success("Record approved"); },
  });
  const cancelMutation = trpc.harvest.cancel.useMutation({
    onSuccess: () => { utils.harvest.list.invalidate(); toast.success("Record cancelled"); },
  });
  const updateMutation = trpc.harvest.update.useMutation({
    onSuccess: () => { utils.harvest.list.invalidate(); setEditRecord(null); toast.success("Record updated"); },
  });

  const records = data?.records ?? [];
  const totalWeight = records.reduce((sum, r) => sum + parseFloat(String(r.totalWeight)), 0);
  const totalBoxes = records.reduce((sum, r) => sum + r.boxCount, 0);

  const getName = (list: any[] | undefined, id: number) => list?.find(i => i.id === id)?.name ?? "-";

  const openEdit = (record: any) => {
    setEditRecord(record);
    setEditForm({
      boxCount: String(record.boxCount),
      totalWeight: String(record.totalWeight),
      notes: record.notes || "",
    });
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    try {
      await updateMutation.mutateAsync({
        id: editRecord.id,
        boxCount: parseInt(editForm.boxCount),
        totalWeight: editForm.totalWeight,
        notes: editForm.notes || undefined,
      });
    } catch (e: any) {
      toast.error(e.message || "Error updating record");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Records</h1>
          <p className="text-muted-foreground text-sm mt-1">{records.length} records</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={filters.employeeId ? String(filters.employeeId) : "all"} onValueChange={v => setFilters(p => ({ ...p, employeeId: v === "all" ? undefined : parseInt(v) }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employeesList?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Room</Label>
              <Select value={filters.roomId ? String(filters.roomId) : "all"} onValueChange={v => setFilters(p => ({ ...p, roomId: v === "all" ? undefined : parseInt(v) }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {roomsList?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Shift</Label>
              <Select value={filters.shiftId ? String(filters.shiftId) : "all"} onValueChange={v => setFilters(p => ({ ...p, shiftId: v === "all" ? undefined : parseInt(v) }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {shiftsList?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status ?? "all"} onValueChange={v => setFilters(p => ({ ...p, status: v === "all" ? undefined : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Bar */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5 bg-green-50 text-green-800 px-3 py-1.5 rounded-lg">
          <Weight className="w-3.5 h-3.5" />
          <span className="font-semibold">{totalWeight.toFixed(1)}</span> kg
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg">
          <Package className="w-3.5 h-3.5" />
          <span className="font-semibold">{totalBoxes}</span> boxes
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No records to display</div>
        ) : (
          records.map(record => (
            <Card key={record.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-sm">{getName(employeesList, record.employeeId)}</span>
                      <Badge variant="outline" className={`text-xs ${statusColors[record.status]}`}>
                        {statusLabels[record.status]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Room: {getName(roomsList, record.roomId)}</span>
                      <span>Shift: {getName(shiftsList, record.shiftId)}</span>
                      <span>Type: {getName(categoriesList, record.categoryId)}</span>
                      {record.sizeId && <span>Size: {getName(sizesList, record.sizeId)}</span>}
                      {(record as any).harvestWave && <span>Wave: {(record as any).harvestWave}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-semibold text-green-700">{parseFloat(String(record.totalWeight)).toFixed(1)} kg</span>
                      <span className="text-muted-foreground">{record.boxCount} boxes</span>
                      {record.avgWeightPerBox && (
                        <span className="text-xs text-muted-foreground">Avg: {parseFloat(String(record.avgWeightPerBox)).toFixed(3)}</span>
                      )}
                    </div>
                    {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {record.status === "draft" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(record)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {isAdmin && record.status === "draft" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => approveMutation.mutate({ id: record.id })}>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => cancelMutation.mutate({ id: record.id })}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={open => { if (!open) setEditRecord(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Box Count</Label>
              <Input type="number" value={editForm.boxCount} onChange={e => setEditForm(p => ({ ...p, boxCount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Weight (kg)</Label>
              <Input type="number" step="0.01" value={editForm.totalWeight} onChange={e => setEditForm(p => ({ ...p, totalWeight: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
