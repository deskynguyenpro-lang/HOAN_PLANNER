"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput, ChipSelect, DayPicker } from "@/components/ui/Field";
import { decToLabel, timeStrToDec } from "@/lib/domain/dates";
import type { FixedTimeBlock } from "@/lib/domain/fixedBlocks";

export function FixedBlockForm({
  block,
  onSave,
  onClose,
}: {
  block: FixedTimeBlock | null; // null = tạo mới
  onSave: (b: FixedTimeBlock) => void;
  onClose: () => void;
}) {
  const editing = !!block;
  const [label, setLabel] = useState(block?.label ?? "");
  const [time, setTime] = useState(block ? decToLabel(block.start) : "12:00");
  const [duration, setDuration] = useState(block?.duration ?? 1);
  const [days, setDays] = useState<number[]>(block?.days ?? [1, 2, 3, 4, 5]);

  const submit = () => {
    if (!label.trim()) return;
    if (days.length === 0) return;
    onSave({
      id: block?.id ?? `fb_${Date.now()}`,
      label: label.trim(),
      start: timeStrToDec(time),
      duration,
      days,
    });
    onClose();
  };

  return (
    <Sheet
      title={editing ? "Sửa khung giờ cố định" : "Khung giờ cố định mới"}
      subtitle="Việc đã cố định rồi (ăn, họp, tan làm...) — AI sẽ không bao giờ xếp task chèn lên đây."
      onClose={onClose}
      dirty
      footer={
        <>
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
            Huỷ
          </button>
          <button onClick={submit} className="btn-primary flex-1 py-2.5 text-sm">
            {editing ? "Lưu thay đổi" : "Thêm khung giờ"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên">
          <TextInput
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            placeholder='VD: "Ăn trưa", "Đón con", "Họp giao ban"'
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Giờ bắt đầu">
            <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Kéo dài">
            <ChipSelect
              options={[0.25, 0.5, 1, 1.5, 2, 8]}
              value={duration}
              onChange={setDuration}
              format={(v) => (v < 1 ? `${v * 60}p` : `${v}h`)}
            />
          </Field>
        </div>

        <Field label="Ngày lặp lại">
          <DayPicker value={days} onChange={setDays} />
        </Field>
      </div>
    </Sheet>
  );
}
