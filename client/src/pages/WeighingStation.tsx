import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { printLabels } from "@/lib/printLabel";
import { formatDate } from "@/lib/formatDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Printer, Scale, Clock, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

// ─── Product type definitions ────────────────────────────────────────────────

type ProductType =
  | "white_basket"
  | "brown_basket"
  | "white_small"
  | "brown_small"
  | "white_filling"
  | "brown_filling";

interface ProductOption {
  key: ProductType;
  label: string;
  shortLabel: string;
  color: string; // Tailwind class set for active state
  inactiveColor: string;
  categoryName: "White" | "Brown";
  sizeName: "Basket" | "Small" | "Filling";
  hasBaskets: boolean;
}

const PRODUCT_OPTIONS: ProductOption[] = [
  {
    key: "white_basket",
    label: "White Basket",
    shortLabel: "White\nBasket",
    color: "bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-500",
    inactiveColor: "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
    categoryName: "White",
    sizeName: "Basket",
    hasBaskets: true,
  },
  {
    key: "brown_basket",
    label: "Brown Basket",
    shortLabel: "Brown\nBasket",
    color: "bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-600",
    inactiveColor: "bg-white border-amber-200 text-amber-800 hover:bg-amber-50",
    categoryName: "Brown",
    sizeName: "Basket",
    hasBaskets: true,
  },
  {
    key: "white_small",
    label: "White Small (Grade B)",
    shortLabel: "White\nSmall",
    color: "bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-500",
    inactiveColor: "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
    categoryName: "White",
    sizeName: "Small",
    hasBaskets: true,
  },
  {
    key: "brown_small",
    label: "Brown Small (Grade B)",
    shortLabel: "Brown\nSmall",
    color: "bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-600",
    inactiveColor: "bg-white border-amber-200 text-amber-800 hover:bg-amber-50",
    categoryName: "Brown",
    sizeName: "Small",
    hasBaskets: true,
  },
  {
    key: "white_filling",
    label: "White Filling",
    shortLabel: "White\nFilling",
    color: "bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-500",
    inactiveColor: "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
    categoryName: "White",
    sizeName: "Filling",
    hasBaskets: false,
  },
  {
    key: "brown_filling",
    label: "Brown Filling",
    shortLabel: "Brown\nFilling",
    color: "bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-600",
    inactiveColor: "bg-white border-amber-200 text-amber-800 hover:bg-amber-50",
    categoryName: "Brown",
    sizeName: "Filling",
    hasBaskets: false,
  },
];

// ─── Recent entry type (from harvestedList) ───────────────────────────────────

interface RecentEntry {
  id: number;
  barcode: string;
  categoryId: number;
  sizeId: number;
  employeeId: number;
  harvestWave: number;
  harvestDate: unknown;
  originalWeight: string | number;
  boxCount: number;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nowTimeStr() {
  return new Date().toTimeString().slice(0, 5);
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  partially_consumed: "bg-yellow-100 text-yellow-800",
  in_packing: "bg-blue-100 text-blue-800",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeighingStation() {
  const workerFieldRef = useRef<HTMLButtonElement>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [productType, setProductType] = useState<ProductType | "">("");
  const [form, setForm] = useState({
    workDate: todayStr(),
    workTime: nowTimeStr(),
    roomId: "",
    harvestWave: "",
    employeeId: "",
    shiftId: "",
    boxCount: "",
    totalWeight: "",
    notes: "",
  });
  const [notesOpen, setNotesOpen] = useState(false);

  // ── Remote data ─────────────────────────────────────────────────────────────
  const { data: employeesList } = trpc.employees.list.useQuery({ status: "active" });
  const { data: roomsList } = trpc.rooms.list.useQuery({ status: "active" });
  const { data: shiftsList } = trpc.shifts.list.useQuery({ status: "active" });
  const { data: categoriesList } = trpc.categories.list.useQuery({ status: "active" });
  const { data: sizesList } = trpc.sizes.list.useQuery({ status: "active" });

  const { data: activeCycle } = trpc.growCycles.getActiveForRoom.useQuery(
    { roomId: parseInt(form.roomId) },
    { enabled: !!form.roomId }
  );

  // Recent entries — today only
  const { data: recentData, refetch: refetchRecent } = trpc.inventory.harvestedList.useQuery({
    limit: 10,
  });

  // ── Lookup maps ─────────────────────────────────────────────────────────────
  const catMap = useMemo(
    () => new Map((categoriesList || []).map((c: any) => [c.id, c.name])),
    [categoriesList]
  );
  const sizeMap = useMemo(
    () => new Map((sizesList || []).map((s: any) => [s.id, s.name])),
    [sizesList]
  );
  const empMap = useMemo(
    () => new Map((employeesList || []).map((e: any) => [e.id, e.name])),
    [employeesList]
  );
  const roomMap = useMemo(
    () => new Map((roomsList || []).map((r: any) => [r.id, r.name])),
    [roomsList]
  );

  // ── Derived IDs from selected product type ───────────────────────────────────
  const selectedProduct = PRODUCT_OPTIONS.find((p) => p.key === productType) ?? null;

  const resolvedCategoryId = useMemo(() => {
    if (!selectedProduct) return null;
    const found = (categoriesList || []).find(
      (c: any) => c.name.toLowerCase() === selectedProduct.categoryName.toLowerCase()
    );
    return found ? found.id : null;
  }, [selectedProduct, categoriesList]);

  const resolvedSizeId = useMemo(() => {
    if (!selectedProduct) return null;
    const found = (sizesList || []).find(
      (s: any) => s.name.toLowerCase() === selectedProduct.sizeName.toLowerCase()
    );
    return found ? found.id : null;
  }, [selectedProduct, sizesList]);

  // ── Calculated display ────────────────────────────────────────────────────────
  const basketCount =
    form.boxCount && selectedProduct?.hasBaskets ? parseInt(form.boxCount) * 6 : null;

  // ── Mutation ──────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const createMutation = trpc.harvest.weighingCreate.useMutation({
    onSuccess: () => {
      utils.inventory.harvestedList.invalidate();
    },
  });

