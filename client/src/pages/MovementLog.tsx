import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/formatDate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, Search, ArrowDown, ArrowUp, ArrowRight, Package, Leaf, RotateCcw, Trash2, AlertTriangle } from "lucide-react";

const movementTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  harvest_intake: { label: "Harvest Intake", color: "bg-green-100 text-green-800", icon: ArrowDown },
  consume_for_packing: { label: "Consumed for Packing", color: "bg-yellow-100 text-yellow-800", icon: ArrowRight },
  packed_intake: { label: "Packed Intake", color: "bg-blue-100 text-blue-800", icon: Package },
  outbound: { label: "Outbound / Shipped", color: "bg-purple-100 text-purple-800", icon: ArrowUp },
  correction: { label: "Correction", color: "bg-orange-100 text-orange-800", icon: RotateCcw },
  cancellation: { label: "Cancellation", color: "bg-red-100 text-red-700", icon: Trash2 },
  waste: { label: "Waste", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

export default function MovementLog() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [invTypeFilter, setInvTypeFilter] = useState("all");

  const movementsQ = trpc.inventory.movements.useQuery({
    movementType: typeFilter !== "all" ? typeFilter : undefined,
    inventoryType: invTypeFilter !== "all" ? invTypeFilter : undefined,
    limit: 500,
  });

  const filteredMovements = useMemo(() => {
    const items = movementsQ.data?.movements || [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((m: any) =>
      m.itemBarcode?.toLowerCase().includes(q) ||
      m.notes?.toLowerCase().includes(q)
    );
  }, [movementsQ.data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Movement Log
        </h1>
        <p className="text-muted-foreground mt-1">Complete history of all inventory movements</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search barcode or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="harvest_intake">Harvest Intake</SelectItem>
            <SelectItem value="consume_for_packing">Consumed</SelectItem>
            <SelectItem value="packed_intake">Packed Intake</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="correction">Correction</SelectItem>
            <SelectItem value="waste">Waste</SelectItem>
          </SelectContent>
        </Select>
        <Select value={invTypeFilter} onValueChange={setInvTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inventory</SelectItem>
            <SelectItem value="harvested">Harvested</SelectItem>
            <SelectItem value="packed">Packed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Movement list */}
      <div className="space-y-2">
        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No movements found</p>
          </div>
        ) : (
          filteredMovements.map((m: any) => {
            const typeInfo = movementTypeLabels[m.movementType] || {
              label: m.movementType,
              color: "bg-gray-100 text-gray-800",
              icon: ArrowRight,
            };
            const Icon = typeInfo.icon;
            return (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeInfo.color} shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{typeInfo.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {m.inventoryType === "harvested" ? <Leaf className="h-3 w-3 mr-1" /> : <Package className="h-3 w-3 mr-1" />}
                          {m.inventoryType}
                        </Badge>
                      </div>
                      {m.itemBarcode && (
                        <p className="font-mono text-xs mt-0.5">{m.itemBarcode}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatDate(m.movementDate)}{m.movementTime ? ` ${m.movementTime}` : ""}</span>
                        {m.weight && <span>{parseFloat(String(m.weight)).toFixed(2)}kg</span>}
                        {m.quantity && <span>{m.quantity} units</span>}
                      </div>
                      {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing {filteredMovements.length} of {movementsQ.data?.total ?? 0} movements
      </p>
    </div>
  );
}
