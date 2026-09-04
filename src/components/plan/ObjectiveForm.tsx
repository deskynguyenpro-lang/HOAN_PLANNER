"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/data/store";
import type { Objective } from "@/lib/domain/types";

export function ObjectiveForm({
  objective,
  onClose,
}: {
  objective: Objective | null;
  onClose: () => void;
}) {
  const { objectives, setObjectives } = useStore();
  const { toast } = useToast();
  const editing = !!objective;

  const [name, setName] = useState(objective?.name ?? "");
  const [unit, setUnit] = useState(objective?.unit ?? "");
  const [startValue, setStartValue] = useState(String(objective?.startValue ?? 0));
  const [targetValue, setTargetValue] = useState(String(objective?.targetValue ?? 0));
  const [deadline, setDeadline] = useState(objective?.deadline ?? "");

  const dirty =
    name !== (objective?.name ?? "") ||
    unit !== (objective?.unit ?? "") ||
    startValue !== String(objective?.startValue ?? 0) ||
    targetValue !== String(objective?.targetValue ?? 0) ||
    deadline !== (objective?.deadline ?? "");

  const submit = () => {
    if (!name.trim()) {
      toast("Cần đặt tên cho mục tiêu.", "error");
      return;
    }
    const next: Objective = {
      id: objective?.id ?? `o_${Date.now()}`,
      name: name.trim(),
      unit: unit.trim(),
      startValue: Number(startValue) || 0,
      targetValue: Number(targetValue) || 0,
      deadline,
      checkins: objective?.checkins ?? [],
      archived: false,
    };
    setObjectives(
      editing
        ? objectives.map((o) => (o.id === next.id ? next : o))
        : [...objectives, next],
    );
    toast(editing ? "Đã lưu thay đổi." : "Đã tạo mục tiêu lớn.");
    onClose();
  };

  return (
    <Sheet
      title={editing ? "Sửa mục tiêu lớn" : "Mục tiêu lớn mới"}
      subtitle="Đích để hướng tới — ví dụ IELTS 6.5, giảm 5kg, xuất bản 1 paper."
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
            Huỷ
          </button>
          <button onClick={submit} className="btn-primary flex-1 py-2.5 text-sm">
            {editing ? "Lưu thay đổi" : "Tạo mục tiêu"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên mục tiêu">
          <TextInput
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: IELTS 6.5"
          />
        </Field>
        <Field label="Đơn vị đo" hint="Để trống nếu chỉ theo dõi hoàn thành / không hoàn thành.">
          <TextInput
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="VD: điểm, kg, km, chương"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hiện tại">
            <TextInput
              type="number"
              step="0.1"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
            />
          </Field>
          <Field label="Mục tiêu">
            <TextInput
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Hạn hoàn thành (tuỳ chọn)">
          <TextInput
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}
