import { Suspense } from "react";
import { LoadedGate } from "@/components/ui/LoadedGate";
import { CalendarView } from "@/components/calendar/CalendarView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoadedGate>
        <CalendarView />
      </LoadedGate>
    </Suspense>
  );
}