  // ── Print helper ──────────────────────────────────────────────────────────────
  const doPrintLabel = useCallback(
    (barcode: string, entry: {
      categoryName: string;
      sizeName: string;
      employeeName: string;
      roomName: string;
      harvestWave: number;
      workDate: string;
      totalWeight: string;
      boxCount: number;
      hasBaskets: boolean;
    }) => {
      const fields = [
        { label: "Product", value: `${entry.categoryName} ${entry.sizeName}` },
        { label: "Worker", value: entry.employeeName },
        { label: "Room", value: entry.roomName },
        { label: "Wave", value: String(entry.harvestWave) },
        { label: "Date", value: entry.workDate },
        { label: "Weight", value: `${entry.totalWeight} kg` },
        ...(entry.hasBaskets
          ? [
              {
                label: "Cartons",
                value: `${entry.boxCount} cartons (${entry.boxCount * 6} baskets)`,
              },
            ]
          : []),
      ];

      printLabels({
        title: "PATRIOTI MUSHROOMS",
        barcodeValue: barcode,
        fields,
        copies: entry.boxCount,
        copyLabel: "Carton",
      });
    },
    []
  );

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!productType) {
      toast.error("Please select a product type");
      return;
    }
    if (!form.roomId || !form.harvestWave || !form.employeeId || !form.shiftId) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!form.boxCount || parseInt(form.boxCount) <= 0) {
      toast.error("Raw cartons must be a positive number");
      return;
    }
    if (!form.totalWeight || parseFloat(form.totalWeight) <= 0) {
      toast.error("Weight must be a positive number");
      return;
    }
    if (!resolvedCategoryId || !resolvedSizeId) {
      toast.error("Could not resolve category/size. Check database configuration.");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        workDate: form.workDate,
        workTime: form.workTime,
        employeeId: parseInt(form.employeeId),
        roomId: parseInt(form.roomId),
        shiftId: parseInt(form.shiftId),
        categoryId: resolvedCategoryId,
        sizeId: resolvedSizeId,
        harvestWave: parseInt(form.harvestWave),
        boxCount: parseInt(form.boxCount),
        totalWeight: form.totalWeight,
        notes: form.notes || undefined,
      });

      const barcode: string = result.barcode ?? result.inventoryBarcode ?? `H-${result.id}`;
      const employeeName = empMap.get(parseInt(form.employeeId)) ?? "";
      const roomName = roomMap.get(parseInt(form.roomId)) ?? "";

      // Print labels
      doPrintLabel(barcode, {
        categoryName: selectedProduct!.categoryName,
        sizeName: selectedProduct!.sizeName,
        employeeName,
        roomName,
        harvestWave: parseInt(form.harvestWave),
        workDate: form.workDate,
        totalWeight: form.totalWeight,
        boxCount: parseInt(form.boxCount),
        hasBaskets: selectedProduct!.hasBaskets,
      });

      toast.success(`Saved! Barcode: ${barcode}`);

      // Clear entry-specific fields, keep session fields
      setForm((prev) => ({
        ...prev,
        workTime: nowTimeStr(),
        employeeId: "",
        boxCount: "",
        totalWeight: "",
        notes: "",
      }));
      setNotesOpen(false);

      // Refetch recent entries
      refetchRecent();

      // Focus worker field after short delay
      setTimeout(() => {
        workerFieldRef.current?.focus();
      }, 100);
    } catch (e: any) {
      toast.error(e.message || "Error saving record");
    }
  };

  // ── Reprint from recent ───────────────────────────────────────────────────────
  const handleReprint = (item: RecentEntry) => {
    const catName = catMap.get(item.categoryId) ?? "";
    const sizeName = sizeMap.get(item.sizeId) ?? "";
    const empName = empMap.get(item.employeeId) ?? "";
    const isBasket =
      sizeName.toLowerCase() === "basket" || sizeName.toLowerCase() === "small";

    doPrintLabel(item.barcode, {
      categoryName: catName,
      sizeName,
      employeeName: empName,
      roomName: "-",
      harvestWave: item.harvestWave,
      workDate: formatDate(item.harvestDate),
      totalWeight: String(item.originalWeight),
      boxCount: item.boxCount,
      hasBaskets: isBasket,
    });
  };

  // ── Product badge helper for recent list ──────────────────────────────────────
  const getProductBadgeClass = (categoryId: number) => {
    const name = catMap.get(categoryId)?.toLowerCase() ?? "";
    return name === "brown"
      ? "bg-amber-100 text-amber-900"
      : "bg-slate-100 text-slate-800";
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Weighing Station
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Record harvest at cold room intake
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── LEFT: Entry form ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6 space-y-5">

              {/* Product type selector — 3×2 grid */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Product Type <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setProductType(opt.key)}
                      className={[
                        "rounded-lg border-2 px-3 py-4 text-sm font-semibold transition-all",
                        "leading-tight whitespace-pre-line text-center",
                        productType === opt.key ? opt.color : opt.inactiveColor,
                      ].join(" ")}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.workDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, workDate: e.target.value }))
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Time
                  </Label>
                  <Input
                    type="time"
                    value={form.workTime}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, workTime: e.target.value }))
                    }
                    className="h-11"
                  />
                </div>
              </div>

              {/* Room */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Room <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.roomId}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, roomId: v }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roomsList || []).map((room: any) => (
                      <SelectItem key={room.id} value={String(room.id)}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Active cycle badge */}
                {form.roomId && (
                  <div className="mt-1">
                    {activeCycle ? (
                      <Badge className="bg-green-100 text-green-800 font-medium text-xs">
                        Cycle #{activeCycle.cycleNumber} — Wave {activeCycle.currentWave ?? "?"}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 font-medium text-xs">
                        No active cycle
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Wave selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Wave <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, harvestWave: String(w) }))
                      }
                      className={[
                        "flex-1 h-11 rounded-md border-2 font-bold text-base transition-all",
                        form.harvestWave === String(w)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Worker / Picker */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Worker / Picker <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, employeeId: v }))
                  }
                >
                  <SelectTrigger ref={workerFieldRef} className="h-11">
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeesList || []).map((emp: any) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Shift <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.shiftId}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, shiftId: v }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {(shiftsList || []).map((shift: any) => (
                      <SelectItem key={shift.id} value={String(shift.id)}>
                        {shift.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Raw cartons & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Raw Cartons <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="0"
                    value={form.boxCount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, boxCount: e.target.value }))
                    }
                    className="h-11 text-lg font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Weight (kg) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={form.totalWeight}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, totalWeight: e.target.value }))
                    }
                    className="h-11 text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Auto-calculated baskets */}
              {basketCount !== null && form.boxCount && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                  <span className="text-sm text-muted-foreground">Baskets: </span>
                  <span className="text-xl font-bold text-primary">
                    {basketCount}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({form.boxCount} cartons × 6)
                  </span>
                </div>
              )}

              {/* Collapsible Notes */}
              <div>
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {notesOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Notes (optional)
                </button>
                {notesOpen && (
                  <Textarea
                    placeholder="Additional notes..."
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={2}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <Save className="w-5 h-5 mr-2" />
                {createMutation.isPending ? "Saving…" : "Save & Print Label"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Recent entries ───────────────────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Recent Entries</span>
                <button
                  type="button"
                  onClick={() => refetchRecent()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Last 10 records</p>
            </CardHeader>
            <CardContent className="p-0">
              {!recentData?.items || recentData.items.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8 px-4">
                  No entries yet
                </p>
              ) : (
                <div className="divide-y">
                  {recentData.items.slice(0, 10).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-bold text-foreground truncate">
                          {item.barcode}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge
                            className={`text-xs px-1.5 py-0 ${getProductBadgeClass(item.categoryId)}`}
                          >
                            {catMap.get(item.categoryId) ?? "?"}{" "}
                            {sizeMap.get(item.sizeId) ?? ""}
                          </Badge>
                          <Badge
                            className={`text-xs px-1.5 py-0 ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {item.status?.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {empMap.get(item.employeeId) ?? "-"} ·{" "}
                          {parseFloat(String(item.originalWeight)).toFixed(2)} kg
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReprint(item)}
                        className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Re-print label"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
