import { Suspense } from "react";
import { LoadedGate } from "@/components/ui/LoadedGate";
import { TodayView } from "@/components/today/TodayView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoadedGate>
        <TodayView />
      </LoadedGate>
    </Suspense>
  );
}
