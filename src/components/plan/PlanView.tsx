"use client";

import { useState } from "react";
import { Plus, Target, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/bits";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/data/store";
import type { Goal, Objective } from "@/lib/domain/types";
import { ObjectiveCard } from "./ObjectiveCard";
import { ObjectiveForm } from "./ObjectiveForm";
import { CheckinForm } from "./CheckinForm";
import { GoalRow } from "./GoalRow";
import { GoalForm } from "./GoalForm";

type Panel =
  | { kind: "none" }
  | { kind: "objective-form"; objective: Objective | null }
  | { kind: "checkin"; objective: Objective }
  | { kind: "goal-form"; goal: Goal | null }
  | { kind: "delete-objective"; id: string }
  | { kind: "delete-goal"; id: string };

export function PlanView() {
  const { goals, setGoals, objectives, setObjectives } = useStore();
  const { toast } = useToast();
  const [panel, setPanel] = useState<Panel>({ kind: "none" });

  const activeObjectives = objectives.filter((o) => !o.archived);
  const activeGoals = goals.filter((g) => !g.archived);
  const objectiveById = Object.fromEntries(objectives.map((o) => [o.id, o]));

  const close = () => setPanel({ kind: "none" });

  const deleteObjective = (id: string) => {
    setObjectives(objectives.map((o) => (o.id === id ? { ...o, archived: true } : o)));
    toast("Đã xoá mục tiêu lớn.");
  };
  const deleteGoal = (id: string) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, archived: true } : g)));
    toast("Đã xoá mục tiêu hằng ngày.");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-1">Kế hoạch</div>
        <h1 className="display text-[24px] lg:text-[26px]">Mục tiêu &amp; lịch lặp lại</h1>
        <p className="text-text-2 text-[13px] mt-1.5 max-w-[560px]">
          Đặt đích lớn, rồi gắn việc lặp lại hằng ngày vào đó. App tự đưa vào lịch trình và
          đo hiệu quả cho bạn.
        </p>
      </div>

      {/* ─── Mục tiêu lớn ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="headline text-[15px] flex items-center gap-2">
            <Target size={16} className="text-brand" /> Mục tiêu lớn
          </h2>
          <button
            onClick={() => setPanel({ kind: "objective-form", objective: null })}
            className="btn-primary px-3.5 py-2 text-[12.5px] flex items-center gap-1.5"
          >
            <Plus size={15} /> Mục tiêu lớn
          </button>
        </div>

        {activeObjectives.length === 0 ? (
          <Card>
            <EmptyState
              icon={Target}
              title="Chưa có mục tiêu lớn nào"
              hint='Ví dụ "IELTS 6.5" hay "Xuất bản 1 paper" — cái đích để mọi việc hằng ngày hướng về.'
              action={
                <button
                  onClick={() => setPanel({ kind: "objective-form", objective: null })}
                  className="btn-primary px-4 py-2.5 text-[13px] flex items-center gap-2"
                >
                  <Plus size={15} /> Tạo mục tiêu lớn
                </button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {activeObjectives.map((o) => (
              <ObjectiveCard
                key={o.id}
                objective={o}
                onEdit={(obj) => setPanel({ kind: "objective-form", objective: obj })}
                onDelete={(id) => setPanel({ kind: "delete-objective", id })}
                onCheckin={(obj) => setPanel({ kind: "checkin", objective: obj })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Mục tiêu hằng ngày ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="headline text-[15px] flex items-center gap-2">
            <ListChecks size={16} className="text-brand" /> Mục tiêu hằng ngày
          </h2>
          <button
            onClick={() => setPanel({ kind: "goal-form", goal: null })}
            className="btn-primary px-3.5 py-2 text-[12.5px] flex items-center gap-1.5"
          >
            <Plus size={15} /> Mục tiêu hằng ngày
          </button>
        </div>

        {activeGoals.length === 0 ? (
          <Card>
            <EmptyState
              icon={ListChecks}
              title="Chưa có việc lặp lại nào"
              hint="Đặt khung giờ lặp lại (VD: 19:30 mỗi tối T2–T6) — app tự đưa vào lịch trình mỗi ngày."
              action={
                <button
                  onClick={() => setPanel({ kind: "goal-form", goal: null })}
                  className="btn-primary px-4 py-2.5 text-[13px] flex items-center gap-2"
                >
                  <Plus size={15} /> Thêm mục tiêu hằng ngày
                </button>
              }
            />
          </Card>
        ) : (
          <Card>
            <div className="space-y-2">
              {activeGoals.map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  objective={g.objectiveId ? objectiveById[g.objectiveId] : undefined}
                  onEdit={() => setPanel({ kind: "goal-form", goal: g })}
                  onDelete={() => setPanel({ kind: "delete-goal", id: g.id })}
                />
              ))}
            </div>
          </Card>
        )}
      </section>

      {panel.kind === "objective-form" && (
        <ObjectiveForm objective={panel.objective} onClose={close} />
      )}
      {panel.kind === "checkin" && (
        <CheckinForm objective={panel.objective} onClose={close} />
      )}
      {panel.kind === "goal-form" && <GoalForm goal={panel.goal} onClose={close} />}
      {panel.kind === "delete-objective" && (
        <ConfirmDialog
          title="Xoá mục tiêu lớn?"
          body="Các mục tiêu hằng ngày đang liên kết sẽ không còn gắn với mục tiêu này, nhưng vẫn giữ nguyên trong lịch trình."
          onConfirm={() => deleteObjective(panel.id)}
          onClose={close}
        />
      )}
      {panel.kind === "delete-goal" && (
        <ConfirmDialog
          title="Xoá mục tiêu hằng ngày?"
          body="Các buổi đã hoàn thành trong lịch sử vẫn được giữ lại, chỉ ngừng lặp lại từ nay."
          onConfirm={() => deleteGoal(panel.id)}
          onClose={close}
        />
      )}
    </div>
  );
}
