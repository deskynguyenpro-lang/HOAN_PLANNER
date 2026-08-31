"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
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
  const activeGoals = goals.filter((g) => !g.archived);
  const [goalId, setGoalId] = useState(activeGoals[0]?.id || "");
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(1);

  if (activeGoals.length === 0) {
    return (
      <Modal title="Thêm nhiệm vụ" onClose={onClose} size="xs">
        <p className="text-text text-[14px] mb-3">
          Bạn cần tạo ít nhất một mục tiêu hằng ngày trước (mở Thiết lập → Mục tiêu hằng
          ngày).
        </p>
        <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">
          Đã hiểu
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Thêm nhiệm vụ" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="eyebrow">Mục tiêu</span>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          >
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {pillarOf(g.category).label} · {g.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="eyebrow">Giờ bắt đầu</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="field w-full mt-1.5 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="flex-1">
            <span className="eyebrow">Thời lượng</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[0.5, 1, 1.5, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={{
                    background: duration === d ? "var(--brand)" : "var(--chip)",
                    color: duration === d ? "#fff" : "var(--text-2)",
                  }}
                >
                  {fmtHours(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            onAdd({ goalId, start: timeStrToDec(time), duration: Number(duration) });
            onClose();
          }}
          className="btn-primary w-full py-3 text-sm mt-1"
        >
          Thêm vào lịch trình
        </button>
      </div>
    </Modal>
  );
}
