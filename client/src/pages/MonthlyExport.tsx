import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileDown, AlertTriangle, Download } from "lucide-react";

interface RivuchitExportRow {
  deliveryId: number;
  deliveryDate: string;
  documentNumber: string;
  customerAccountNumber: string;
  customerName: string;
  customerFirstName: string;
  customerAddress: string;
  customerCity: string;
  rivuchitProductId: number;
  productNameHebrew: string;
  quantity: number;
  pricePerUnit: string;
  totalAmount: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateRivuchit(dateStr: string): string {
  // YYYY-MM-DD -> DD/MM/YY
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year.slice(2)}`;
}

function generateRivuchitCSV(rows: RivuchitExportRow[]): string {
  const headers = [
    "מס' פנימי", "סוג", "ת.העברה", "ת.הוצאה", "סוג מסמך", "מס' מסמך",
    "מס' קטלוגי", "תאור פריט", "כמות", 'מחיר י"ח', "סה\"כ סכום",
    "מס' לקוח", "שם משפחה/מש", "שם פרטי", "רחוב ומספר", "עיר",
    "ת.תשלום", "סוג תשלום", "בנק", "סניף", "חשבון בנק/כ.אשראי",
    'מטבע', 'שע"ח', 'סכום מט"ח', "קוד מיון", "מחיר ברוטו", 'ע.מ. / ת.ד.', "פרוייקט",
  ];

  const escapeCell = (val: string | number): string => {
    const s = String(val ?? "");
    // Wrap in quotes if contains comma, quote, or newline
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvRows = rows.map((row) => {
    const dateFormatted = formatDateRivuchit(row.deliveryDate);
    const cells: (string | number)[] = new Array(28).fill("");

    // Column mapping (0-indexed)
    cells[0] = row.customerAccountNumber;    // מס' פנימי
    cells[1] = "ת";                          // סוג
    cells[2] = dateFormatted;               // ת.העברה
    cells[3] = dateFormatted;               // ת.הוצאה
    cells[4] = "תמ";                         // סוג מסמך
    cells[5] = row.documentNumber;          // מס' מסמך
    cells[6] = row.rivuchitProductId;       // מס' קטלוגי
    cells[7] = row.productNameHebrew;       // תאור פריט
    cells[8] = row.quantity;                // כמות
    cells[9] = row.pricePerUnit;            // מחיר י"ח
    cells[10] = row.totalAmount;            // סה"כ סכום
    cells[11] = row.customerAccountNumber;  // מס' לקוח
    cells[12] = row.customerName;           // שם משפחה/מש
    cells[13] = row.customerFirstName;      // שם פרטי
    cells[14] = row.customerAddress;        // רחוב ומספר
    cells[15] = row.customerCity;           // עיר
    // 16-20 empty (payment info)
    cells[21] = 'ש"ח';                      // מטבע (index 21 = col 22)
    // 22-27 empty

    return cells.map(escapeCell).join(",");
  });

  const headerLine = headers.map(escapeCell).join(",");
  return "\uFEFF" + headerLine + "\r\n" + csvRows.join("\r\n");
}

export default function MonthlyExport() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [loadEnabled, setLoadEnabled] = useState(false);

  const { data: rows, isLoading, error } = trpc.productCatalog.monthlyExport.useQuery(
    { year: Number(selectedYear), month: Number(selectedMonth) },
    { enabled: loadEnabled }
  );

  const handleLoad = () => {
    setLoadEnabled(true);
  };

  const handleDownload = () => {
    if (!rows || rows.length === 0) return;
    const csv = generateRivuchitCSV(rows as RivuchitExportRow[]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rivuchit-export-${selectedMonth.padStart(2, "0")}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group rows by deliveryId for display
  const grouped = (rows ?? []).reduce<Record<number, RivuchitExportRow[]>>((acc, row) => {
    if (!acc[row.deliveryId]) acc[row.deliveryId] = [];
    acc[row.deliveryId].push(row as RivuchitExportRow);
    return acc;
  }, {});

  const totalAmount = (rows ?? []).reduce((sum, r) => sum + parseFloat((r as RivuchitExportRow).totalAmount), 0);

  // Warn: deliveries where customerAccountNumber is empty
  const missingAccount = Object.entries(grouped)
    .filter(([, items]) => !items[0].customerAccountNumber)
    .map(([id, items]) => ({ deliveryId: id, customerName: items[0].customerName }));

  const currentYear = now.getFullYear();
  const years = [currentYear, currentYear - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileDown className="h-6 w-6 text-primary" />
          Monthly Export — Rivuchit
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Export delivery data for accounting import</p>
      </div>

      {/* Controls */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setLoadEnabled(false); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setLoadEnabled(false); }}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLoad} disabled={isLoading}>
              {isLoading ? "Loading..." : "Load Data"}
            </Button>
            {rows && rows.length > 0 && (
              <Button variant="outline" className="gap-2" onClick={handleDownload}>
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {missingAccount.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-semibold">Missing Rivuchit account numbers</span> — the following customers have no account number set and will export with an empty customer ID:
            <ul className="mt-1 ml-4 list-disc text-sm">
              {missingAccount.map(({ deliveryId, customerName }) => (
                <li key={deliveryId}>Delivery #{deliveryId} — {customerName || "(no name)"}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {loadEnabled && !isLoading && rows !== undefined && (
        <>
          {rows.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                No dispatched deliveries found for {MONTH_NAMES[Number(selectedMonth) - 1]} {selectedYear}.
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>
                    Preview — {MONTH_NAMES[Number(selectedMonth) - 1]} {selectedYear}
                  </span>
                  <div className="flex items-center gap-3 text-sm font-normal text-muted-foreground">
                    <span>{rows.length} line{rows.length !== 1 ? "s" : ""}</span>
                    <span className="font-semibold text-green-700">Total: ₪{totalAmount.toFixed(2)}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-t bg-muted/30 text-xs text-muted-foreground">
                      <th className="py-2 px-3 text-left font-medium">Date</th>
                      <th className="py-2 px-3 text-left font-medium">Delivery #</th>
                      <th className="py-2 px-3 text-left font-medium">Customer</th>
                      <th className="py-2 px-3 text-left font-medium">Product (Hebrew)</th>
                      <th className="py-2 px-3 text-right font-medium">Qty</th>
                      <th className="py-2 px-3 text-right font-medium">Price (₪)</th>
                      <th className="py-2 px-3 text-right font-medium">Total (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([deliveryId, items]) => (
                      <>
                        <tr key={`group-${deliveryId}`} className="bg-muted/10 border-t">
                          <td colSpan={7} className="py-1.5 px-3">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {items[0].customerName}
                              {items[0].customerAccountNumber && (
                                <span className="ml-2 font-mono font-normal">#{items[0].customerAccountNumber}</span>
                              )}
                            </span>
                          </td>
                        </tr>
                        {items.map((row, idx) => (
                          <tr key={`${deliveryId}-${idx}`} className="border-b hover:bg-muted/10">
                            <td className="py-2 px-3 text-muted-foreground text-xs">{row.deliveryDate}</td>
                            <td className="py-2 px-3 font-mono text-xs">{row.documentNumber}</td>
                            <td className="py-2 px-3 text-xs text-muted-foreground">
                              {row.customerName}
                            </td>
                            <td className="py-2 px-3" dir="rtl">{row.productNameHebrew}</td>
                            <td className="py-2 px-3 text-right">{row.quantity}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{parseFloat(row.pricePerUnit).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-green-700">{parseFloat(row.totalAmount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold">
                      <td colSpan={6} className="py-2 px-3 text-right text-sm">Grand Total</td>
                      <td className="py-2 px-3 text-right text-green-700">₪{totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
