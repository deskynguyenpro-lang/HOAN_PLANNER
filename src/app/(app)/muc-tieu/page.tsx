import { LoadedGate } from "@/components/ui/LoadedGate";
import { ObjectivesView } from "@/components/objectives/ObjectivesView";

export default function Page() {
  return (
    <LoadedGate>
      <ObjectivesView />
    </LoadedGate>
  );
}
