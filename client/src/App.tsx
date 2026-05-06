import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import HarvestEntry from "./pages/HarvestEntry";
import HarvestRecords from "./pages/HarvestRecords";
import Employees from "./pages/Employees";
import Rooms from "./pages/Rooms";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import HarvestIntake from "./pages/HarvestIntake";
import Packing from "./pages/Packing";
import OutboundScan from "./pages/OutboundScan";
import InventoryList from "./pages/InventoryList";
import MovementLog from "./pages/MovementLog";
import WeighingStation from "./pages/WeighingStation";
import ColdRoom from "./pages/ColdRoom";
import Customers from "./pages/Customers";
import Delivery from "./pages/Delivery";
import MonthlyExport from "./pages/MonthlyExport";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        {/* Core */}
        <Route path="/" component={Home} />

        {/* Production */}
        <Route path="/weighing" component={WeighingStation} />
        <Route path="/cold-room" component={ColdRoom} />
        <Route path="/packing" component={Packing} />

        {/* Dispatch */}
        <Route path="/delivery" component={Delivery} />

        {/* Management */}
        <Route path="/customers" component={Customers} />
        <Route path="/employees" component={Employees} />
        <Route path="/rooms" component={Rooms} />
        <Route path="/settings" component={Settings} />
        <Route path="/users" component={UserManagement} />

        {/* Reports */}
        <Route path="/reports" component={Reports} />
        <Route path="/monthly-export" component={MonthlyExport} />

        {/* Harvest */}
        <Route path="/harvest/new" component={HarvestEntry} />
        <Route path="/harvest/records" component={HarvestRecords} />

        {/* Inventory — keep legacy routes for backwards compatibility */}
        <Route path="/inventory/intake" component={HarvestIntake} />
        <Route path="/inventory/packing" component={Packing} />
        <Route path="/inventory/outbound" component={OutboundScan} />
        <Route path="/inventory/list" component={InventoryList} />
        <Route path="/inventory/movements" component={MovementLog} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
