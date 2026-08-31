"use client";

import { Modal } from "@/components/ui/Modal";
import { REASONS } from "@/lib/domain/pillars";

export function ReasonModal({
  onPick,
  onClose,
}: {
  onPick: (r: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Vì sao chưa hoàn thành?" onClose={onClose} size="xs">
      <div className="space-y-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => onPick(r)}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-text hover:bg-chip transition"
            style={{ background: "var(--surface-2)" }}
          >
            {r}
          </button>
        ))}
      </div>
    </Modal>
  );
}
