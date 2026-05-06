import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/formatDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Thermometer,
  RefreshCw,
  Leaf,
  Package,
  MoveRight,
  Scale,
} from "lucide-react";

// ─── Status badge colours ─────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  partially_consumed: "bg-yellow-100 text-yellow-800",
  in_packing: "bg-blue-100 text-blue-800",
  fully_consumed: "bg-gray-100 text-gray-600",
  shipped: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-700",
  damaged: "bg-red-100 text-red-700",
};

// ─── Product type summary card config ────────────────────────────────────────

interface ProductSummaryCard {
  key: string;
  label: string;
  cardClass: string;
  labelClass: string;
  valueClass: string;
}

const RAW_PRODUCT_CARDS: ProductSummaryCard[] = [
  {
    key: "white_basket",
    label: "White Basket",
    cardClass: "border-slate-200 bg-slate-50",
    labelClass: "text-slate-600",
    valueClass: "text-slate-800",
  },
  {
    key: "brown_basket",
    label: "Brown Basket",
    cardClass: "border-amber-200 bg-amber-50",
    labelClass: "text-amber-700",
    valueClass: "text-amber-900",
  },
  {
    key: "white_small",
    label: "White Small",
    cardClass: "border-slate-200 bg-slate-50",
    labelClass: "text-slate-600",
    valueClass: "text-slate-800",
  },
  {
    key: "brown_small",
    label: "Brown Small",
    cardClass: "border-amber-200 bg-amber-50",
    labelClass: "text-amber-700",
    valueClass: "text-amber-900",
  },
  {
    key: "white_filling",
    label: "White Filling",
    cardClass: "border-slate-200 bg-slate-50",
    labelClass: "text-slate-600",
    valueClass: "text-slate-800",
  },
  {
    key: "brown_filling",
    label: "Brown Filling",
    cardClass: "border-amber-200 bg-amber-50",
    labelClass: "text-amber-700",
    valueClass: "text-amber-900",
  },
];

const FINISHED_PRODUCT_CARDS: ProductSummaryCard[] = [
  {
    key: "white_basket",
    label: "White Basket",
    cardClass: "border-slate-200 bg-slate-50",
    labelClass: "text-slate-600",
    valueClass: "text-slate-800",
  },
  {
    key: "brown_basket",
    label: "Brown Basket",
    cardClass: "border-amber-200 bg-amber-50",
    labelClass: "text-amber-700",
    valueClass: "text-amber-900",
  },
  {
    key: "mix",
    label: "Mix",
    cardClass: "border-violet-200 bg-violet-50",
    labelClass: "text-violet-700",
    valueClass: "text-violet-900",
  },
  {
    key: "filling",
    label: "Filling",
    cardClass: "border-emerald-200 bg-emerald-50",
    labelClass: "text-emerald-700",
    valueClass: "text-emerald-900",
  },
];

// ─── Summary shape from coldRoomSummary ──────────────────────────────────────

interface RawSummaryEntry {
  categoryName: string;
  sizeName: string;
  totalKg: number | string;
  totalBaskets: number;
  totalCartons: number;
  itemCount: number;
}

