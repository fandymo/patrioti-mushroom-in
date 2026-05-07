import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Package,
  Printer,
  Check,
  RotateCcw,
  ScanLine,
  List,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";
import { printLabels } from "@/lib/printLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = "white_basket" | "brown_basket" | "mix" | "filling";

type SourceInfo = {
  barcode: string;
  productType: ProductType;
  status: string;
  availableWeight?: number;
  availableBaskets?: number;
  harvestWave?: number;
  room?: string;
  worker?: string;
};

type PackingResult = {
  id: number;
  barcode: string;
  productType: ProductType;
  unitCount: number;
  basketCount?: number;
  packedWeight: string;
  harvestWave?: number;
  sourceBarcode: string;
  sourceBarcodeTwo?: string;
  expiryDate?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_LABELS: Record<ProductType, string> = {
  white_basket: "White Basket",
  brown_basket: "Brown Basket",
  mix: "Mix (4 pairs)",
  filling: "Filling",
};

const BASKETS_PER_CARTON = 8;
const PAIRS_PER_CARTON = 4; // mix: 4 white + 4 brown per carton

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Cold Room Picker Dialog ──────────────────────────────────────────────────

function ColdRoomPickerDialog({
  open,
  onClose,
  onSelect,
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (barcode: string) => void;
  exclude?: string;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.inventory.harvestedList.useQuery(
    {},
    { enabled: open }
  );

  const items = (data?.items ?? []).filter((item: any) => {
    if (item.barcode === exclude) return false;
    if (!["available", "in_packing"].includes(item.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.barcode.toLowerCase().includes(q) ||
        (item.productType ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose from Cold Room</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search barcode or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No items available</div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {items.map((item: any) => (
              <button
                key={item.barcode}
                onClick={() => { onSelect(item.barcode); onClose(); }}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{item.barcode}</p>
                  <p className="text-xs text-muted-foreground">
                    {PRODUCT_LABELS[item.productType as ProductType] ?? item.productType}
                    {item.availableBaskets != null && ` · ${item.availableBaskets} baskets`}
                    {item.availableWeight != null && ` · ${Number(item.availableWeight).toFixed(2)} kg`}
                  </p>
                </div>
                <Badge variant="outline" className={item.status === "in_packing" ? "text-orange-600 border-orange-300" : "text-green-600 border-green-300"}>
                  {item.status === "in_packing" ? "In Packing" : "Available"}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Source Card ─────────────────────────────────────────────────────────────

function SourceCard({
  source,
  label = "Source",
  onClear,
  onMoveToPackingArea,
  isMoving,
}: {
  source: SourceInfo;
  label?: string;
  onClear?: () => void;
  onMoveToPackingArea?: () => void;
  isMoving?: boolean;
}) {
  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className="flex items-center gap-1">
            {source.status === "available" && onMoveToPackingArea && (
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={onMoveToPackingArea} disabled={isMoving}>
                {isMoving ? "Moving…" : "Move to Packing Area"}
              </Button>
            )}
            {source.status === "in_packing" && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">In Packing</Badge>
            )}
            {onClear && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClear}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
          <div><span className="text-muted-foreground">Barcode:</span> <span className="font-mono font-semibold">{source.barcode}</span></div>
          <div><span className="text-muted-foreground">Product:</span> {PRODUCT_LABELS[source.productType] ?? source.productType}</div>
          {source.harvestWave != null && <div><span className="text-muted-foreground">Wave:</span> {source.harvestWave}</div>}
          {source.room && <div><span className="text-muted-foreground">Room:</span> {source.room}</div>}
          {source.worker && <div><span className="text-muted-foreground">Worker:</span> {source.worker}</div>}
          {source.availableBaskets != null && <div><span className="text-muted-foreground">Baskets:</span> {source.availableBaskets}</div>}
          {source.availableWeight != null && <div><span className="text-muted-foreground">Weight:</span> {Number(source.availableWeight).toFixed(2)} kg</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Packing() {
  const utils = trpc.useUtils();

  // ── Scanner state ────────────────────────────────────────────────────────
  const [scanInput, setScanInput] = useState("");
  const [coldRoomOpen, setColdRoomOpen] = useState(false);
  const [coldRoomFor, setColdRoomFor] = useState<"primary" | "secondary">("primary");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ── Source state ──────────────────────────────────────────────────────────
  const [primarySource, setPrimarySource] = useState<SourceInfo | null>(null);
  const [secondarySource, setSecondarySource] = useState<SourceInfo | null>(null);
  const [loadingBarcode, setLoadingBarcode] = useState<string | null>(null);

  // ── Product / form state ──────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [productCatalogId, setProductCatalogId] = useState<number | null>(null);
  const [form, setForm] = useState({
    packagingTypeId: "",
    cartons: "",
    totalWeight: "",
    packerId: "",
    expiryDate: "",
    notes: "",
  });

  // ── Downgrade state ───────────────────────────────────────────────────────
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [downgradeWeight, setDowngradeWeight] = useState("");
  const [downgradeReason, setDowngradeReason] = useState("");
  const [downgradeResult, setDowngradeResult] = useState<{ barcode: string } | null>(null);

  // ── Result state ──────────────────────────────────────────────────────────
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);

  // ── Reference queries ─────────────────────────────────────────────────────
  const packagingQ = trpc.packagingTypes.list.useQuery({ status: "active" });
  const employeesQ = trpc.employees.list.useQuery({ status: "active" });
  const catalogQ = trpc.productCatalog.list.useQuery({ status: "active" });

  // ── Barcode lookup ────────────────────────────────────────────────────────
  const primaryBarcodeQ = trpc.inventory.lookupBarcode.useQuery(
    { barcode: loadingBarcode ?? "" },
    {
      enabled: !!loadingBarcode,
      retry: false,
    }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const moveMutation = trpc.inventory.moveToPackingArea.useMutation({
    onSuccess: () => {
      if (primarySource) setPrimarySource({ ...primarySource, status: "in_packing" });
      toast.success("Moved to packing area");
    },
    onError: (e) => toast.error(e.message),
  });

  const createPackingMutation = trpc.inventory.createPackingResult.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const createDowngradeMutation = trpc.inventory.createDowngrade.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // ── Handle barcode lookup result ─────────────────────────────────────────
  useEffect(() => {
    if (!loadingBarcode) return;
    if (primaryBarcodeQ.isLoading) return;

    if (primaryBarcodeQ.error) {
      toast.error(primaryBarcodeQ.error.message || "Barcode not found");
      setLoadingBarcode(null);
      return;
    }

    const data = primaryBarcodeQ.data as any;
    if (!data) return;

    if (data.type !== "harvested") {
      toast.error("This barcode is not a harvested item (H-barcode required)");
      setLoadingBarcode(null);
      return;
    }

    if (!["available", "in_packing"].includes(data.status)) {
      toast.error(`This item has status "${data.status}" and cannot be packed`);
      setLoadingBarcode(null);
      return;
    }

    const info: SourceInfo = {
      barcode: data.barcode,
      productType: data.productType as ProductType,
      status: data.status,
      availableWeight: data.availableWeight != null ? Number(data.availableWeight) : undefined,
      availableBaskets: data.availableBaskets,
      harvestWave: data.harvestWave,
      room: data.room,
      worker: data.worker,
    };

    if (coldRoomFor === "secondary") {
      setSecondarySource(info);
    } else {
      setPrimarySource(info);
      setSelectedProduct(null);
      setSecondarySource(null);
      setProductCatalogId(null);
      setForm({ packagingTypeId: "", cartons: "", totalWeight: "", packerId: "", expiryDate: "", notes: "" });
      setPackingResult(null);
      setDowngradeResult(null);
    }

    setLoadingBarcode(null);
    setScanInput("");
  }, [primaryBarcodeQ.data, primaryBarcodeQ.error, primaryBarcodeQ.isLoading, loadingBarcode, coldRoomFor]);

  // ── Scan handlers ─────────────────────────────────────────────────────────
  const handleScanPrimary = () => {
    const val = scanInput.trim();
    if (!val) return;
    setColdRoomFor("primary");
    setLoadingBarcode(val);
  };

  const handleColdRoomSelect = (barcode: string, target: "primary" | "secondary") => {
    setColdRoomFor(target);
    setLoadingBarcode(barcode);
  };

  // ── Product selection helpers ─────────────────────────────────────────────
  const canSelectMix =
    primarySource?.productType === "white_basket" ||
    primarySource?.productType === "brown_basket";

  const needsSecondary = selectedProduct === "mix" && !secondarySource;

  // Map selected product type → catalog productType values to filter by
  const catalogTypeFilter: string[] | null = selectedProduct === "white_basket"
    ? ["white_basket"]
    : selectedProduct === "brown_basket"
    ? ["brown_basket"]
    : selectedProduct === "mix"
    ? ["mix"]
    : selectedProduct === "filling"
    ? ["white_filling", "brown_filling"]
    : null;

  const filteredCatalogItems = catalogTypeFilter
    ? (catalogQ.data ?? []).filter((c: any) => catalogTypeFilter.includes(c.productType))
    : [];

  const secondaryScanRef = useRef<HTMLInputElement>(null);
  const [secondaryScanInput, setSecondaryScanInput] = useState("");

  const handleScanSecondary = () => {
    const val = secondaryScanInput.trim();
    if (!val) return;
    setColdRoomFor("secondary");
    setLoadingBarcode(val);
    setSecondaryScanInput("");
  };

  // ── Computed values ───────────────────────────────────────────────────────
  const cartonsNum = parseInt(form.cartons) || 0;
  let basketsNeeded: number | null = null;
  let basketsAvailable: number | null = null;

  if (selectedProduct === "white_basket" || selectedProduct === "brown_basket") {
    basketsNeeded = cartonsNum * BASKETS_PER_CARTON;
    basketsAvailable = primarySource?.availableBaskets ?? null;
  } else if (selectedProduct === "mix") {
    basketsNeeded = cartonsNum * PAIRS_PER_CARTON;
    basketsAvailable = primarySource?.availableBaskets ?? null;
  }

  const basketsWarning =
    basketsNeeded != null && basketsAvailable != null && basketsNeeded > basketsAvailable;

  // ── Submit packing ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!primarySource || !selectedProduct) {
      toast.error("Please scan a source barcode and select a product type");
      return;
    }
    if (!form.cartons || !form.totalWeight) {
      toast.error("Please enter cartons and total weight");
      return;
    }
    if (selectedProduct === "mix" && !secondarySource) {
      toast.error("Mix requires a second source barcode");
      return;
    }
    if (!productCatalogId) {
      toast.error("Please select a catalog product");
      return;
    }

    try {
      const result = await createPackingMutation.mutateAsync({
        sourceBarcode: primarySource.barcode,
        sourceBarcodeTwo: secondarySource?.barcode,
        productType: selectedProduct,
        unitCount: cartonsNum,
        basketCount: basketsNeeded ?? undefined,
        packedWeight: form.totalWeight,
        packagingTypeId: form.packagingTypeId ? parseInt(form.packagingTypeId) : undefined,
        packerId: form.packerId ? parseInt(form.packerId) : undefined,
        productCatalogId: productCatalogId,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      } as any);

      const r = result as any;
      const packed: PackingResult = {
        id: r.id,
        barcode: r.barcode,
        productType: selectedProduct,
        unitCount: cartonsNum,
        basketCount: basketsNeeded ?? undefined,
        packedWeight: form.totalWeight,
        harvestWave: primarySource.harvestWave,
        sourceBarcode: primarySource.barcode,
        sourceBarcodeTwo: secondarySource?.barcode,
        expiryDate: form.expiryDate || undefined,
      };

      setPackingResult(packed);
      toast.success(`Packed! Barcode: ${r.barcode}`);
      utils.inventory.harvestedList.invalidate();

      // Auto print
      setTimeout(() => printPackingLabel(packed), 400);
    } catch {
      // handled by mutation onError
    }
  };

  // ── Print label ───────────────────────────────────────────────────────────
  const printPackingLabel = (result: PackingResult) => {
    const sources = result.sourceBarcodeTwo
      ? `${result.sourceBarcode} + ${result.sourceBarcodeTwo}`
      : result.sourceBarcode;

    printLabels({
      title: "PATRIOTI MUSHROOMS",
      barcodeValue: result.barcode,
      copies: result.unitCount,
      copyLabel: "Carton",
      fields: [
        { label: "Product", value: PRODUCT_LABELS[result.productType] },
        { label: "Packed", value: formatDate(new Date().toISOString().split("T")[0]) },
        ...(result.expiryDate ? [{ label: "Expiry", value: formatDate(result.expiryDate) }] : []),
        { label: "Weight", value: `${result.packedWeight} kg` },
        { label: "Cartons", value: String(result.unitCount) },
        ...(result.basketCount != null ? [{ label: "Baskets", value: String(result.basketCount) }] : []),
        ...(result.harvestWave != null ? [{ label: "Wave", value: String(result.harvestWave) }] : []),
        { label: "Source", value: sources },
      ],
    });
  };

  // ── Downgrade ─────────────────────────────────────────────────────────────
  const handleDowngrade = async () => {
    if (!primarySource) return;
    if (!downgradeWeight) { toast.error("Enter downgraded weight"); return; }

    try {
      const result = await createDowngradeMutation.mutateAsync({
        sourceBarcode: primarySource.barcode,
        weight: downgradeWeight,
        reason: downgradeReason || undefined,
      } as any);

      const r = result as any;
      setDowngradeResult({ barcode: r.barcode });
      toast.success(`Downgrade recorded. New barcode: ${r.barcode}`);
      setDowngradeWeight("");
      setDowngradeReason("");
      utils.inventory.harvestedList.invalidate();
    } catch {
      // handled
    }
  };

  const printDowngradeLabel = () => {
    if (!downgradeResult || !primarySource) return;
    printLabels({
      title: "PATRIOTI MUSHROOMS",
      barcodeValue: downgradeResult.barcode,
      copies: 1,
      fields: [
        { label: "Product", value: "Small (Downgrade)" },
        { label: "Source", value: primarySource.barcode },
        { label: "Date", value: formatDate(new Date().toISOString().split("T")[0]) },
      ],
    });
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setPrimarySource(null);
    setSecondarySource(null);
    setSelectedProduct(null);
    setProductCatalogId(null);
    setForm({ packagingTypeId: "", cartons: "", totalWeight: "", packerId: "", expiryDate: "", notes: "" });
    setPackingResult(null);
    setDowngradeResult(null);
    setDowngradeOpen(false);
    setDowngradeWeight("");
    setDowngradeReason("");
    setScanInput("");
    setSecondaryScanInput("");
    setLoadingBarcode(null);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  }, []);

  const packAnother = () => {
    setSelectedProduct(null);
    setSecondarySource(null);
    setProductCatalogId(null);
    setForm({ packagingTypeId: "", cartons: "", totalWeight: "", packerId: "", expiryDate: "", notes: "" });
    setPackingResult(null);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Packing Station
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Scan H-barcode → choose product type → pack</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetAll} title="Reset all">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Step 1: Scan source ─────────────────────────────────────────── */}
      {!primarySource && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Step 1 — Scan H-Barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                ref={scanInputRef}
                autoFocus
                placeholder="Scan or type H-barcode…"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanPrimary()}
                className="flex-1 h-12 text-lg font-mono"
              />
              <Button
                className="h-12 px-4"
                onClick={handleScanPrimary}
                disabled={primaryBarcodeQ.isLoading && !!loadingBarcode}
              >
                {primaryBarcodeQ.isLoading && loadingBarcode ? "…" : <ArrowRight className="h-5 w-5" />}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setColdRoomFor("primary"); setColdRoomOpen(true); }}
            >
              <List className="h-4 w-4" />
              Choose from Cold Room List
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Source info + product type ──────────────────────────── */}
      {primarySource && !packingResult && (
        <>
          <SourceCard
            source={primarySource}
            label="Primary Source"
            onClear={resetAll}
            onMoveToPackingArea={() => moveMutation.mutate({ barcode: primarySource.barcode } as any)}
            isMoving={moveMutation.isPending}
          />

          {/* Product type selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Product Type to Pack</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["white_basket", "brown_basket", "mix", "filling"] as ProductType[]).map((pt) => {
                const isMixDisabled = pt === "mix" && !canSelectMix;
                return (
                  <button
                    key={pt}
                    onClick={() => {
                      if (isMixDisabled) return;
                      setSelectedProduct(pt);
                      setSecondarySource(null);
                      setProductCatalogId(null);
                    }}
                    disabled={isMixDisabled}
                    className={[
                      "p-3 rounded-lg border-2 text-sm font-semibold transition-all",
                      selectedProduct === pt
                        ? "border-primary bg-primary text-primary-foreground"
                        : isMixDisabled
                        ? "border-muted text-muted-foreground opacity-40 cursor-not-allowed"
                        : "border-border hover:border-primary hover:bg-accent",
                    ].join(" ")}
                  >
                    {PRODUCT_LABELS[pt]}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Step 3: Packing form ─────────────────────────────────────────── */}
      {primarySource && selectedProduct && !packingResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {PRODUCT_LABELS[selectedProduct]} — Pack Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mix: second source */}
            {selectedProduct === "mix" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-orange-600 uppercase">
                  Second Source ({primarySource.productType === "white_basket" ? "Brown Basket" : "White Basket"} required)
                </Label>
                {secondarySource ? (
                  <SourceCard
                    source={secondarySource}
                    label="Secondary Source"
                    onClear={() => setSecondarySource(null)}
                  />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      ref={secondaryScanRef}
                      autoFocus
                      placeholder="Scan second H-barcode…"
                      value={secondaryScanInput}
                      onChange={(e) => setSecondaryScanInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScanSecondary()}
                      className="flex-1 font-mono"
                    />
                    <Button variant="outline" onClick={handleScanSecondary}>Lookup</Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => { setColdRoomFor("secondary"); setColdRoomOpen(true); }}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Catalog Product */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Catalog Product <span className="text-red-500">*</span>
              </Label>
              <Select
                value={productCatalogId ? String(productCatalogId) : ""}
                onValueChange={(v) => setProductCatalogId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={catalogQ.isLoading ? "Loading…" : "Select catalog product…"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCatalogItems.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      #{c.rivuchitProductId} — {c.nameHebrew} ({c.unitDescription}) — {Number(c.pricePerUnit).toFixed(2)}₪
                    </SelectItem>
                  ))}
                  {filteredCatalogItems.length === 0 && !catalogQ.isLoading && (
                    <SelectItem value="_none" disabled>No catalog items found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Packaging type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Packaging Type</Label>
                <Select value={form.packagingTypeId} onValueChange={(v) => setForm((p) => ({ ...p, packagingTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {packagingQ.data?.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Packer</Label>
                <Select value={form.packerId} onValueChange={(v) => setForm((p) => ({ ...p, packerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {employeesQ.data?.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cartons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Number of Cartons *
                  {selectedProduct !== "filling" && (
                    <span className="font-normal text-muted-foreground ml-1">
                      (1 carton = {selectedProduct === "mix" ? `${PAIRS_PER_CARTON} pairs` : `${BASKETS_PER_CARTON} baskets`})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 2"
                  value={form.cartons}
                  onChange={(e) => setForm((p) => ({ ...p, cartons: e.target.value }))}
                />
                {selectedProduct !== "filling" && cartonsNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Baskets needed: <strong>{basketsNeeded}</strong>
                    {basketsAvailable != null && (
                      <> · Available: <strong className={basketsWarning ? "text-red-600" : "text-green-600"}>{basketsAvailable}</strong></>
                    )}
                  </p>
                )}
                {basketsWarning && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Not enough baskets in this source
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Total Weight (kg) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.totalWeight}
                  onChange={(e) => setForm((p) => ({ ...p, totalWeight: e.target.value }))}
                />
              </div>
            </div>

            {/* Expiry + Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="Optional…"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold mt-2"
              onClick={handleSubmit}
              disabled={createPackingMutation.isPending || (selectedProduct === "mix" && !secondarySource)}
            >
              {createPackingMutation.isPending ? (
                "Saving…"
              ) : (
                <>
                  <Printer className="h-5 w-5 mr-2" />
                  Pack &amp; Print Label
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Downgrade section ────────────────────────────────────────────── */}
      {primarySource && !packingResult && (
        <Collapsible open={downgradeOpen} onOpenChange={setDowngradeOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2 text-orange-600 border-orange-200 hover:bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              Found bad mushrooms? Record a downgrade
              {downgradeOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border-orange-200">
              <CardContent className="p-4 space-y-3">
                {downgradeResult ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <Check className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800">Downgrade recorded</p>
                        <p className="font-mono text-sm font-bold text-green-900">{downgradeResult.barcode}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={printDowngradeLabel}>
                        <Printer className="h-4 w-4 mr-2" /> Print Label
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => setDowngradeResult(null)}>
                        Record Another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Downgraded Weight (kg) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={downgradeWeight}
                          onChange={(e) => setDowngradeWeight(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Reason</Label>
                        <Input
                          placeholder="Optional…"
                          value={downgradeReason}
                          onChange={(e) => setDowngradeReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={handleDowngrade}
                      disabled={createDowngradeMutation.isPending}
                    >
                      {createDowngradeMutation.isPending ? "Recording…" : "Record Downgrade"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Success state ────────────────────────────────────────────────── */}
      {packingResult && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Check className="h-7 w-7 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-lg">Packed &amp; Label Printed!</p>
                <p className="font-mono font-bold text-xl text-green-900">{packingResult.barcode}</p>
              </div>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <p><span className="font-semibold">Product:</span> {PRODUCT_LABELS[packingResult.productType]}</p>
              <p><span className="font-semibold">Cartons:</span> {packingResult.unitCount}</p>
              {packingResult.basketCount != null && (
                <p><span className="font-semibold">Baskets:</span> {packingResult.basketCount}</p>
              )}
              <p><span className="font-semibold">Weight:</span> {packingResult.packedWeight} kg</p>
              {packingResult.expiryDate && (
                <p><span className="font-semibold">Expiry:</span> {formatDate(packingResult.expiryDate)}</p>
              )}
              <p><span className="font-semibold">Source:</span> <span className="font-mono">{packingResult.sourceBarcode}{packingResult.sourceBarcodeTwo ? ` + ${packingResult.sourceBarcodeTwo}` : ""}</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => printPackingLabel(packingResult)}>
                <Printer className="h-4 w-4 mr-2" /> Reprint
              </Button>
              <Button variant="outline" className="flex-1" onClick={packAnother}>
                <Package className="h-4 w-4 mr-2" /> Pack Another (Same Source)
              </Button>
              <Button className="flex-1" onClick={resetAll}>
                New Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cold room picker dialog */}
      <ColdRoomPickerDialog
        open={coldRoomOpen}
        onClose={() => setColdRoomOpen(false)}
        onSelect={(barcode) => handleColdRoomSelect(barcode, coldRoomFor)}
        exclude={coldRoomFor === "secondary" ? primarySource?.barcode : undefined}
      />
    </div>
  );
}
