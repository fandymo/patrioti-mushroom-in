import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  ScanLine,
  Trash2,
  Send,
  Printer,
  Search,
  Users,
  Package,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryItem = {
  id: number;
  barcode: string;
  productType: string;
  unitCount: number;
  packedWeight: string | number;
};

type Delivery = {
  id: number;
  date: string;
  customerId?: number | null;
  customerName?: string;
  notes?: string;
  status: "draft" | "dispatched";
  totalCartons?: number;
  totalWeight?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_LABELS: Record<string, string> = {
  white_basket: "White Basket",
  brown_basket: "Brown Basket",
  mix: "Mix",
  filling: "Filling",
};

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Delivery Note Print ──────────────────────────────────────────────────────

function printDeliveryNote(params: {
  deliveryId: number;
  date: string;
  customer?: { name: string; phone?: string; address?: string } | null;
  items: DeliveryItem[];
  notes?: string;
}) {
  const { deliveryId, date, customer, items, notes } = params;

  const totalCartons = items.reduce((s, i) => s + i.unitCount, 0);
  const totalWeight = items.reduce((s, i) => s + Number(i.packedWeight), 0);

  // Breakdown by product type
  const breakdown: Record<string, { cartons: number; weight: number }> = {};
  for (const item of items) {
    const key = item.productType;
    if (!breakdown[key]) breakdown[key] = { cartons: 0, weight: 0 };
    breakdown[key].cartons += item.unitCount;
    breakdown[key].weight += Number(item.packedWeight);
  }

  const breakdownLines = Object.entries(breakdown)
    .map(([type, v]) => `${PRODUCT_LABELS[type] ?? type}: ${v.cartons} cartons, ${v.weight.toFixed(2)} kg`)
    .join(" &nbsp;|&nbsp; ");

  const itemRows = items
    .map(
      (i) => `
      <tr>
        <td class="mono">${i.barcode}</td>
        <td>${PRODUCT_LABELS[i.productType] ?? i.productType}</td>
        <td style="text-align:center">${i.unitCount}</td>
        <td style="text-align:right">${Number(i.packedWeight).toFixed(2)}</td>
      </tr>`
    )
    .join("\n");

  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    toast.error("Pop-up blocked. Please allow pop-ups for printing.");
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Delivery Note #${deliveryId}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; }
  .header { text-align: center; margin-bottom: 8mm; }
  .header h1 { font-size: 18pt; font-weight: bold; letter-spacing: 2px; }
  .header h2 { font-size: 13pt; font-weight: normal; margin-top: 2mm; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 6mm; border-top: 1px solid #ccc; padding-top: 4mm; }
  .meta-block p { font-size: 10pt; line-height: 1.6; }
  .meta-block .label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  th { background: #f0f0f0; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 3mm 2mm; border-bottom: 1.5px solid #999; text-align: left; }
  td { padding: 2.5mm 2mm; border-bottom: 0.5px solid #ddd; font-size: 10pt; }
  .mono { font-family: 'Courier New', monospace; font-size: 9.5pt; }
  .totals { background: #f8f8f8; border: 1px solid #ccc; border-radius: 3mm; padding: 4mm; margin-bottom: 6mm; }
  .totals .total-line { font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }
  .totals .breakdown { font-size: 9.5pt; color: #444; }
  .notes-section { margin-bottom: 6mm; }
  .notes-section .label { font-weight: bold; margin-bottom: 1mm; }
  .footer { border-top: 1px solid #ccc; padding-top: 4mm; font-size: 9pt; color: #666; text-align: center; }
  @media screen { body { background: #f0f0f0; padding: 10px; } .page { background: white; max-width: 800px; margin: 0 auto; padding: 20mm 15mm; box-shadow: 0 2px 8px rgba(0,0,0,0.15); } }
</style></head>
<body>
<div class="page">
  <div class="header">
    <h1>PATRIOTI MUSHROOMS</h1>
    <h2>Delivery Note</h2>
  </div>

  <div class="meta">
    <div class="meta-block">
      <p><span class="label">Delivery #:</span> ${deliveryId}</p>
      <p><span class="label">Date:</span> ${formatDate(date)}</p>
    </div>
    <div class="meta-block">
      ${customer ? `
        <p><span class="label">Customer:</span> ${customer.name}</p>
        ${customer.phone ? `<p><span class="label">Phone:</span> ${customer.phone}</p>` : ""}
        ${customer.address ? `<p><span class="label">Address:</span> ${customer.address}</p>` : ""}
      ` : "<p><em>No customer assigned</em></p>"}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Barcode</th>
        <th>Product</th>
        <th style="text-align:center">Cartons</th>
        <th style="text-align:right">Weight (kg)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <p class="total-line">Total: ${totalCartons} cartons &nbsp;·&nbsp; ${totalWeight.toFixed(2)} kg</p>
    <p class="breakdown">${breakdownLines}</p>
  </div>

  ${notes ? `
  <div class="notes-section">
    <p class="label">Notes:</p>
    <p>${notes}</p>
  </div>
  ` : ""}

  <div class="footer">
    <p>Generated ${new Date().toLocaleString()} &nbsp;·&nbsp; PATRIOTI MUSHROOMS</p>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.focus(); window.print(); }, 200);
  };
<\/script>
</body></html>`);
  printWindow.document.close();
}

// ─── Inline Add Customer Dialog ───────────────────────────────────────────────

function AddCustomerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number, name: string) => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const utils = trpc.useUtils();

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: (result: any) => {
      utils.customers.list.invalidate();
      toast.success("Customer added");
      onCreated(result.id, result.name);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    createMutation.mutate(form as any);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input autoFocus value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Delivery() {
  const utils = trpc.useUtils();

  // ── Active delivery ───────────────────────────────────────────────────────
  const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
  const [deliveryCustomerId, setDeliveryCustomerId] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // ── Scanner ────────────────────────────────────────────────────────────────
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Filters for history ────────────────────────────────────────────────────
  const [historyStatus, setHistoryStatus] = useState<string>("all");
  const [historySearch, setHistorySearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Add customer inline ───────────────────────────────────────────────────
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  // ── Dispatch confirm ──────────────────────────────────────────────────────
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const customersQ = trpc.customers.list.useQuery({ status: "active" } as any);

  const activeDeliveryQ = trpc.deliveries.get.useQuery(
    { id: activeDeliveryId! },
    { enabled: activeDeliveryId != null }
  );

  const activeItemsQ = trpc.deliveries.getItems.useQuery(
    { deliveryId: activeDeliveryId! },
    { enabled: activeDeliveryId != null }
  );

  const historyQ = trpc.deliveries.list.useQuery({
    status: historyStatus === "all" ? undefined : historyStatus,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  } as any);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createDeliveryMutation = trpc.deliveries.create.useMutation({
    onSuccess: (result: any) => {
      setActiveDeliveryId(result.id);
      setDeliveryCustomerId("");
      setDeliveryNotes("");
      utils.deliveries.list.invalidate();
      toast.success(`Delivery #${result.id} created`);
    },
    onError: (e) => toast.error(e.message),
  });

  const addItemMutation = trpc.deliveries.addItem.useMutation({
    onSuccess: () => {
      utils.deliveries.getItems.invalidate({ deliveryId: activeDeliveryId! });
      utils.deliveries.get.invalidate({ id: activeDeliveryId! });
      setScanInput("");
      setScanError("");
      setTimeout(() => scanRef.current?.focus(), 100);
    },
    onError: (e) => {
      setScanError(e.message);
      toast.error(e.message);
    },
  });

  const removeItemMutation = trpc.deliveries.removeItem.useMutation({
    onSuccess: () => {
      utils.deliveries.getItems.invalidate({ deliveryId: activeDeliveryId! });
      utils.deliveries.get.invalidate({ id: activeDeliveryId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const dispatchMutation = trpc.deliveries.dispatch.useMutation({
    onSuccess: (_result, variables) => {
      utils.deliveries.list.invalidate();
      utils.deliveries.get.invalidate({ id: activeDeliveryId! });
      toast.success("Delivery dispatched!");
      setDispatchConfirmOpen(false);
      // Print delivery note right after dispatch
      const vars = variables as any;
      const snapItems = (activeItemsQ.data ?? []) as DeliveryItem[];
      const snapCustomer = vars?.customerId
        ? (customersQ.data ?? []).find((c: any) => c.id === vars.customerId)
        : null;
      printDeliveryNote({
        deliveryId: activeDeliveryId!,
        date: today(),
        customer: snapCustomer ?? null,
        items: snapItems,
        notes: vars?.notes ?? "",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Sync customer/notes from active delivery ────────────────────────────
  useEffect(() => {
    if (activeDeliveryQ.data) {
      const d = activeDeliveryQ.data as any;
      if (d.customerId) setDeliveryCustomerId(String(d.customerId));
      if (d.notes) setDeliveryNotes(d.notes ?? "");
    }
  }, [activeDeliveryQ.data]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNewDelivery = () => {
    createDeliveryMutation.mutate({ date: today() } as any);
  };

  const handleScanItem = () => {
    const val = scanInput.trim();
    if (!val || !activeDeliveryId) return;
    setScanError("");
    addItemMutation.mutate({ deliveryId: activeDeliveryId, barcode: val } as any);
  };

  const handleRemoveItem = (itemId: number) => {
    if (!activeDeliveryId) return;
    removeItemMutation.mutate({ deliveryId: activeDeliveryId, itemId } as any);
  };

  const handleDispatch = () => {
    if (!activeDeliveryId) return;
    dispatchMutation.mutate({
      id: activeDeliveryId,
      customerId: deliveryCustomerId ? parseInt(deliveryCustomerId) : undefined,
      notes: deliveryNotes || undefined,
    } as any);
  };

  const handlePrintNote = () => {
    if (!activeDeliveryId) return;
    const delivery = activeDeliveryQ.data as any;
    const items = (activeItemsQ.data ?? []) as DeliveryItem[];
    const customer = deliveryCustomerId
      ? customersQ.data?.find((c: any) => c.id === parseInt(deliveryCustomerId))
      : null;
    printDeliveryNote({
      deliveryId: activeDeliveryId,
      date: delivery?.date ?? today(),
      customer: customer ?? null,
      items,
      notes: deliveryNotes,
    });
  };

  // ── Computed values ───────────────────────────────────────────────────────
  const activeItems = (activeItemsQ.data ?? []) as DeliveryItem[];
  const totalCartons = activeItems.reduce((s, i) => s + i.unitCount, 0);
  const totalWeight = activeItems.reduce((s, i) => s + Number(i.packedWeight), 0);

  // Breakdown by product type
  const breakdown: Record<string, { cartons: number; weight: number }> = {};
  for (const item of activeItems) {
    const key = item.productType;
    if (!breakdown[key]) breakdown[key] = { cartons: 0, weight: 0 };
    breakdown[key].cartons += item.unitCount;
    breakdown[key].weight += Number(item.packedWeight);
  }

  const activeDelivery = activeDeliveryQ.data as any;
  const isDispatched = activeDelivery?.status === "dispatched";

  // Filter history
  const historyItems = (historyQ.data?.deliveries ?? []) as any[];
  const filteredHistory = historyItems.filter((d: any) => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      String(d.id).includes(q) ||
      (d.customerName ?? "").toLowerCase().includes(q)
    );
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Delivery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Scan packed items into a delivery and dispatch</p>
        </div>
        <Button onClick={handleNewDelivery} disabled={createDeliveryMutation.isPending} className="gap-2">
          <Plus className="h-4 w-4" />
          New Delivery
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Active delivery panel ───────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          {!activeDeliveryId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground space-y-3">
                <Truck className="h-12 w-12 mx-auto opacity-30" />
                <p className="font-medium">No active delivery</p>
                <p className="text-sm">Click "New Delivery" to start, or select a draft from the history.</p>
                <Button onClick={handleNewDelivery} disabled={createDeliveryMutation.isPending} className="gap-2 mt-2">
                  <Plus className="h-4 w-4" />
                  New Delivery
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Delivery header card */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">Delivery #{activeDeliveryId}</span>
                      {activeDelivery && (
                        <Badge
                          variant="outline"
                          className={
                            isDispatched
                              ? "bg-green-50 text-green-700 border-green-300"
                              : "bg-orange-50 text-orange-600 border-orange-300"
                          }
                        >
                          {isDispatched ? "Dispatched" : "Draft"}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => {
                        setActiveDeliveryId(null);
                        setDeliveryCustomerId("");
                        setDeliveryNotes("");
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Close
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Customer */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Customer</Label>
                      <div className="flex gap-1">
                        <Select
                          value={deliveryCustomerId}
                          onValueChange={setDeliveryCustomerId}
                          disabled={isDispatched}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="No customer assigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— No customer —</SelectItem>
                            {customersQ.data?.map((c: any) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!isDispatched && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => setAddCustomerOpen(true)}
                            title="Add new customer"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input
                        value={activeDelivery?.date?.split("T")[0] ?? today()}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      placeholder="Optional delivery notes…"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      rows={2}
                      disabled={isDispatched}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Scanner */}
              {!isDispatched && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <Label className="text-sm font-medium">Scan P-Barcode to Add Item</Label>
                    <div className="flex gap-2">
                      <Input
                        ref={scanRef}
                        autoFocus
                        placeholder="Scan or type P-barcode…"
                        value={scanInput}
                        onChange={(e) => { setScanInput(e.target.value); setScanError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleScanItem()}
                        className="flex-1 h-12 text-lg font-mono"
                      />
                      <Button
                        className="h-12 px-4"
                        onClick={handleScanItem}
                        disabled={addItemMutation.isPending}
                      >
                        {addItemMutation.isPending ? "…" : <ArrowRight className="h-5 w-5" />}
                      </Button>
                    </div>
                    {scanError && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-700 text-sm">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {scanError}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Items list */}
              {activeItems.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Items ({activeItems.length})</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {totalCartons} cartons · {totalWeight.toFixed(2)} kg
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {activeItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-semibold">{item.barcode}</p>
                            <p className="text-xs text-muted-foreground">
                              {PRODUCT_LABELS[item.productType] ?? item.productType}
                            </p>
                          </div>
                          <div className="text-right shrink-0 mr-2">
                            <p className="text-sm font-medium">{item.unitCount} cartons</p>
                            <p className="text-xs text-muted-foreground">{Number(item.packedWeight).toFixed(2)} kg</p>
                          </div>
                          {!isDispatched && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={removeItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="border-t px-4 py-3 bg-slate-50 space-y-1">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{totalCartons} cartons · {totalWeight.toFixed(2)} kg</span>
                      </div>
                      {Object.entries(breakdown).map(([type, v]) => (
                        <div key={type} className="flex justify-between text-xs text-muted-foreground">
                          <span>{PRODUCT_LABELS[type] ?? type}</span>
                          <span>{v.cartons} cartons · {v.weight.toFixed(2)} kg</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScanLine className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No items added yet. Scan a P-barcode above.</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {activeItems.length > 0 && (
                  <Button variant="outline" className="gap-2" onClick={handlePrintNote}>
                    <Printer className="h-4 w-4" />
                    {isDispatched ? "Print Delivery Note" : "Print Draft"}
                  </Button>
                )}
                {!isDispatched && activeItems.length > 0 && (
                  <Button
                    className="flex-1 gap-2 h-11 text-base font-semibold"
                    onClick={() => setDispatchConfirmOpen(true)}
                  >
                    <Send className="h-5 w-5" />
                    Dispatch &amp; Print Delivery Note
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── History panel ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-3">Recent Deliveries</h2>

            {/* Filters */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by # or customer…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={historyStatus} onValueChange={setHistoryStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs col-span-1" placeholder="From" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs col-span-1" placeholder="To" />
              </div>
            </div>
          </div>

          {historyQ.isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No deliveries found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => {
                    if (d.status === "draft") {
                      setActiveDeliveryId(d.id);
                    }
                  }}
                  className={[
                    "w-full text-left rounded-lg border p-3 transition-all",
                    d.status === "draft" && d.id !== activeDeliveryId
                      ? "hover:border-primary hover:bg-accent cursor-pointer"
                      : d.id === activeDeliveryId
                      ? "border-primary bg-primary/5 cursor-default"
                      : "cursor-default",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm">Delivery #{d.id}</span>
                    <Badge
                      variant="outline"
                      className={
                        d.status === "dispatched"
                          ? "bg-green-50 text-green-700 border-green-200 text-xs"
                          : "bg-orange-50 text-orange-600 border-orange-200 text-xs"
                      }
                    >
                      {d.status === "dispatched" ? "Dispatched" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(d.date)}</span>
                    <span>{d.customerName ?? "No customer"}</span>
                  </div>
                  {(d.totalCartons != null || d.totalWeight != null) && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {d.totalCartons != null && `${d.totalCartons} cartons`}
                      {d.totalCartons != null && d.totalWeight != null && " · "}
                      {d.totalWeight != null && `${Number(d.totalWeight).toFixed(2)} kg`}
                    </div>
                  )}
                  {d.status === "draft" && d.id !== activeDeliveryId && (
                    <div className="flex items-center gap-1 text-xs text-primary mt-1">
                      <span>Continue</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch confirm dialog */}
      <Dialog open={dispatchConfirmOpen} onOpenChange={setDispatchConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dispatch Delivery #{activeDeliveryId}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              This will mark all {activeItems.length} item{activeItems.length !== 1 ? "s" : ""} as shipped
              ({totalCartons} cartons, {totalWeight.toFixed(2)} kg) and cannot be undone.
            </p>
            {!deliveryCustomerId && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No customer assigned. You can still dispatch.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDispatch}
              disabled={dispatchMutation.isPending}
              className="gap-2"
            >
              {dispatchMutation.isPending ? "Dispatching…" : (
                <>
                  <Send className="h-4 w-4" />
                  Dispatch &amp; Print
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add customer inline dialog */}
      <AddCustomerDialog
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={(id) => {
          setDeliveryCustomerId(String(id));
          setAddCustomerOpen(false);
        }}
      />

      <Separator className="hidden" />
    </div>
  );
}