interface FinishedSummaryEntry {
  productType: string;
  totalCartons: number;
  totalKg: number | string;
  itemCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRefreshTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function productKeyFromCatSize(catName: string, sizeName: string): string {
  const cat = catName.toLowerCase();
  const size = sizeName.toLowerCase();
  if (size.includes("basket")) return `${cat}_basket`;
  if (size.includes("small")) return `${cat}_small`;
  if (size.includes("filling")) return `${cat}_filling`;
  return `${cat}_${size}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ColdRoom() {
  const [tab, setTab] = useState("raw");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Filters
  const [rawProductFilter, setRawProductFilter] = useState("all");
  const [rawStatusFilter, setRawStatusFilter] = useState("all");
  const [finishedProductFilter, setFinishedProductFilter] = useState("all");

  // ── tRPC queries ─────────────────────────────────────────────────────────────
  const summaryQ = trpc.inventory.coldRoomSummary.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const harvestedQ = trpc.inventory.harvestedList.useQuery(
    { limit: 200 },
    { refetchInterval: 30_000 }
  );

  const packedQ = trpc.inventory.packedList.useQuery(
    { status: "available", limit: 200 },
    { refetchInterval: 30_000 }
  );

  const utils = trpc.useUtils();

  // ── Lookup data ───────────────────────────────────────────────────────────────
  const categoriesQ = trpc.categories.list.useQuery({ status: "active" });
  const sizesQ = trpc.sizes.list.useQuery({ status: "active" });
  const employeesQ = trpc.employees.list.useQuery({ status: "active" });
  const roomsQ = trpc.rooms.list.useQuery({ status: "active" });

  const catMap = useMemo(
    () => new Map((categoriesQ.data || []).map((c: any) => [c.id, c.name])),
    [categoriesQ.data]
  );
  const sizeMap = useMemo(
    () => new Map((sizesQ.data || []).map((s: any) => [s.id, s.name])),
    [sizesQ.data]
  );
  const empMap = useMemo(
    () => new Map((employeesQ.data || []).map((e: any) => [e.id, e.name])),
    [employeesQ.data]
  );
  const roomMap = useMemo(
    () => new Map((roomsQ.data || []).map((r: any) => [r.id, r.name])),
    [roomsQ.data]
  );

  // ── Auto-refresh ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Manual refresh ────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    summaryQ.refetch();
    harvestedQ.refetch();
    packedQ.refetch();
    setLastRefresh(new Date());
  };

  // ── Move to packing mutation ──────────────────────────────────────────────────
  const moveToPackingMutation = trpc.inventory.moveToPackingArea.useMutation({
    onSuccess: () => {
      utils.inventory.harvestedList.invalidate();
      utils.inventory.coldRoomSummary.invalidate();
      toast.success("Moved to packing area");
    },
    onError: (e) => {
      toast.error(e.message || "Failed to move item");
    },
  });

  // ── Derived: filter raw items ──────────────────────────────────────────────────
  const rawItems = useMemo(() => {
    const items: any[] = harvestedQ.data?.items ?? [];
    // Exclude fully consumed, shipped, cancelled, damaged
    const active = items.filter((i) =>
      ["available", "partially_consumed", "in_packing"].includes(i.status)
    );
    let filtered = active;

    if (rawProductFilter !== "all") {
      filtered = filtered.filter((i) => {
        const cat = catMap.get(i.categoryId)?.toLowerCase() ?? "";
        const size = sizeMap.get(i.sizeId)?.toLowerCase() ?? "";
        const key = productKeyFromCatSize(cat, size);
        return key === rawProductFilter;
      });
    }

    if (rawStatusFilter !== "all") {
      filtered = filtered.filter((i) => i.status === rawStatusFilter);
    }

    return filtered;
  }, [harvestedQ.data, rawProductFilter, rawStatusFilter, catMap, sizeMap]);

  // ── Derived: filter packed items ───────────────────────────────────────────────
  const packedItems = useMemo(() => {
    const items: any[] = packedQ.data?.items ?? [];
    if (finishedProductFilter === "all") return items;
    return items.filter((i) => {
      const cat = catMap.get(i.categoryId)?.toLowerCase() ?? "";
      const size = sizeMap.get(i.sizeId)?.toLowerCase() ?? "";
      // Map packed product to type key
      if (finishedProductFilter === "mix") {
        return cat.includes("mix") || i.productType?.toLowerCase() === "mix";
      }
      if (finishedProductFilter === "filling") {
        return size.includes("filling");
      }
      const key = productKeyFromCatSize(cat, size);
      return key === finishedProductFilter;
    });
  }, [packedQ.data, finishedProductFilter, catMap, sizeMap]);

  // ── Summary data ───────────────────────────────────────────────────────────────
  const summary = summaryQ.data as {
    raw?: RawSummaryEntry[];
    finished?: FinishedSummaryEntry[];
  } | null | undefined;

  // Build a lookup from product key → raw summary entry
  const rawSummaryMap = useMemo(() => {
    const map: Record<string, RawSummaryEntry> = {};
    (summary?.raw ?? []).forEach((entry) => {
      const key = productKeyFromCatSize(entry.categoryName, entry.sizeName);
      map[key] = entry;
    });
    return map;
  }, [summary]);

  // Build a lookup from product type → finished summary entry
  const finishedSummaryMap = useMemo(() => {
    const map: Record<string, FinishedSummaryEntry> = {};
    (summary?.finished ?? []).forEach((entry) => {
      map[entry.productType?.toLowerCase() ?? ""] = entry;
    });
    return map;
  }, [summary]);

  const isLoading =
    summaryQ.isLoading || harvestedQ.isLoading || packedQ.isLoading;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-blue-500" />
            Cold Room
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live stock view · Last refresh:{" "}
            <span className="font-medium">{formatRefreshTime(lastRefresh)}</span>
            <span className="text-xs ml-1">(auto every 30 s)</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="raw" className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4" />
            Raw Stock
          </TabsTrigger>
          <TabsTrigger value="finished" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Finished Stock
          </TabsTrigger>
        </TabsList>

        {/* ══ RAW STOCK TAB ═══════════════════════════════════════════════════ */}
        <TabsContent value="raw" className="mt-4 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {RAW_PRODUCT_CARDS.map((card) => {
              const entry = rawSummaryMap[card.key];
              return (
                <Card
                  key={card.key}
                  className={`border ${card.cardClass} shadow-none`}
                >
                  <CardContent className="p-3 text-center">
                    <p className={`text-xs font-semibold mb-1 ${card.labelClass}`}>
                      {card.label}
                    </p>
                    {entry ? (
                      <>
                        <p className={`text-lg font-bold ${card.valueClass}`}>
                          {parseFloat(String(entry.totalKg)).toFixed(1)} kg
                        </p>
                        {entry.totalBaskets > 0 && (
                          <p className={`text-xs ${card.labelClass}`}>
                            {entry.totalBaskets} baskets
                          </p>
                        )}
                        <p className={`text-xs ${card.labelClass}`}>
                          {entry.totalCartons} cartons
                        </p>
                      </>
                    ) : (
                      <p className={`text-base font-bold ${card.valueClass} opacity-40`}>
                        —
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={rawProductFilter} onValueChange={setRawProductFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {RAW_PRODUCT_CARDS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rawStatusFilter} onValueChange={setRawStatusFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="partially_consumed">Partially Consumed</SelectItem>
                <SelectItem value="in_packing">In Packing</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground self-center">
              {rawItems.length} item{rawItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Items table */}
          {harvestedQ.isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rawItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No raw stock in cold room
            </p>
          ) : (
            <div className="space-y-2">
              {rawItems.map((item: any) => {
                const catName = catMap.get(item.categoryId) ?? "-";
                const sizeName = sizeMap.get(item.sizeId) ?? "-";
                const empName = empMap.get(item.employeeId) ?? "-";
                const roomName = roomMap.get(item.roomId) ?? "-";
                const remWeight = parseFloat(String(item.remainingWeight ?? item.originalWeight)).toFixed(2);
                const origWeight = parseFloat(String(item.originalWeight)).toFixed(2);
                const hasBaskets =
                  sizeName.toLowerCase() === "basket" ||
                  sizeName.toLowerCase() === "small";
                const remainingBaskets = hasBaskets
                  ? item.remainingBoxCount != null
                    ? item.remainingBoxCount * 6
                    : item.boxCount * 6
                  : null;
                const canMove = item.status === "available" || item.status === "partially_consumed";

                return (
                  <Card key={item.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-sm font-bold">{item.barcode}</p>
                            <Badge
                              className={`text-xs ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {item.status?.replace(/_/g, " ")}
                            </Badge>
                            <Badge
                              className={`text-xs ${catName.toLowerCase() === "brown" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}`}
                            >
                              {catName} {sizeName}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                            <span>Worker: {empName}</span>
                            <span>Room: {roomName}</span>
                            <span>Wave: {item.harvestWave}</span>
                            <span>Date: {formatDate(item.harvestDate)}</span>
                            <span>
                              Weight: <strong className="text-foreground">{remWeight} kg</strong>
                              {remWeight !== origWeight && (
                                <span className="ml-1 opacity-70">/ {origWeight} kg</span>
                              )}
                            </span>
                            {remainingBaskets !== null && (
                              <span>
                                Baskets left:{" "}
                                <strong className="text-foreground">{remainingBaskets}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        {canMove && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 h-8 text-xs gap-1"
                            disabled={moveToPackingMutation.isPending}
                            onClick={() =>
                              moveToPackingMutation.mutate({ inventoryId: item.id })
                            }
                          >
                            <MoveRight className="h-3.5 w-3.5" />
                            Packing
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══ FINISHED STOCK TAB ════════════════════════════════════════════════ */}
        <TabsContent value="finished" className="mt-4 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FINISHED_PRODUCT_CARDS.map((card) => {
              const entry =
                finishedSummaryMap[card.key] ??
                finishedSummaryMap[card.label.toLowerCase()];
              return (
                <Card
                  key={card.key}
                  className={`border ${card.cardClass} shadow-none`}
                >
                  <CardContent className="p-3 text-center">
                    <p className={`text-xs font-semibold mb-1 ${card.labelClass}`}>
                      {card.label}
                    </p>
                    {entry ? (
                      <>
                        <p className={`text-lg font-bold ${card.valueClass}`}>
                          {entry.totalCartons} cartons
                        </p>
                        <p className={`text-xs ${card.labelClass}`}>
                          {parseFloat(String(entry.totalKg)).toFixed(1)} kg
                        </p>
                      </>
                    ) : (
                      <p className={`text-base font-bold ${card.valueClass} opacity-40`}>
                        —
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          {/* Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={finishedProductFilter}
              onValueChange={setFinishedProductFilter}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {FINISHED_PRODUCT_CARDS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground self-center">
              {packedItems.length} item{packedItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Items table */}
          {packedQ.isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : packedItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No finished stock in cold room
            </p>
          ) : (
            <div className="space-y-2">
              {packedItems.map((item: any) => {
                const catName = catMap.get(item.categoryId) ?? "-";
                const sizeName = sizeMap.get(item.sizeId) ?? "-";
                const weight = parseFloat(String(item.packedWeight ?? 0)).toFixed(2);

                return (
                  <Card key={item.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-sm font-bold">{item.barcode}</p>
                            <Badge
                              className={`text-xs ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {item.status}
                            </Badge>
                            <Badge
                              className={`text-xs ${catName.toLowerCase() === "brown" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}`}
                            >
                              {catName} {sizeName}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                            <span>
                              Cartons:{" "}
                              <strong className="text-foreground">{item.cartonCount ?? item.unitCount ?? "-"}</strong>
                            </span>
                            <span>
                              Units:{" "}
                              <strong className="text-foreground">{item.unitCount ?? "-"}</strong>
                            </span>
                            <span>
                              Weight:{" "}
                              <strong className="text-foreground">
                                <Scale className="inline h-3 w-3 mr-0.5" />
                                {weight} kg
                              </strong>
                            </span>
                            <span>Packed: {formatDate(item.packingDate)}</span>
                            {item.expiryDate && (
                              <span>Expiry: {formatDate(item.expiryDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
