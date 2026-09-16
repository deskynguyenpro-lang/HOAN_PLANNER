import { Suspense } from "react";
import { LoadedGate } from "@/components/ui/LoadedGate";
import { PlanView } from "@/components/plan/PlanView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoadedGate>
        <PlanView />
      </LoadedGate>
    </Suspense>
  );
}
