import { LoadedGate } from "@/components/ui/LoadedGate";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function Page() {
  return (
    <LoadedGate>
      <DashboardView />
    </LoadedGate>
  );
}
