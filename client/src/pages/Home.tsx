import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Weight, Package, Users, AlertCircle, TrendingUp, BarChart3, Thermometer } from "lucide-react";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

function getDateRange(period: string) {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: string;
  if (period === "today") {
    start = end;
  } else if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = d.toISOString().split("T")[0];
  } else {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    start = d.toISOString().split("T")[0];
  }
  return { startDate: start, endDate: end };
}

const COLORS = ["#2d8a4e", "#e6a817", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── Cold Room Status ─────────────────────────────────────────────────────────

type ColdRoomItem = { label: string; value: number | string; unit?: string };

function ColdRoomCard({ label, value, unit }: ColdRoomItem) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p className="text-lg font-bold leading-none">
        {value}
        {unit && <span className="text-xs font-normal ml-0.5 text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function ColdRoomStatus() {
  const { data, isLoading } = (trpc as any).inventory?.coldRoomSummary?.useQuery
    ? (trpc as any).inventory.coldRoomSummary.useQuery()
    : { data: null, isLoading: false };

  const rawTypes = [
    "White Basket",
    "Brown Basket",
    "White Small",
    "Brown Small",
    "White Filling",
    "Brown Filling",
  ];
  const finishedTypes = ["White Basket", "Brown Basket", "Mix", "Filling"];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-blue-500" />
          Cold Room Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Raw stock */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">Raw Stock (kg)</p>
          {isLoading ? (
            <div className="flex gap-4 flex-wrap">
              {rawTypes.map((t) => (
                <Skeleton key={t} className="h-10 w-24" />
              ))}
            </div>
          ) : (
            <div className="flex gap-6 flex-wrap">
              {rawTypes.map((type) => {
                const val = data?.raw?.[type] ?? 0;
                return (
                  <div
                    key={type}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 min-w-[110px]"
                  >
                    <p className="text-[11px] text-blue-700 leading-tight">{type}</p>
                    <p className="text-base font-bold text-blue-900 leading-none">
                      {typeof val === "number" ? val.toFixed(1) : val}
                      <span className="text-xs font-normal ml-0.5 text-blue-600">kg</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Finished stock */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">Finished Stock (cartons)</p>
          {isLoading ? (
            <div className="flex gap-4 flex-wrap">
              {finishedTypes.map((t) => (
                <Skeleton key={t} className="h-10 w-24" />
              ))}
            </div>
          ) : (
            <div className="flex gap-6 flex-wrap">
              {finishedTypes.map((type) => {
                const val = data?.finished?.[type] ?? 0;
                return (
                  <div
                    key={type}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-green-50 border border-green-100 min-w-[110px]"
                  >
                    <p className="text-[11px] text-green-700 leading-tight">{type}</p>
                    <p className="text-base font-bold text-green-900 leading-none">
                      {typeof val === "number" ? val : val}
                      <span className="text-xs font-normal ml-0.5 text-green-600">ctn</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Yield Performance ────────────────────────────────────────────────────────

type YieldRow = {
  productType: string;
  harvestedKg: number;
  packedKg: number;
  lossKg: number;
  yieldPct: number;
};

function yieldColor(pct: number): string {
  if (pct >= 90) return "text-green-700 font-bold";
  if (pct >= 75) return "text-amber-600 font-bold";
  return "text-red-600 font-bold";
}

function yieldBadgeBg(pct: number): string {
  if (pct >= 90) return "bg-green-100 text-green-800";
  if (pct >= 75) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function YieldPerformance({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data, isLoading } = (trpc as any).inventory?.yieldSummary?.useQuery
    ? (trpc as any).inventory.yieldSummary.useQuery({ startDate, endDate })
    : { data: null, isLoading: false };

  const rows: YieldRow[] = data?.rows ?? [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Yield Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No yield data for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="pb-2 pr-4">Product Type</th>
                  <th className="pb-2 pr-4 text-right">Harvested</th>
                  <th className="pb-2 pr-4 text-right">Packed</th>
                  <th className="pb-2 pr-4 text-right">Loss</th>
                  <th className="pb-2 text-right">Yield %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productType} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 font-medium">{row.productType}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{row.harvestedKg.toFixed(1)} kg</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{row.packedKg.toFixed(1)} kg</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{row.lossKg.toFixed(1)} kg</td>
                    <td className="py-2 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${yieldBadgeBg(row.yieldPct)}`}>
                        {row.yieldPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Home() {
  const [period, setPeriod] = useState("month");
  const dateRange = useMemo(() => getDateRange(period), [period]);

  const { data, isLoading } = trpc.reports.dashboard.useQuery(dateRange);

  const totalWeight = parseFloat(data?.totals?.totalWeight ?? "0");
  const totalBoxes = data?.totals?.totalBoxes ?? 0;
  const recordCount = data?.totals?.recordCount ?? 0;
  const pendingApproval = data?.pendingApproval ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of harvest activity</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cold Room Status — prepended above summary cards */}
      <ColdRoomStatus />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Weight className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Weight</p>
                <p className="text-xl font-bold text-green-800">{totalWeight.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Boxes</p>
                <p className="text-xl font-bold text-amber-800">{totalBoxes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Records</p>
                <p className="text-xl font-bold text-blue-800">{recordCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-xl font-bold text-red-800">{pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yield Performance — after summary cards, before charts */}
      <YieldPerformance startDate={dateRange.startDate} endDate={dateRange.endDate} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Daily Harvest Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.dailyTrend && data.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.dailyTrend.map(d => ({ ...d, totalWeight: parseFloat(String(d.totalWeight)) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="totalWeight" stroke="#2d8a4e" strokeWidth={2} dot={{ fill: "#2d8a4e", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Employees */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top 5 Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topEmployees && data.topEmployees.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topEmployees.map(e => ({ ...e, totalWeight: parseFloat(String(e.totalWeight)) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="employeeName" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, "Weight"]} />
                  <Bar dataKey="totalWeight" fill="#2d8a4e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Packaging Distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution by Packaging</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.byPackaging && data.byPackaging.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.byPackaging.map(p => ({ name: p.packagingName, value: parseFloat(String(p.totalWeight)) }))}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.byPackaging.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} kg`, "Weight"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.byCategory && data.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.byCategory.map(c => ({ name: c.categoryName, value: parseFloat(String(c.totalWeight)) }))}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} kg`, "Weight"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Rooms */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top 5 Rooms by Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topRooms && data.topRooms.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topRooms.map(r => ({ ...r, totalWeight: parseFloat(String(r.totalWeight)) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="roomName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, "Weight"]} />
                  <Bar dataKey="totalWeight" fill="#e6a817" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
