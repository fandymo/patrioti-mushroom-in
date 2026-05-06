import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Edit, Package, Tag, Clock, Ruler, BookOpen } from "lucide-react";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  white_basket: "White Basket",
  brown_basket: "Brown Basket",
  mix: "Mix",
  white_filling: "White Filling",
  brown_filling: "Brown Filling",
  white_small: "White Small",
  brown_small: "Brown Small",
};

type CatalogEditForm = {
  nameHebrew: string;
  nameEnglish: string;
  productType: string;
  unitDescription: string;
  pricePerUnit: string;
  isSpecialCustomer: boolean;
  status: "active" | "inactive";
};

const EMPTY_CATALOG_FORM: CatalogEditForm = {
  nameHebrew: "",
  nameEnglish: "",
  productType: "white_basket",
  unitDescription: "",
  pricePerUnit: "0",
  isSpecialCustomer: false,
  status: "active",
};

function MasterDataSection({
  title,
  icon: Icon,
  items,
  isLoading,
  isAdmin,
  onAdd,
  onEdit,
  onToggle,
  extraFields,
}: {
  title: string;
  icon: any;
  items: any[] | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onToggle: (item: any) => void;
  extraFields?: (item: any) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h3>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : !items?.length ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No items</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{item.name}</span>
                <Badge variant="outline" className={`text-xs ${item.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {item.status === "active" ? "Active" : "Inactive"}
                </Badge>
                {extraFields && extraFields(item)}
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => onToggle(item)}>
                    {item.status === "active" ? "Disable" : "Enable"}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  // Packaging Types
  const { data: packagingList, isLoading: loadingPT } = trpc.packagingTypes.list.useQuery();
  const createPT = trpc.packagingTypes.create.useMutation({ onSuccess: () => { utils.packagingTypes.list.invalidate(); setDialog(null); toast.success("Saved"); } });
  const updatePT = trpc.packagingTypes.update.useMutation({ onSuccess: () => { utils.packagingTypes.list.invalidate(); setDialog(null); toast.success("Updated"); } });

  // Categories
  const { data: categoriesList, isLoading: loadingCat } = trpc.categories.list.useQuery();
  const createCat = trpc.categories.create.useMutation({ onSuccess: () => { utils.categories.list.invalidate(); setDialog(null); toast.success("Saved"); } });
  const updateCat = trpc.categories.update.useMutation({ onSuccess: () => { utils.categories.list.invalidate(); setDialog(null); toast.success("Updated"); } });

  // Shifts
  const { data: shiftsList, isLoading: loadingShifts } = trpc.shifts.list.useQuery();
  const createShift = trpc.shifts.create.useMutation({ onSuccess: () => { utils.shifts.list.invalidate(); setDialog(null); toast.success("Saved"); } });
  const updateShift = trpc.shifts.update.useMutation({ onSuccess: () => { utils.shifts.list.invalidate(); setDialog(null); toast.success("Updated"); } });

  // Sizes
  const { data: sizesList, isLoading: loadingSizes } = trpc.sizes.list.useQuery();
  const createSz = trpc.sizes.create.useMutation({ onSuccess: () => { utils.sizes.list.invalidate(); setDialog(null); toast.success("Saved"); } });
  const updateSz = trpc.sizes.update.useMutation({ onSuccess: () => { utils.sizes.list.invalidate(); setDialog(null); toast.success("Updated"); } });

  // Product Catalog
  const { data: catalogList, isLoading: loadingCatalog } = trpc.productCatalog.list.useQuery();
  const updateCatalog = trpc.productCatalog.update.useMutation({
    onSuccess: () => { utils.productCatalog.list.invalidate(); setCatalogDialog(null); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });

  const [catalogDialog, setCatalogDialog] = useState<{ id: number } | null>(null);
  const [catalogForm, setCatalogForm] = useState<CatalogEditForm>(EMPTY_CATALOG_FORM);

  const openCatalogEdit = (item: any) => {
    setCatalogForm({
      nameHebrew: item.nameHebrew ?? "",
      nameEnglish: item.nameEnglish ?? "",
      productType: item.productType ?? "white_basket",
      unitDescription: item.unitDescription ?? "",
      pricePerUnit: item.pricePerUnit != null ? String(item.pricePerUnit) : "0",
      isSpecialCustomer: !!item.isSpecialCustomer,
      status: item.status ?? "active",
    });
    setCatalogDialog({ id: item.id });
  };

  const handleCatalogSave = async () => {
    if (!catalogForm.nameHebrew.trim()) { toast.error("Hebrew name is required"); return; }
    if (!catalogDialog) return;
    await updateCatalog.mutateAsync({
      id: catalogDialog.id,
      nameHebrew: catalogForm.nameHebrew,
      nameEnglish: catalogForm.nameEnglish || undefined,
      productType: catalogForm.productType as any,
      unitDescription: catalogForm.unitDescription,
      pricePerUnit: catalogForm.pricePerUnit,
      isSpecialCustomer: catalogForm.isSpecialCustomer,
      status: catalogForm.status,
    });
  };

  const [dialog, setDialog] = useState<{ type: string; editId?: number } | null>(null);
  const [formName, setFormName] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  const openAdd = (type: string) => {
    setFormName(""); setFormStartTime(""); setFormEndTime("");
    setDialog({ type });
  };

  const openEdit = (type: string, item: any) => {
    setFormName(item.name);
    setFormStartTime(item.startTime || "");
    setFormEndTime(item.endTime || "");
    setDialog({ type, editId: item.id });
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Name is required"); return; }
    const d = dialog!;
    if (d.type === "packaging") {
      if (d.editId) await updatePT.mutateAsync({ id: d.editId, name: formName });
      else await createPT.mutateAsync({ name: formName });
    } else if (d.type === "category") {
      if (d.editId) await updateCat.mutateAsync({ id: d.editId, name: formName });
      else await createCat.mutateAsync({ name: formName });
    } else if (d.type === "shift") {
      if (d.editId) await updateShift.mutateAsync({ id: d.editId, name: formName, startTime: formStartTime, endTime: formEndTime });
      else await createShift.mutateAsync({ name: formName, startTime: formStartTime, endTime: formEndTime });
    } else if (d.type === "size") {
      if (d.editId) await updateSz.mutateAsync({ id: d.editId, name: formName });
      else await createSz.mutateAsync({ name: formName });
    }
  };

  const togglePT = (item: any) => updatePT.mutate({ id: item.id, status: item.status === "active" ? "inactive" : "active" });
  const toggleCat = (item: any) => updateCat.mutate({ id: item.id, status: item.status === "active" ? "inactive" : "active" });
  const toggleShift = (item: any) => updateShift.mutate({ id: item.id, status: item.status === "active" ? "inactive" : "active" });
  const toggleSz = (item: any) => updateSz.mutate({ id: item.id, status: item.status === "active" ? "inactive" : "active" });

  const dialogTitle = dialog?.type === "packaging" ? "Packaging Type" : dialog?.type === "category" ? "Mushroom Type" : dialog?.type === "size" ? "Size" : "Shift";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage master data</p>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="catalog" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Product Catalog</TabsTrigger>
          <TabsTrigger value="packaging" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Packaging</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5"><Tag className="w-3.5 h-3.5" /> Mushroom Types</TabsTrigger>
          <TabsTrigger value="sizes" className="gap-1.5"><Ruler className="w-3.5 h-3.5" /> Sizes</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Rivuchit Product Catalog</h3>
                <span className="text-xs text-muted-foreground ml-1">— maps factory products to accounting IDs 1–9</span>
              </div>
              {loadingCatalog ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : !catalogList?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No catalog items. Seed the product_catalog table first.</div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 px-2 font-medium">#</th>
                      <th className="py-2 px-2 font-medium">Rivuchit ID</th>
                      <th className="py-2 px-2 font-medium">Hebrew Name</th>
                      <th className="py-2 px-2 font-medium">English Name</th>
                      <th className="py-2 px-2 font-medium">Product Type</th>
                      <th className="py-2 px-2 font-medium">Unit</th>
                      <th className="py-2 px-2 font-medium">Price (₪)</th>
                      <th className="py-2 px-2 font-medium">Special</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogList.map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b hover:bg-muted/20">
                        <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-2 font-mono font-semibold text-primary">{item.rivuchitProductId}</td>
                        <td className="py-2 px-2 font-medium" dir="rtl">{item.nameHebrew}</td>
                        <td className="py-2 px-2 text-muted-foreground">{item.nameEnglish || "—"}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">{item.unitDescription}</td>
                        <td className="py-2 px-2 font-semibold text-green-600">₪{parseFloat(item.pricePerUnit).toFixed(2)}</td>
                        <td className="py-2 px-2">
                          {item.isSpecialCustomer ? (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Special</Badge>
                          ) : null}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className={`text-xs ${item.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2">
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatalogEdit(item)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packaging" className="mt-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <MasterDataSection
                title="Packaging Types"
                icon={Package}
                items={packagingList}
                isLoading={loadingPT}
                isAdmin={isAdmin}
                onAdd={() => openAdd("packaging")}
                onEdit={(item) => openEdit("packaging", item)}
                onToggle={togglePT}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <MasterDataSection
                title="Mushroom Types"
                icon={Tag}
                items={categoriesList}
                isLoading={loadingCat}
                isAdmin={isAdmin}
                onAdd={() => openAdd("category")}
                onEdit={(item) => openEdit("category", item)}
                onToggle={toggleCat}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizes" className="mt-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <MasterDataSection
                title="Sizes"
                icon={Ruler}
                items={sizesList}
                isLoading={loadingSizes}
                isAdmin={isAdmin}
                onAdd={() => openAdd("size")}
                onEdit={(item) => openEdit("size", item)}
                onToggle={toggleSz}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <MasterDataSection
                title="Shifts"
                icon={Clock}
                items={shiftsList}
                isLoading={loadingShifts}
                isAdmin={isAdmin}
                onAdd={() => openAdd("shift")}
                onEdit={(item) => openEdit("shift", item)}
                onToggle={toggleShift}
                extraFields={(item) => (
                  <>
                    {item.startTime && <span className="text-xs text-muted-foreground">{item.startTime} - {item.endTime}</span>}
                  </>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Catalog Edit Dialog */}
      <Dialog open={!!catalogDialog} onOpenChange={open => { if (!open) setCatalogDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Catalog Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Hebrew Name (ריבוצ׳יט) *</Label>
              <Input
                dir="rtl"
                value={catalogForm.nameHebrew}
                onChange={e => setCatalogForm(p => ({ ...p, nameHebrew: e.target.value }))}
                placeholder="שם בעברית..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>English Name</Label>
              <Input
                value={catalogForm.nameEnglish}
                onChange={e => setCatalogForm(p => ({ ...p, nameEnglish: e.target.value }))}
                placeholder="English name..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Product Type</Label>
              <Select value={catalogForm.productType} onValueChange={v => setCatalogForm(p => ({ ...p, productType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit Description</Label>
              <Input
                value={catalogForm.unitDescription}
                onChange={e => setCatalogForm(p => ({ ...p, unitDescription: e.target.value }))}
                placeholder="e.g. carton, kg..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price per Unit (₪)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={catalogForm.pricePerUnit}
                onChange={e => setCatalogForm(p => ({ ...p, pricePerUnit: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isSpecial"
                checked={catalogForm.isSpecialCustomer}
                onCheckedChange={v => setCatalogForm(p => ({ ...p, isSpecialCustomer: !!v }))}
              />
              <Label htmlFor="isSpecial" className="cursor-pointer">Special customer pricing</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={catalogForm.status} onValueChange={v => setCatalogForm(p => ({ ...p, status: v as "active" | "inactive" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogDialog(null)}>Cancel</Button>
            <Button onClick={handleCatalogSave} disabled={updateCatalog.isPending}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog?.editId ? `Edit ${dialogTitle}` : `Add ${dialogTitle}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Name..." />
            </div>
            {dialog?.type === "shift" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSave}>{dialog?.editId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
