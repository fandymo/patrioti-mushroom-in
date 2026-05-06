import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PackagePlus, Check, Printer, RotateCcw } from "lucide-react";
import { printLabels } from "@/lib/printLabel";

type PrintLabelData = {
  barcode: string;
  workerName: string;
  date: string;
  time: string;
  room: string;
  mushroomType: string;
  size: string;
  wave: string;
  weight: string;
  boxCount: number;
  avgWeight: string;
};

export default function HarvestIntake() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    harvestDate: new Date().toISOString().split("T")[0],
    harvestTime: new Date().toTimeString().slice(0, 5),
    roomId: "",
    harvestWave: "",
    employeeId: "",
    categoryId: "",
    sizeId: "",
    originalWeight: "",
    boxCount: "",
    storageLocation: "",
    notes: "",
  });

  const [lastCreated, setLastCreated] = useState<{ id: number; barcode: string; labelData: PrintLabelData } | null>(null);
  const autoPrintRef = useRef(true);

  const roomsQ = trpc.rooms.list.useQuery({ status: "active" });
  const employeesQ = trpc.employees.list.useQuery({ status: "active" });
  const categoriesQ = trpc.categories.list.useQuery({ status: "active" });
  const sizesQ = trpc.sizes.list.useQuery({ status: "active" });
  const isWorker = user?.role !== "admin";
  const myEmployeeQ = trpc.auth.myEmployee.useQuery(undefined, { enabled: isWorker });
  const myEmployee = myEmployeeQ.data;

  const getEmployeeName = (id: string) => {
    if (isWorker && myEmployee) return myEmployee.name;
    return employeesQ.data?.find((e: any) => e.id === parseInt(id))?.name || "";
  };
  const getRoomName = (id: string) => roomsQ.data?.find((r: any) => r.id === parseInt(id))?.name || "";
  const getCategoryName = (id: string) => categoriesQ.data?.find((c: any) => c.id === parseInt(id))?.name || "";
  const getSizeName = (id: string) => sizesQ.data?.find((s: any) => s.id === parseInt(id))?.name || "";

  const createMutation = trpc.inventory.harvestedCreate.useMutation({
    onSuccess: (result) => {
      const boxCount = parseInt(form.boxCount) || 1;
      const weight = form.originalWeight;
      const avgWt = boxCount > 0 ? (parseFloat(weight) / boxCount).toFixed(3) : weight;

      const labelData: PrintLabelData = {
        barcode: result.barcode,
        workerName: getEmployeeName(form.employeeId),
        date: form.harvestDate,
        time: form.harvestTime,
        room: getRoomName(form.roomId),
        mushroomType: getCategoryName(form.categoryId),
        size: getSizeName(form.sizeId),
        wave: `Wave ${form.harvestWave}`,
        weight: weight,
        boxCount: boxCount,
        avgWeight: avgWt,
      };

      setLastCreated({ id: result.id, barcode: result.barcode, labelData });
      toast.success(`Intake recorded! Barcode: ${result.barcode} — Printing ${boxCount} label(s)...`);
      utils.inventory.harvestedList.invalidate();
      utils.inventory.summary.invalidate();
      // Reset form but keep date/time/room/wave
      setForm((prev) => ({
        ...prev,
        originalWeight: "",
        boxCount: "",
        storageLocation: "",
        notes: "",
        categoryId: prev.categoryId,
        sizeId: prev.sizeId,
      }));
    },
    onError: (err) => toast.error(err.message),
  });

  // Print label function - prints N copies (one per box)
  const handlePrint = (labelData?: PrintLabelData) => {
    const data = labelData || lastCreated?.labelData;
    if (!data) return;

    printLabels({
      barcodeValue: data.barcode,
      copies: data.boxCount,
      copyLabel: "Box",
      fields: [
        { label: "Worker", value: data.workerName },
        { label: "Date", value: `${data.date}${data.time ? " " + data.time : ""}` },
        { label: "Room", value: data.room },
        { label: "Type", value: data.mushroomType },
        { label: "Size", value: data.size },
        { label: "Wave", value: data.wave },
        { label: "Weight", value: `${data.weight}kg (${data.boxCount} boxes)` },
        { label: "Avg/Box", value: `${data.avgWeight}kg` },
      ],
    });
  };

  // Auto-print when a new item is created
  useEffect(() => {
    if (lastCreated && autoPrintRef.current) {
      const timer = setTimeout(() => {
        handlePrint(lastCreated.labelData);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [lastCreated]);

  const handleSubmit = () => {
    if (!form.roomId || !form.harvestWave || !form.categoryId || !form.originalWeight || !form.boxCount) {
      toast.error("Please fill all required fields");
      return;
    }
    const employeeId = isWorker && myEmployee ? myEmployee.id : parseInt(form.employeeId);
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    createMutation.mutate({
      harvestDate: form.harvestDate,
      harvestTime: form.harvestTime || undefined,
      roomId: parseInt(form.roomId),
      harvestWave: parseInt(form.harvestWave),
      employeeId,
      categoryId: parseInt(form.categoryId),
      sizeId: form.sizeId ? parseInt(form.sizeId) : undefined,
      originalWeight: form.originalWeight,
      boxCount: parseInt(form.boxCount),
      storageLocation: form.storageLocation || undefined,
      notes: form.notes || undefined,
    });
  };

  const handleReset = () => {
    setForm({
      harvestDate: new Date().toISOString().split("T")[0],
      harvestTime: new Date().toTimeString().slice(0, 5),
      roomId: "",
      harvestWave: "",
      employeeId: "",
      categoryId: "",
      sizeId: "",
      originalWeight: "",
      boxCount: "",
      storageLocation: "",
      notes: "",
    });
    setLastCreated(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" />
            Harvest Intake
          </h1>
          <p className="text-muted-foreground mt-1">Receive harvested products into inventory</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>
      </div>

      {/* Success banner */}
      {lastCreated && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Intake Recorded!</p>
                  <p className="text-lg font-mono font-bold text-green-900">{lastCreated.barcode}</p>
                  <p className="text-sm text-green-700">
                    {lastCreated.labelData.workerName} — {lastCreated.labelData.mushroomType} — {lastCreated.labelData.weight}kg — {lastCreated.labelData.boxCount} box(es)
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                <Printer className="h-4 w-4 mr-1" /> Reprint ({lastCreated.labelData.boxCount})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Intake Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Date, Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.harvestDate}
                onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={form.harvestTime}
                onChange={(e) => setForm({ ...form, harvestTime: e.target.value })} />
            </div>
          </div>

          {/* Row 2: Room, Wave */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Room *</Label>
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {roomsQ.data?.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Harvest Wave *</Label>
              <Select value={form.harvestWave} onValueChange={(v) => setForm({ ...form, harvestWave: v })}>
                <SelectTrigger><SelectValue placeholder="Select wave" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Wave 1</SelectItem>
                  <SelectItem value="2">Wave 2</SelectItem>
                  <SelectItem value="3">Wave 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Employee */}
          {isWorker && myEmployee ? (
            <div>
              <Label>Employee</Label>
              <Input value={myEmployee.name} disabled className="bg-muted" />
            </div>
          ) : (
            <div>
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employeesQ.data?.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Row 4: Category, Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mushroom Type *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {categoriesQ.data?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size</Label>
              <Select value={form.sizeId} onValueChange={(v) => setForm({ ...form, sizeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {sizesQ.data?.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Weight, Boxes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Weight (kg) *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.originalWeight}
                onChange={(e) => setForm({ ...form, originalWeight: e.target.value })} />
            </div>
            <div>
              <Label>Box Count *</Label>
              <Input type="number" min="1" placeholder="1"
                value={form.boxCount}
                onChange={(e) => setForm({ ...form, boxCount: e.target.value })} />
            </div>
          </div>

          {/* Row 6: Storage, Notes */}
          <div>
            <Label>Storage Location</Label>
            <Input placeholder="e.g., Cold Room A, Shelf 3"
              value={form.storageLocation}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} />
          </div>

          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full h-12 text-base">
            {createMutation.isPending ? "Saving..." : "Record Intake, Generate Barcode & Print Labels"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
