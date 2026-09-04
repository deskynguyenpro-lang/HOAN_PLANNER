import { LoadedGate } from "@/components/ui/LoadedGate";
import { PlanView } from "@/components/plan/PlanView";

export default function Page() {
  return (
    <LoadedGate>
      <PlanView />
    </LoadedGate>
  );
}
