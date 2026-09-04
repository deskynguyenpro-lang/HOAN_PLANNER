"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/data/store";
import { objectiveProgress } from "@/lib/domain/stats";
import { todayKey } from "@/lib/domain/dates";
import type { Objective } from "@/lib/domain/types";

export function CheckinForm({
  objective,
  onClose,
}: {
  objective: Objective;
  onClose: () => void;
}) {
  const { objectives, setObjectives } = useStore();
  const { toast } = useToast();
  const [date, setDate] = useState(todayKey());
  const [value, setValue] = useState(String(objectiveProgress(objective).current));

  const submit = () => {
    const entry = { date, value: Number(value) || 0 };
    setObjectives(
      objectives.map((o) =>
        o.id === objective.id
          ? {
              ...o,
              checkins: [
                ...(o.checkins || []).filter((c) => c.date !== entry.date),
                entry,
              ].sort((a, b) => (a.date < b.date ? -1 : 1)),
            }
          : o,
      ),
    );
    toast("Đã cập nhật tiến độ.");
    onClose();
  };

  return (
    <Sheet
      title="Cập nhật tiến độ"
      subtitle={objective.name}
      onClose={onClose}
      dirty
      footer={
        <>
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
            Huỷ
          </button>
          <button onClick={submit} className="btn-primary flex-1 py-2.5 text-sm">
            Lưu tiến độ
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Ngày">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={`Giá trị hiện tại${objective.unit ? ` (${objective.unit})` : ""}`}>
          <TextInput
            type="number"
            step="0.1"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}
