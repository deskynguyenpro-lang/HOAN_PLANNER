"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput, DayPicker } from "@/components/ui/Field";
import { decToLabel, fmtHours, timeStrToDec } from "@/lib/domain/dates";
import type { FixedTimeBlock } from "@/lib/domain/fixedBlocks";

function endLabelFor(block: FixedTimeBlock): string {
  const end = block.start + block.duration;
  return decToLabel(end >= 24 ? end - 24 : end);
}

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
  const [startTime, setStartTime] = useState(block ? decToLabel(block.start) : "08:00");
  const [endTime, setEndTime] = useState(block ? endLabelFor(block) : "09:00");
  const [days, setDays] = useState<number[]>(block?.days ?? [1, 2, 3, 4, 5]);

  const startDec = timeStrToDec(startTime);
  const endDec = timeStrToDec(endTime);
  // Giờ kết thúc <= giờ bắt đầu -> hiểu là qua nửa đêm (VD ca đêm 22:00-06:00).
  const duration = endDec > startDec ? endDec - startDec : 24 - startDec + endDec;
  const overnight = endDec <= startDec;

  const submit = () => {
    if (!label.trim()) return;
    if (days.length === 0) return;
    if (duration <= 0) return;
    onSave({
      id: block?.id ?? `fb_${Date.now()}`,
      label: label.trim(),
      start: startDec,
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
            placeholder='VD: "Ăn trưa", "Đón con", "Công việc trên cty"'
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Giờ bắt đầu">
            <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Giờ kết thúc">
            <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        <p className="text-text-3 text-[11px] -mt-1">
          Kéo dài {fmtHours(duration)}
          {overnight ? " — qua ngày hôm sau" : ""}
        </p>

        <Field label="Ngày lặp lại">
          <DayPicker value={days} onChange={setDays} />
        </Field>
      </div>
    </Sheet>
  );
}
