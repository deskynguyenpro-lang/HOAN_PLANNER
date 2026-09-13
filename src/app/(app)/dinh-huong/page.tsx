import { Suspense } from "react";
import { LoadedGate } from "@/components/ui/LoadedGate";
import { IdentityView } from "@/components/identity/IdentityView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoadedGate>
        <IdentityView />
      </LoadedGate>
    </Suspense>
  );
}
