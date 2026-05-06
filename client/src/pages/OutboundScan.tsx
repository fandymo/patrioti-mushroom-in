import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRightFromLine, Search, Check, Package, AlertTriangle } from "lucide-react";

type ShippedItem = {
  barcode: string;
  weight: string;
  units: number;
  timestamp: string;
};

export default function OutboundScan() {
  const utils = trpc.useUtils();
  const [scanBarcode, setScanBarcode] = useState("");
  const [notes, setNotes] = useState("");
  const [shippedItems, setShippedItems] = useState<ShippedItem[]>([]);
  const [lastError, setLastError] = useState("");

  const shipMutation = trpc.inventory.packedShip.useMutation({
    onSuccess: (result) => {
      const item = result.item as any;
      setShippedItems((prev) => [
        {
          barcode: item.barcode,
          weight: String(item.packedWeight),
          units: item.unitCount,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      toast.success(`Shipped: ${item.barcode}`);
      setScanBarcode("");
      setNotes("");
      setLastError("");
      utils.inventory.packedList.invalidate();
      utils.inventory.summary.invalidate();
      utils.inventory.movements.invalidate();
    },
    onError: (err) => {
      setLastError(err.message);
      toast.error(err.message);
    },
  });

  const handleScan = () => {
    if (!scanBarcode.trim()) return;
    setLastError("");
    shipMutation.mutate({
      barcode: scanBarcode.trim(),
      notes: notes || undefined,
    });
  };

  const totalShipped = shippedItems.reduce((sum, i) => sum + parseFloat(i.weight || "0"), 0);
  const totalUnits = shippedItems.reduce((sum, i) => sum + i.units, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ArrowRightFromLine className="h-6 w-6 text-primary" />
          Outbound Scanning
        </h1>
        <p className="text-muted-foreground mt-1">Scan packed product barcodes to mark as shipped</p>
      </div>

      {/* Scan input */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-base font-medium">Scan Packed Barcode</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Scan or enter packed barcode (P-...)"
                value={scanBarcode}
                onChange={(e) => { setScanBarcode(e.target.value); setLastError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="flex-1 h-12 text-lg font-mono"
                autoFocus
              />
              <Button onClick={handleScan} disabled={shipMutation.isPending} className="h-12 px-6">
                {shipMutation.isPending ? "..." : <Search className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Delivery notes, truck number, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {lastError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session summary */}
      {shippedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Session Summary</span>
              <Badge variant="outline" className="text-base">
                {shippedItems.length} items | {totalShipped.toFixed(2)}kg | {totalUnits} units
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {shippedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                  <Check className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold">{item.barcode}</p>
                    <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{parseFloat(item.weight).toFixed(2)}kg</p>
                    <p className="text-xs text-muted-foreground">{item.units} units</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {shippedItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No items scanned yet in this session.</p>
          <p className="text-sm mt-1">Scan a packed product barcode to begin shipping.</p>
        </div>
      )}
    </div>
  );
}
