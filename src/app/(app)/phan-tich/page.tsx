import { Suspense } from "react";
import { LoadedGate } from "@/components/ui/LoadedGate";
import { AnalysisTabs } from "@/components/analysis/AnalysisTabs";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoadedGate>
        <AnalysisTabs />
      </LoadedGate>
    </Suspense>
  );
}
