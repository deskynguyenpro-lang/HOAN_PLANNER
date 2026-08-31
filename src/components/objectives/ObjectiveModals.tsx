"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { objectiveProgress } from "@/lib/domain/stats";
import { todayKey } from "@/lib/domain/dates";
import type { Objective } from "@/lib/domain/types";

export function ObjectiveFormModal({
  objective,
  onSave,
  onClose,
}: {
  objective: Objective | null;
  onSave: (o: Objective) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(objective?.name || "");
  const [unit, setUnit] = useState(objective?.unit || "");
  const [startValue, setStartValue] = useState(String(objective?.startValue ?? 0));
  const [targetValue, setTargetValue] = useState(String(objective?.targetValue ?? 0));
  const [deadline, setDeadline] = useState(objective?.deadline || "");

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: objective?.id || `o_${Date.now()}`,
      name: name.trim(),
      unit: unit.trim(),
      startValue: Number(startValue),
      targetValue: Number(targetValue),
      deadline,
      checkins: objective?.checkins || [],
      archived: false,
    });
    onClose();
  };

  return (
    <Modal title={objective ? "Sửa mục tiêu" : "Mục tiêu mới"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="eyebrow">Tên mục tiêu</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: IELTS 6.5, Xuất bản 1 paper"
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Đơn vị đo</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="VD: điểm, kg, paper, chương"
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="eyebrow">Hiện tại</span>
            <input
              type="number"
              step="0.1"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="field num w-full mt-1.5 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="eyebrow">Mục tiêu</span>
            <input
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="field num w-full mt-1.5 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="eyebrow">Hạn hoàn thành (tuỳ chọn)</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </label>
        <button onClick={submit} className="btn-primary w-full py-3 text-sm mt-1">
          {objective ? "Lưu thay đổi" : "Tạo mục tiêu"}
        </button>
      </div>
    </Modal>
  );
}

export function CheckinModal({
  objective,
  onSave,
  onClose,
}: {
  objective: Objective;
  onSave: (entry: { date: string; value: number }) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(todayKey());
  const [value, setValue] = useState(String(objectiveProgress(objective).current));
  return (
    <Modal title="Cập nhật tiến độ" onClose={onClose} size="xs">
      <p className="text-text-3 text-[12px] mb-3">{objective.name}</p>
      <div className="space-y-3">
        <label className="block">
          <span className="eyebrow">Ngày</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Giá trị hiện tại ({objective.unit || "đơn vị"})</span>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field num w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          onClick={() => {
            onSave({ date, value: Number(value) });
            onClose();
          }}
          className="w-full rounded-xl py-2.5 text-sm font-bold text-white"
          style={{ background: "var(--good)" }}
        >
          Lưu tiến độ
        </button>
      </div>
    </Modal>
  );
}
