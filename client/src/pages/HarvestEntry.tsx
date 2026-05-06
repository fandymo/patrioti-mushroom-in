import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Save, RotateCcw, AlertTriangle, Printer, Check } from "lucide-react";
import { printLabels } from "@/lib/printLabel";

type PrintLabelData = {
  recordId: number;
  workerName: string;
  date: string;
  time: string;
  room: string;
  shift: string;
  mushroomType: string;
  size: string;
  wave: string;
  boxCount: number;
  totalWeight: string;
  avgWeight: string;
  notes: string;
};

export default function HarvestEntry() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [form, setForm] = useState({
    workDate: today,
    workTime: new Date().toTimeString().slice(0, 5),
    employeeId: "",
    roomId: "",
    shiftId: "",
    categoryId: "",
    sizeId: "",
    harvestWave: "",
    boxCount: "",
    totalWeight: "",
    notes: "",
  });

  const [lastPrint, setLastPrint] = useState<PrintLabelData | null>(null);
  const autoPrintRef = useRef(true);

  const { data: employeesList } = trpc.employees.list.useQuery({ status: "active" });
  const { data: roomsList } = trpc.rooms.list.useQuery({ status: "active" });
  const { data: shiftsList } = trpc.shifts.list.useQuery({ status: "active" });
  const { data: categoriesList } = trpc.categories.list.useQuery({ status: "active" });
  const { data: sizesList } = trpc.sizes.list.useQuery({ status: "active" });

  // For workers: fetch their linked employee
  const { data: myEmployee, isLoading: myEmployeeLoading } = trpc.auth.myEmployee.useQuery(
    undefined,
    { enabled: !isAdmin }
  );

  // Auto-set employee for workers
  useEffect(() => {
    if (!isAdmin && myEmployee) {
      setForm(prev => ({ ...prev, employeeId: String(myEmployee.id) }));
    }
  }, [isAdmin, myEmployee]);

  const utils = trpc.useUtils();
  const createMutation = trpc.harvest.create.useMutation({
    onSuccess: () => {
      utils.harvest.list.invalidate();
      utils.reports.dashboard.invalidate();
    },
  });

  // Helper to get names from IDs
  const getEmployeeName = (id: string) => {
    if (!isAdmin && myEmployee) return myEmployee.name;
    return employeesList?.find(e => e.id === parseInt(id))?.name || "";
  };
  const getRoomName = (id: string) => roomsList?.find(r => r.id === parseInt(id))?.name || "";
  const getShiftName = (id: string) => shiftsList?.find(s => s.id === parseInt(id))?.name || "";
  const getCategoryName = (id: string) => categoriesList?.find(c => c.id === parseInt(id))?.name || "";
  const getSizeName = (id: string) => sizesList?.find(s => s.id === parseInt(id))?.name || "";

  const avgWeight = form.boxCount && form.totalWeight && parseInt(form.boxCount) > 0
    ? (parseFloat(form.totalWeight) / parseInt(form.boxCount)).toFixed(3)
    : "0.000";

  // Print label function - prints N copies (one per box)
  const handlePrint = (labelData: PrintLabelData) => {
    // Generate a barcode value from the record
    const barcodeValue = `HR-${labelData.recordId}`;
    
    printLabels({
      barcodeValue,
      copies: labelData.boxCount,
      copyLabel: "Box",
      fields: [
        { label: "Worker", value: labelData.workerName },
        { label: "Date", value: `${labelData.date}${labelData.time ? " " + labelData.time : ""}` },
        { label: "Room", value: labelData.room },
        { label: "Type", value: labelData.mushroomType },
        { label: "Size", value: labelData.size },
        { label: "Wave", value: labelData.wave },
        { label: "Weight", value: `${labelData.totalWeight}kg (${labelData.boxCount} boxes)` },
        { label: "Avg/Box", value: `${labelData.avgWeight}kg` },
      ],
    });
  };

  // Auto-print when a new record is saved
  useEffect(() => {
    if (lastPrint && autoPrintRef.current) {
      const timer = setTimeout(() => {
        handlePrint(lastPrint);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [lastPrint]);

  const handleSubmit = async (continueEntry: boolean) => {
    if (!form.employeeId || !form.roomId || !form.shiftId || !form.categoryId || !form.sizeId || !form.harvestWave) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!form.boxCount || parseInt(form.boxCount) <= 0) {
      toast.error("Box count must be a positive number");
      return;
    }
    if (!form.totalWeight || parseFloat(form.totalWeight) <= 0) {
      toast.error("Weight must be a positive number");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        workDate: form.workDate,
        workTime: form.workTime,
        employeeId: parseInt(form.employeeId),
        roomId: parseInt(form.roomId),
        shiftId: parseInt(form.shiftId),
        packagingTypeId: 1,
        categoryId: parseInt(form.categoryId),
        sizeId: parseInt(form.sizeId),
        harvestWave: parseInt(form.harvestWave),
        boxCount: parseInt(form.boxCount),
        totalWeight: form.totalWeight,
        notes: form.notes || undefined,
      });

      // Build label data for printing
      const labelData: PrintLabelData = {
        recordId: result.id,
        workerName: getEmployeeName(form.employeeId),
        date: form.workDate,
        time: form.workTime,
        room: getRoomName(form.roomId),
        shift: getShiftName(form.shiftId),
        mushroomType: getCategoryName(form.categoryId),
        size: getSizeName(form.sizeId),
        wave: `Wave ${form.harvestWave}`,
        boxCount: parseInt(form.boxCount),
        totalWeight: form.totalWeight,
        avgWeight: avgWeight,
        notes: form.notes,
      };

      setLastPrint(labelData);
      toast.success(`Record saved! Printing ${labelData.boxCount} label(s)...`);

      if (continueEntry) {
        setForm(prev => ({
          ...prev,
          boxCount: "",
          totalWeight: "",
          notes: "",
          workTime: new Date().toTimeString().slice(0, 5),
        }));
      } else {
        setForm(prev => ({
          workDate: today,
          workTime: new Date().toTimeString().slice(0, 5),
          employeeId: isAdmin ? "" : prev.employeeId,
          roomId: "",
          shiftId: "",
          categoryId: "",
          sizeId: "",
          harvestWave: "",
          boxCount: "",
          totalWeight: "",
          notes: "",
        }));
      }
    } catch (e: any) {
      toast.error(e.message || "Error saving record");
    }
  };

  const handleReset = () => {
    setForm(prev => ({
      workDate: today,
      workTime: new Date().toTimeString().slice(0, 5),
      employeeId: isAdmin ? "" : prev.employeeId,
      roomId: "",
      shiftId: "",
      categoryId: "",
      sizeId: "",
      harvestWave: "",
      boxCount: "",
      totalWeight: "",
      notes: "",
    }));
    setLastPrint(null);
  };

  // Show warning if worker is not linked to an employee
  if (!isAdmin && !myEmployeeLoading && !myEmployee) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">New Harvest Entry</h1>
          <p className="text-muted-foreground text-sm mt-1">Record a new harvest operation</p>
        </div>
        <Card className="shadow-sm border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <h2 className="text-lg font-semibold text-amber-800">Account Not Linked</h2>
            <p className="text-sm text-amber-700 max-w-md">
              Your user account is not linked to an employee record. Please contact your administrator to link your account so you can enter harvest data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Harvest Entry</h1>
        <p className="text-muted-foreground text-sm mt-1">Record a new harvest operation</p>
      </div>

      {/* Last print success banner */}
      {lastPrint && (
        <Card className="shadow-sm border-green-300 bg-green-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Record Saved!</p>
                  <p className="text-sm text-green-700">
                    {lastPrint.workerName} — {lastPrint.mushroomType} — {lastPrint.totalWeight}kg — {lastPrint.boxCount} box(es)
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handlePrint(lastPrint)}>
                <Printer className="h-4 w-4 mr-1" /> Reprint ({lastPrint.boxCount})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date *</Label>
              <Input
                type="date"
                value={form.workDate}
                onChange={e => setForm(prev => ({ ...prev, workDate: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Time</Label>
              <Input
                type="time"
                value={form.workTime}
                onChange={e => setForm(prev => ({ ...prev, workTime: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>

          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Employee *</Label>
            {isAdmin ? (
              <Select value={form.employeeId} onValueChange={v => setForm(prev => ({ ...prev, employeeId: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeesList?.map(emp => (
                    <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-11 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                {myEmployee?.name || "Loading..."}
              </div>
            )}
          </div>

          {/* Room & Shift */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Room *</Label>
              <Select value={form.roomId} onValueChange={v => setForm(prev => ({ ...prev, roomId: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {roomsList?.map(room => (
                    <SelectItem key={room.id} value={String(room.id)}>{room.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Shift *</Label>
              <Select value={form.shiftId} onValueChange={v => setForm(prev => ({ ...prev, shiftId: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shiftsList?.map(shift => (
                    <SelectItem key={shift.id} value={String(shift.id)}>{shift.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mushroom Type & Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mushroom Type *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(prev => ({ ...prev, categoryId: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList?.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Size *</Label>
              <Select value={form.sizeId} onValueChange={v => setForm(prev => ({ ...prev, sizeId: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {sizesList?.map(sz => (
                    <SelectItem key={sz.id} value={String(sz.id)}>{sz.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Harvest Wave */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Harvest Wave *</Label>
            <Select value={form.harvestWave} onValueChange={v => setForm(prev => ({ ...prev, harvestWave: v }))}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select wave" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map(w => (
                  <SelectItem key={w} value={String(w)}>Wave {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Box Count & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Box Count *</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="0"
                value={form.boxCount}
                onChange={e => setForm(prev => ({ ...prev, boxCount: e.target.value }))}
                className="h-11 text-lg font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Total Weight (kg) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.totalWeight}
                onChange={e => setForm(prev => ({ ...prev, totalWeight: e.target.value }))}
                className="h-11 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Average Weight Display */}
          {form.boxCount && form.totalWeight && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <span className="text-sm text-muted-foreground">Avg. weight per box: </span>
              <span className="text-lg font-bold text-primary">{avgWeight} kg</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isPending}
              className="flex-1 h-12 text-base font-medium"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Print
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={createMutation.isPending}
              variant="secondary"
              className="flex-1 h-12 text-base font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Save, Print & Continue
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="h-12"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
