import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/formatDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Warehouse, Package, Leaf, Search } from "lucide-react";

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  partially_consumed: "bg-yellow-100 text-yellow-800",
  fully_consumed: "bg-gray-100 text-gray-600",
  in_packing: "bg-blue-100 text-blue-800",
  deducted: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-700",
  damaged: "bg-red-100 text-red-700",
  shipped: "bg-purple-100 text-purple-800",
};

export default function InventoryList() {
  const [tab, setTab] = useState("harvested");
  const [harvestedSearch, setHarvestedSearch] = useState("");
  const [packedSearch, setPackedSearch] = useState("");
  const [harvestedStatus, setHarvestedStatus] = useState("all");
  const [packedStatus, setPackedStatus] = useState("all");

  const summaryQ = trpc.inventory.summary.useQuery();
  const harvestedQ = trpc.inventory.harvestedList.useQuery({
    status: harvestedStatus !== "all" ? harvestedStatus : undefined,
    limit: 200,
  });
  const packedQ = trpc.inventory.packedList.useQuery({
    status: packedStatus !== "all" ? packedStatus : undefined,
    limit: 200,
  });

  const roomsQ = trpc.rooms.list.useQuery();
  const employeesQ = trpc.employees.list.useQuery();
  const categoriesQ = trpc.categories.list.useQuery();
  const sizesQ = trpc.sizes.list.useQuery();
  const packagingQ = trpc.packagingTypes.list.useQuery();

  const roomMap = useMemo(() => new Map((roomsQ.data || []).map((r: any) => [r.id, r.name])), [roomsQ.data]);
  const empMap = useMemo(() => new Map((employeesQ.data || []).map((e: any) => [e.id, e.name])), [employeesQ.data]);
  const catMap = useMemo(() => new Map((categoriesQ.data || []).map((c: any) => [c.id, c.name])), [categoriesQ.data]);
  const sizeMap = useMemo(() => new Map((sizesQ.data || []).map((s: any) => [s.id, s.name])), [sizesQ.data]);
  const pkgMap = useMemo(() => new Map((packagingQ.data || []).map((p: any) => [p.id, p.name])), [packagingQ.data]);

  const filteredHarvested = useMemo(() => {
    const items = harvestedQ.data?.items || [];
    if (!harvestedSearch) return items;
    const q = harvestedSearch.toLowerCase();
    return items.filter((i: any) =>
      i.barcode?.toLowerCase().includes(q) ||
      i.batchNumber?.toLowerCase().includes(q) ||
      empMap.get(i.employeeId)?.toLowerCase().includes(q) ||
      roomMap.get(i.roomId)?.toLowerCase().includes(q)
    );
  }, [harvestedQ.data, harvestedSearch, empMap, roomMap]);

  const filteredPacked = useMemo(() => {
    const items = packedQ.data?.items || [];
    if (!packedSearch) return items;
    const q = packedSearch.toLowerCase();
    return items.filter((i: any) =>
      i.barcode?.toLowerCase().includes(q) ||
      i.batchNumber?.toLowerCase().includes(q) ||
      catMap.get(i.categoryId)?.toLowerCase().includes(q) ||
      pkgMap.get(i.packagingTypeId)?.toLowerCase().includes(q)
    );
  }, [packedQ.data, packedSearch, catMap, pkgMap]);

  const summary = summaryQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-primary" />
          Inventory
        </h1>
        <p className="text-muted-foreground mt-1">View all harvested and packed inventory</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{summary?.harvestedAvailable ?? 0}</p>
            <p className="text-xs text-muted-foreground">Harvested Items</p>
            <p className="text-sm font-medium">{parseFloat(summary?.harvestedWeight ?? "0").toFixed(1)}kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary?.packedAvailable ?? 0}</p>
            <p className="text-xs text-muted-foreground">Packed Items</p>
            <p className="text-sm font-medium">{parseFloat(summary?.packedWeight ?? "0").toFixed(1)}kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{summary?.packedShipped ?? 0}</p>
            <p className="text-xs text-muted-foreground">Shipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {(summary?.harvestedAvailable ?? 0) + (summary?.packedAvailable ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total In Stock</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="harvested" className="flex items-center gap-1">
            <Leaf className="h-4 w-4" /> Harvested
          </TabsTrigger>
          <TabsTrigger value="packed" className="flex items-center gap-1">
            <Package className="h-4 w-4" /> Packed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="harvested" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search barcode, batch, employee, room..."
                value={harvestedSearch}
                onChange={(e) => setHarvestedSearch(e.target.value)}
                className="pl-9" />
            </div>
            <Select value={harvestedStatus} onValueChange={setHarvestedStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="partially_consumed">Partial</SelectItem>
                <SelectItem value="fully_consumed">Consumed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredHarvested.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No harvested inventory found</p>
            ) : (
              filteredHarvested.map((item: any) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold">{item.barcode}</p>
                          <Badge className={`text-xs ${statusColors[item.status] || ""}`}>
                            {item.status?.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          <span>Room: {roomMap.get(item.roomId) || "-"}</span>
                          <span>Employee: {empMap.get(item.employeeId) || "-"}</span>
                          <span>Type: {catMap.get(item.categoryId) || "-"}</span>
                          <span>Size: {sizeMap.get(item.sizeId) || "-"}</span>
                          <span>Wave: {item.harvestWave}</span>
                          <span>Date: {formatDate(item.harvestDate)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{parseFloat(String(item.remainingWeight)).toFixed(2)}kg</p>
                        <p className="text-xs text-muted-foreground">
                          of {parseFloat(String(item.originalWeight)).toFixed(2)}kg
                        </p>
                        <p className="text-xs text-muted-foreground">{item.boxCount} boxes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="packed" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search barcode, batch, type..."
                value={packedSearch}
                onChange={(e) => setPackedSearch(e.target.value)}
                className="pl-9" />
            </div>
            <Select value={packedStatus} onValueChange={setPackedStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredPacked.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No packed inventory found</p>
            ) : (
              filteredPacked.map((item: any) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold">{item.barcode}</p>
                          <Badge className={`text-xs ${statusColors[item.status] || ""}`}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          <span>Type: {catMap.get(item.categoryId) || "-"}</span>
                          <span>Size: {sizeMap.get(item.sizeId) || "-"}</span>
                          <span>Packaging: {pkgMap.get(item.packagingTypeId) || "-"}</span>
                          <span>Wave: {item.harvestWave}</span>
                          <span>Packed: {formatDate(item.packingDate)}</span>
                          {item.expiryDate && <span>Expiry: {formatDate(item.expiryDate)}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{parseFloat(String(item.packedWeight)).toFixed(2)}kg</p>
                        <p className="text-xs text-muted-foreground">{item.unitCount} units</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
