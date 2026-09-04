"use client";

import { useMemo, useState } from "react";
import { Repeat } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput, SelectInput, DayPicker } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/data/store";
import { PILLARS } from "@/lib/domain/pillars";
import { decToLabel, fmtHours, timeStrToDec, todayKey } from "@/lib/domain/dates";
import type { Goal, PillarId, Schedule } from "@/lib/domain/types";

const DEFAULT_SCHEDULE: Schedule = {
  start: 8,
  duration: 1,
  days: [1, 2, 3, 4, 5],
  fromDate: todayKey(),
  toDate: "",
};

export function GoalForm({
  goal,
  onClose,
}: {
  goal: Goal | null; // null = tạo mới
  onClose: () => void;
}) {
  const { goals, setGoals, objectives } = useStore();
  const { toast } = useToast();
  const editing = !!goal;

  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(String(goal?.target ?? 1));
  const [category, setCategory] = useState<PillarId>(goal?.category ?? "work");
  const [objectiveId, setObjectiveId] = useState(goal?.objectiveId ?? "");
  const [sch, setSch] = useState<Schedule>(
    goal?.schedule?.days?.length
      ? {
          start: goal.schedule.start ?? 8,
          duration: goal.schedule.duration ?? 1,
          days: goal.schedule.days,
          fromDate: goal.schedule.fromDate || goal.createdAt || todayKey(),
          toDate: goal.schedule.toDate || "",
        }
      : { ...DEFAULT_SCHEDULE },
  );

  const initial = useMemo(() => JSON.stringify({ name: goal?.name ?? "" }), [goal]);
  const dirty =
    JSON.stringify({ name }) !== initial ||
    (!editing && (name.trim() !== "" || Number(target) !== 1));

  const activeObjectives = objectives.filter((o) => !o.archived);
  const hrs = Number(target) || 1;

  const submit = () => {
    if (!name.trim()) {
      toast("Cần đặt tên cho mục tiêu.", "error");
      return;
    }
    if (sch.days.length === 0) {
      toast("Chọn ít nhất một ngày lặp lại.", "error");
      return;
    }
    const finalSchedule: Schedule = { ...sch, duration: hrs };
    if (editing && goal) {
      setGoals(
        goals.map((g) =>
          g.id === goal.id
            ? { ...g, name: name.trim(), target: hrs, category, objectiveId: objectiveId || null, schedule: finalSchedule }
            : g,
        ),
      );
      toast("Đã lưu thay đổi.");
    } else {
      setGoals([
        ...goals,
        {
          id: `g_${Date.now()}`,
          name: name.trim(),
          target: hrs,
          category,
          objectiveId: objectiveId || null,
          schedule: finalSchedule,
          createdAt: todayKey(),
          archived: false,
        },
      ]);
      toast("Đã thêm mục tiêu hằng ngày.");
    }
    onClose();
  };

  return (
    <Sheet
      title={editing ? "Sửa mục tiêu hằng ngày" : "Mục tiêu hằng ngày mới"}
      subtitle="Việc lặp lại theo lịch. App tự đưa vào lịch trình từng ngày."
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
            Huỷ
          </button>
          <button onClick={submit} className="btn-primary flex-1 py-2.5 text-sm">
            {editing ? "Lưu thay đổi" : "Thêm mục tiêu"}
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
            placeholder="VD: Học từ vựng IELTS"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Giờ mỗi ngày">
            <TextInput
              type="number"
              min="0.25"
              step="0.25"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <Field label="Trụ cột">
            <SelectInput
              value={category}
              onChange={(e) => setCategory(e.target.value as PillarId)}
            >
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div
          className="rounded-xl p-3.5"
          style={{
            background: "var(--brand-dim)",
            border: "1px solid color-mix(in srgb, var(--brand) 28%, transparent)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2.5 text-brand text-[12.5px] font-bold">
            <Repeat size={14} /> Khung giờ lặp lại
          </div>

          <div className="space-y-3">
            <Field label="Giờ bắt đầu">
              <TextInput
                type="time"
                value={decToLabel(sch.start)}
                onChange={(e) => setSch((s) => ({ ...s, start: timeStrToDec(e.target.value) }))}
              />
            </Field>
            <Field label="Ngày lặp lại" hint={`Mỗi ngày phù hợp app đưa đúng ${fmtHours(hrs)} vào lịch trình.`}>
              <DayPicker value={sch.days} onChange={(days) => setSch((s) => ({ ...s, days }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Từ ngày">
                <TextInput
                  type="date"
                  value={sch.fromDate}
                  onChange={(e) => setSch((s) => ({ ...s, fromDate: e.target.value }))}
                />
              </Field>
              <Field label="Đến ngày (tuỳ chọn)">
                <TextInput
                  type="date"
                  value={sch.toDate}
                  onChange={(e) => setSch((s) => ({ ...s, toDate: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        </div>

        <Field label="Hướng tới mục tiêu lớn (tuỳ chọn)">
          <SelectInput value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
            <option value="">Không liên kết</option>
            {activeObjectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
    </Sheet>
  );
}
