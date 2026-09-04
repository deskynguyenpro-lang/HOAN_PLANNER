"use client";

import { Modal } from "./Modal";

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Xoá",
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} size="xs">
      <p className="text-text-2 text-[12.5px] mb-4 leading-relaxed">{body}</p>
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
          Huỷ
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white"
          style={{ background: danger ? "var(--bad)" : "var(--brand)" }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
