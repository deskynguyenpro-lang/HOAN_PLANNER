"use client";

import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/lib/data/store";
import { buildSampleData } from "@/lib/domain/sample";

export function SeedConfirmModal({ onClose }: { onClose: () => void }) {
  const { replaceAll } = useStore();
  return (
    <Modal title="Tải dữ liệu mẫu?" onClose={onClose} size="xs">
      <p className="text-text-2 text-[12.5px] mb-4 leading-relaxed">
        Gồm 2 mục tiêu lớn (IELTS 6.5, Giảm 5kg), 5 mục tiêu ngày trải đủ 4 trụ cột và 21
        ngày lịch sử để bạn xem app hoạt động thực tế. Thao tác này sẽ <b>thay thế</b> toàn
        bộ dữ liệu hiện tại.
      </p>
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
          Huỷ
        </button>
        <button
          onClick={() => {
            replaceAll(buildSampleData());
            onClose();
          }}
          className="btn-primary flex-1 py-2.5 text-sm"
        >
          Tải dữ liệu mẫu
        </button>
      </div>
    </Modal>
  );
}
