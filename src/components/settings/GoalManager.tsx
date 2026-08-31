"use client";

import { useState } from "react";
import { Pencil, Trash2, Repeat, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PillarDot } from "@/components/ui/bits";
import { useStore } from "@/lib/data/store";
import { PILLARS, pillarOf } from "@/lib/domain/pillars";
import {
  decToLabel,
  fmtHours,
  fmtShort,
  parseKey,
  timeStrToDec,
  todayKey,
} from "@/lib/domain/dates";
import { effectiveSchedule } from "@/lib/domain/schedule";
import type { PillarId, Schedule } from "@/lib/domain/types";

const WEEKDAY_CHIPS = [
  { d: 1, label: "T2" },
  { d: 2, label: "T3" },
  { d: 3, label: "T4" },
  { d: 4, label: "T5" },
  { d: 5, label: "T6" },
  { d: 6, label: "T7" },
  { d: 0, label: "CN" },
];

const DEFAULT_SCHEDULE: Schedule = {
  start: 8,
  duration: 1,
  days: [1, 2, 3, 4, 5, 6, 0],
  fromDate: todayKey(),
  toDate: "",
};

export function GoalManager({ onClose }: { onClose: () => void }) {
  const { goals, setGoals, objectives } = useStore();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("1");
  const [category, setCategory] = useState<PillarId>("work");
  const [objectiveId, setObjectiveId] = useState("");
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeObjectives = objectives.filter((o) => !o.archived);
  const activeGoals = goals.filter((g) => !g.archived);

  const reset = () => {
    setName("");
    setTarget("1");
    setCategory("work");
    setObjectiveId("");
    setSchedule({ ...DEFAULT_SCHEDULE, fromDate: todayKey() });
    setEditingId(null);
  };

  const submit = () => {
    if (!name.trim()) return;
    const finalSchedule = { ...schedule, duration: Number(target) || 1 };
    if (editingId) {
      setGoals(
        goals.map((g) =>
          g.id === editingId
            ? {
                ...g,
                name: name.trim(),
                target: Number(target),
                category,
                objectiveId: objectiveId || null,
                schedule: finalSchedule,
              }
            : g,
        ),
      );
    } else {
      setGoals([
        ...goals,
        {
          id: `g_${Date.now()}`,
          name: name.trim(),
          target: Number(target),
          category,
          objectiveId: objectiveId || null,
          schedule: finalSchedule,
          createdAt: todayKey(),
          archived: false,
        },
      ]);
    }
    reset();
  };

  const startEdit = (id: string) => {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    setEditingId(g.id);
    setName(g.name);
    setTarget(String(g.target));
    setCategory(g.category);
    setObjectiveId(g.objectiveId || "");
    const sch = g.schedule && g.schedule.days ? g.schedule : DEFAULT_SCHEDULE;
    setSchedule({
      start: sch.start ?? 8,
      duration: sch.duration ?? 1,
      days: sch.days || DEFAULT_SCHEDULE.days,
      fromDate: sch.fromDate || g.createdAt || todayKey(),
      toDate: sch.toDate || "",
    });
  };

  const remove = (id: string) =>
    setGoals(goals.map((g) => (g.id === id ? { ...g, archived: true } : g)));

  const toggleDay = (d: number) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort(),
    }));

  return (
    <Modal title="Mục tiêu hằng ngày" onClose={onClose} size="md">
      <div className="space-y-2 mb-5 max-h-[38vh] overflow-y-auto pr-1">
        {activeGoals.length === 0 && (
          <p className="text-text-3 text-[13px]">Chưa có mục tiêu — thêm ở bên dưới.</p>
        )}
        {activeGoals.map((g) => {
          const p = pillarOf(g.category);
          const obj = objectives.find((o) => o.id === g.objectiveId);
          const sch = effectiveSchedule(g);
          const dayLabel =
            sch.days.length === 7
              ? "hằng ngày"
              : WEEKDAY_CHIPS.filter((w) => sch.days.includes(w.d))
                  .map((w) => w.label)
                  .join(", ");
          const rangeLabel = sch.toDate
            ? `${fmtShort(parseKey(sch.fromDate))} → ${fmtShort(parseKey(sch.toDate))}`
            : `từ ${fmtShort(parseKey(sch.fromDate))}`;
          return (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ background: "color-mix(in srgb, " + p.color + " 12%, transparent)" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PillarDot id={g.category} size={9} />
                <div className="min-w-0">
                  <div className="text-text text-[13.5px] font-semibold truncate">
                    {g.name}
                  </div>
                  <div className="text-[11.5px] font-semibold" style={{ color: p.color }}>
                    {p.label} · {fmtHours(g.target)}/ngày
                    {obj ? ` · hướng tới "${obj.name}"` : ""}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-text-3 text-[11px]">
                    <Repeat size={10} />
                    <span>
                      {decToLabel(sch.start)} · {dayLabel} · {rangeLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(g.id)}
                  className="p-1.5 text-text-2 hover:text-text"
                  aria-label="Sửa"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(g.id)}
                  className="p-1.5 text-text-3 hover:text-bad"
                  aria-label="Xoá"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <label className="block">
          <span className="eyebrow">Tên mục tiêu ngày</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Học từ vựng IELTS"
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="eyebrow">Giờ/ngày</span>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="field num w-full mt-1.5 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="eyebrow">Trụ cột</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PillarId)}
              className="field w-full mt-1.5 px-3 py-2.5 text-sm"
            >
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: "var(--brand-dim)", border: "1px solid color-mix(in srgb, var(--brand) 30%, transparent)" }}
        >
          <div className="flex items-center gap-1.5 mb-1 text-brand text-[12.5px] font-bold">
            <Repeat size={14} /> Khung giờ lặp lại
          </div>
          <p className="text-text-2 text-[11px] mb-3">
            Mỗi ngày phù hợp, app tự đưa đúng <b>{fmtHours(Number(target) || 1)}</b> vào lịch
            trình, bắt đầu từ giờ bạn chọn.
          </p>
          <div className="space-y-2.5">
            <label className="block">
              <span className="eyebrow" style={{ fontSize: 10 }}>
                Giờ bắt đầu
              </span>
              <input
                type="time"
                value={decToLabel(schedule.start)}
                onChange={(e) =>
                  setSchedule((s) => ({ ...s, start: timeStrToDec(e.target.value) }))
                }
                className="field w-full mt-1 px-2.5 py-2 text-sm"
              />
            </label>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="eyebrow" style={{ fontSize: 10 }}>
                  Ngày lặp lại
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setSchedule((s) => ({ ...s, days: [0, 1, 2, 3, 4, 5, 6] }))
                    }
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-brand"
                  >
                    Mỗi ngày
                  </button>
                  <button
                    onClick={() => setSchedule((s) => ({ ...s, days: [1, 2, 3, 4, 5] }))}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-brand"
                  >
                    T2–T6
                  </button>
                </div>
              </div>
              <div className="flex gap-1">
                {WEEKDAY_CHIPS.map((w) => {
                  const on = schedule.days.includes(w.d);
                  return (
                    <button
                      key={w.d}
                      onClick={() => toggleDay(w.d)}
                      className="flex-1 rounded-lg py-1.5 text-[11px] font-bold transition"
                      style={{
                        background: on ? "var(--brand)" : "var(--surface)",
                        color: on ? "#fff" : "var(--text-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="eyebrow" style={{ fontSize: 10 }}>
                  Từ ngày
                </span>
                <input
                  type="date"
                  value={schedule.fromDate}
                  onChange={(e) =>
                    setSchedule((s) => ({ ...s, fromDate: e.target.value }))
                  }
                  className="field w-full mt-1 px-2.5 py-2 text-sm"
                />
              </label>
              <label className="flex-1">
                <span className="eyebrow" style={{ fontSize: 10 }}>
                  Đến ngày (tuỳ chọn)
                </span>
                <input
                  type="date"
                  value={schedule.toDate}
                  onChange={(e) => setSchedule((s) => ({ ...s, toDate: e.target.value }))}
                  className="field w-full mt-1 px-2.5 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="eyebrow">Hướng tới mục tiêu lớn (tuỳ chọn)</span>
          <select
            value={objectiveId}
            onChange={(e) => setObjectiveId(e.target.value)}
            className="field w-full mt-1.5 px-3 py-2.5 text-sm"
          >
            <option value="">Không liên kết</option>
            {activeObjectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button onClick={submit} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5">
            {editingId ? "Cập nhật" : (<><Plus size={15} /> Thêm mục tiêu</>)}
          </button>
          {editingId && (
            <button onClick={reset} className="btn-ghost px-4 py-2.5 text-sm">
              Hủy
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
