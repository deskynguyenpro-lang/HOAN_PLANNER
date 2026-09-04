"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Field, SelectInput, TextInput, ChipSelect } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { pillarOf } from "@/lib/domain/pillars";
import { fmtHours, timeStrToDec } from "@/lib/domain/dates";
import type { Goal } from "@/lib/domain/types";

export function AddBlockModal({
  goals,
  defaultTime,
  onAdd,
  onClose,
}: {
  goals: Goal[];
  defaultTime: string;
  onAdd: (b: { goalId: string; start: number; duration: number }) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const activeGoals = goals.filter((g) => !g.archived);
  const [goalId, setGoalId] = useState(activeGoals[0]?.id || "");
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(1);

  if (activeGoals.length === 0) {
    return (
      <Sheet title="Thêm nhiệm vụ" onClose={onClose}>
        <p className="text-text text-[14px] mb-4 leading-relaxed">
          Bạn cần có ít nhất một mục tiêu hằng ngày trước khi thêm vào lịch trình.
        </p>
        <Link
          href="/ke-hoach"
          onClick={onClose}
          className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
        >
          Tạo mục tiêu hằng ngày <ArrowRight size={15} />
        </Link>
      </Sheet>
    );
  }

  const submit = () => {
    onAdd({ goalId, start: timeStrToDec(time), duration });
    toast("Đã thêm vào lịch trình.");
    onClose();
  };

  return (
    <Sheet
      title="Thêm nhiệm vụ"
      subtitle="Thêm một buổi riêng lẻ ngoài lịch lặp lại, chỉ cho ngày này."
      onClose={onClose}
      dirty
      footer={
        <>
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
            Huỷ
          </button>
          <button onClick={submit} className="btn-primary flex-1 py-2.5 text-sm">
            Thêm vào lịch trình
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mục tiêu">
          <SelectInput value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {pillarOf(g.category).label} · {g.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Giờ bắt đầu">
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Thời lượng">
          <ChipSelect
            options={[0.5, 1, 1.5, 2, 3]}
            value={duration}
            onChange={setDuration}
            format={fmtHours}
          />
        </Field>
      </div>
    </Sheet>
  );
}
