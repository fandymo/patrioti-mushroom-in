import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Edit, DoorOpen, DoorClosed, CheckCircle } from "lucide-react";

// ─── Grow Cycles Tab ────────────────────────────────────────────────────────

function GrowCyclesTab() {
  const { data: cyclesList, isLoading: cyclesLoading } = trpc.growCycles.list.useQuery({});
  const { data: activeRooms } = trpc.rooms.list.useQuery({ status: "active" });
  const utils = trpc.useUtils();

  const [newCycleDialogOpen, setNewCycleDialogOpen] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    roomId: "",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const createCycleMutation = trpc.growCycles.create.useMutation({
    onSuccess: () => {
      utils.growCycles.list.invalidate();
      setNewCycleDialogOpen(false);
      setNewCycleForm({ roomId: "", startDate: new Date().toISOString().slice(0, 10), notes: "" });
      toast.success("Grow cycle started");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCycleMutation = trpc.growCycles.update.useMutation({
    onSuccess: () => {
      utils.growCycles.list.invalidate();
      toast.success("Cycle marked as completed");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleStartCycle = async () => {
    if (!newCycleForm.roomId) { toast.error("Please select a room"); return; }
    if (!newCycleForm.startDate) { toast.error("Start date is required"); return; }
    await createCycleMutation.mutateAsync({
      roomId: Number(newCycleForm.roomId),
      startDate: newCycleForm.startDate,
      notes: newCycleForm.notes || undefined,
    });
  };

  const handleCompleteCycle = async (id: number) => {
    await updateCycleMutation.mutateAsync({
      id,
      status: "completed",
      endDate: new Date().toISOString().slice(0, 10),
    });
  };

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
    if (status === "harvesting") return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Harvesting</Badge>;
    return <Badge className="bg-gray-100 text-gray-500 border-gray-200">Completed</Badge>;
  };

  // Group cycles by room name
  const cyclesByRoom: Record<string, { roomName: string; cycles: typeof cyclesList }> = {};
  if (cyclesList) {
    for (const cycle of cyclesList) {
      const key = String((cycle as any).roomId ?? "unknown");
      const roomName = (cycle as any).roomName ?? (cycle as any).room?.name ?? `Room ${key}`;
      if (!cyclesByRoom[key]) cyclesByRoom[key] = { roomName, cycles: [] };
      cyclesByRoom[key].cycles!.push(cycle);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Grow Cycles</h2>
          <p className="text-muted-foreground text-sm mt-1">{cyclesList?.length ?? 0} cycles</p>
        </div>
        <Button onClick={() => setNewCycleDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Start New Cycle
        </Button>
      </div>

      {cyclesLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !cyclesList?.length ? (
        <div className="text-center py-12 text-muted-foreground">No grow cycles found</div>
      ) : (
        Object.values(cyclesByRoom).map(({ roomName, cycles }) => (
          <div key={roomName} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">{roomName}</h3>
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="divide-y">
                  {cycles!.map((cycle, idx) => (
                    <div key={(cycle as any).id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium">Cycle #{(cycle as any).cycleNumber ?? idx + 1}</span>
                        <span className="text-muted-foreground">
                          {(cycle as any).startDate
                            ? new Date((cycle as any).startDate).toLocaleDateString()
                            : "—"}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground">
                          {(cycle as any).endDate
                            ? new Date((cycle as any).endDate).toLocaleDateString()
                            : "Ongoing"}
                        </span>
                        {statusBadge((cycle as any).status)}
                      </div>
                      {((cycle as any).status === "active" || (cycle as any).status === "harvesting") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 shrink-0"
                          disabled={updateCycleMutation.isPending}
                          onClick={() => handleCompleteCycle((cycle as any).id)}
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))
      )}

      {/* Start New Cycle Dialog */}
      <Dialog open={newCycleDialogOpen} onOpenChange={setNewCycleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Grow Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Room *</Label>
              <Select
                value={newCycleForm.roomId}
                onValueChange={(v) => setNewCycleForm((p) => ({ ...p, roomId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {activeRooms?.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={newCycleForm.startDate}
                onChange={(e) => setNewCycleForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={newCycleForm.notes}
                onChange={(e) => setNewCycleForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any notes about this cycle..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCycleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStartCycle} disabled={createCycleMutation.isPending}>
              Start Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Rooms Tab ───────────────────────────────────────────────────────────────

function RoomsTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [statusFilter, setStatusFilter] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", roomType: "", notes: "" });

  const { data: roomsList, isLoading } = trpc.rooms.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter });
  const utils = trpc.useUtils();

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); setDialogOpen(false); toast.success("Room added successfully"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); setDialogOpen(false); toast.success("Room updated successfully"); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", roomType: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (room: any) => {
    setEditingId(room.id);
    setForm({ name: room.name, roomType: room.roomType || "", notes: room.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Room name is required"); return; }
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...form });
    } else {
      await createMutation.mutateAsync(form);
    }
  };

  const toggleStatus = async (room: any) => {
    const newStatus = room.status === "active" ? "inactive" : "active";
    await updateMutation.mutateAsync({ id: room.id, status: newStatus });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{roomsList?.length ?? 0} rooms</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Room
          </Button>
        )}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[130px] h-10"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : !roomsList?.length ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">No rooms found</div>
        ) : (
          roomsList.map(room => (
            <Card key={room.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{room.name}</span>
                      <Badge variant="outline" className={room.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}>
                        {room.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {room.roomType && <p className="text-xs text-muted-foreground">Type: {room.roomType}</p>}
                    {room.notes && <p className="text-xs text-muted-foreground mt-1">{room.notes}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(room)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(room)}>
                        {room.status === "active" ? <DoorClosed className="w-3.5 h-3.5 text-red-500" /> : <DoorOpen className="w-3.5 h-3.5 text-green-500" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Room" : "Add New Room"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Room Name / Number *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Room 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Room Type</Label>
              <Input value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value }))} placeholder="Block / Section" />
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Rooms() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="grow-cycles">Grow Cycles</TabsTrigger>
        </TabsList>
        <TabsContent value="rooms" className="mt-4">
          <RoomsTab />
        </TabsContent>
        <TabsContent value="grow-cycles" className="mt-4">
          <GrowCyclesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
