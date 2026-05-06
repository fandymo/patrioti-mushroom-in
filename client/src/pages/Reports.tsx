import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { Download, Calendar, Users, DoorOpen, Clock } from "lucide-react";

function getDefaultRange() {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { startDate: start.toISOString().split("T")[0], endDate: end };
}

function exportToCSV(data: any[], headers: { key: string; label: string }[], filename: string) {
  const BOM = "\uFEFF";
  const headerRow = headers.map(h => h.label).join(",");
  const rows = data.map(row => headers.map(h => {
    const val = String(row[h.key] ?? "");
    return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(","));
  const csv = BOM + [headerRow, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const defaults = useMemo(() => getDefaultRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);

  const range = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  const { data: dailySummary, isLoading: loadingDaily } = trpc.reports.dailySummary.useQuery({ date: dailyDate });
  const { data: byEmployee, isLoading: loadingEmp } = trpc.reports.byEmployee.useQuery(range);
  const { data: byRoom, isLoading: loadingRoom } = trpc.reports.byRoom.useQuery(range);
  const { data: byShift, isLoading: loadingShift } = trpc.reports.byShift.useQuery(range);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Harvest data analysis</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="daily" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Daily Summary</TabsTrigger>
          <TabsTrigger value="employee" className="gap-1.5"><Users className="w-3.5 h-3.5" /> By Employee</TabsTrigger>
          <TabsTrigger value="room" className="gap-1.5"><DoorOpen className="w-3.5 h-3.5" /> By Room</TabsTrigger>
          <TabsTrigger value="shift" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> By Shift</TabsTrigger>
        </TabsList>

        {/* Daily Summary */}
        <TabsContent value="daily" className="mt-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="h-9 w-[180px]" />
            </div>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              {loadingDaily ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : !dailySummary ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data for this date</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Weight</p>
                    <p className="text-2xl font-bold text-green-800">{parseFloat(String(dailySummary.totalWeight ?? 0)).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Boxes</p>
                    <p className="text-2xl font-bold text-amber-800">{dailySummary.totalBoxes ?? 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Records</p>
                    <p className="text-2xl font-bold text-blue-800">{dailySummary.recordCount ?? 0}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Employees</p>
                    <p className="text-2xl font-bold text-purple-800">{dailySummary.employeeCount ?? 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Employee */}
        <TabsContent value="employee" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            {byEmployee && byEmployee.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportToCSV(
                byEmployee.map(r => ({ name: r.employeeName, weight: parseFloat(String(r.totalWeight)).toFixed(1), boxes: r.totalBoxes, records: r.recordCount, avg: parseFloat(String(r.avgWeightPerBox)).toFixed(3) })),
                [{ key: "name", label: "Employee" }, { key: "weight", label: "Weight (kg)" }, { key: "boxes", label: "Boxes" }, { key: "records", label: "Records" }, { key: "avg", label: "Avg per Box" }],
                `employees_report_${startDate}_${endDate}`
              )}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {loadingEmp ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : !byEmployee?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Boxes</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Avg per Box</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byEmployee.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.employeeName}</TableCell>
                          <TableCell>{parseFloat(String(row.totalWeight)).toFixed(1)}</TableCell>
                          <TableCell>{row.totalBoxes}</TableCell>
                          <TableCell>{row.recordCount}</TableCell>
                          <TableCell>{parseFloat(String(row.avgWeightPerBox)).toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Room */}
        <TabsContent value="room" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            {byRoom && byRoom.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportToCSV(
                byRoom.map(r => ({ name: r.roomName, weight: parseFloat(String(r.totalWeight)).toFixed(1), boxes: r.totalBoxes, records: r.recordCount, employees: r.employeeCount })),
                [{ key: "name", label: "Room" }, { key: "weight", label: "Weight (kg)" }, { key: "boxes", label: "Boxes" }, { key: "records", label: "Records" }, { key: "employees", label: "Employees" }],
                `rooms_report_${startDate}_${endDate}`
              )}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {loadingRoom ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : !byRoom?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Room</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Boxes</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Employees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byRoom.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.roomName}</TableCell>
                          <TableCell>{parseFloat(String(row.totalWeight)).toFixed(1)}</TableCell>
                          <TableCell>{row.totalBoxes}</TableCell>
                          <TableCell>{row.recordCount}</TableCell>
                          <TableCell>{row.employeeCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Shift */}
        <TabsContent value="shift" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            {byShift && byShift.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportToCSV(
                byShift.map(r => ({ name: r.shiftName, weight: parseFloat(String(r.totalWeight)).toFixed(1), boxes: r.totalBoxes, records: r.recordCount, employees: r.employeeCount })),
                [{ key: "name", label: "Shift" }, { key: "weight", label: "Weight (kg)" }, { key: "boxes", label: "Boxes" }, { key: "records", label: "Records" }, { key: "employees", label: "Employees" }],
                `shifts_report_${startDate}_${endDate}`
              )}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {loadingShift ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : !byShift?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shift</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Boxes</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Employees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byShift.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.shiftName}</TableCell>
                          <TableCell>{parseFloat(String(row.totalWeight)).toFixed(1)}</TableCell>
                          <TableCell>{row.totalBoxes}</TableCell>
                          <TableCell>{row.recordCount}</TableCell>
                          <TableCell>{row.employeeCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
