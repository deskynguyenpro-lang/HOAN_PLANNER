"use client";

import { useEffect, useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { decToLabel, fmtHours } from "@/lib/domain/dates";
import type { FixedTimeBlock } from "@/lib/domain/fixedBlocks";
import { fetchFixedBlocks, saveFixedBlocks } from "@/lib/data/fixed-blocks-store";
import { FixedBlockForm } from "./FixedBlockForm";

const WEEKDAY_LABEL: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

function daysLabel(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return "hằng ngày";
  if (sorted.join(",") === "1,2,3,4,5") return "T2–T6";
  return sorted.map((d) => WEEKDAY_LABEL[d]).join(", ");
}

export function FixedBlocksCard() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<FixedTimeBlock[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<FixedTimeBlock | null | "new">(null);

  useEffect(() => {
    fetchFixedBlocks()
      .then(setBlocks)
      .catch(() => setBlocks([]))
      .finally(() => setLoaded(true));
  }, []);

  const persist = async (next: FixedTimeBlock[], message: string) => {
    setBlocks(next);
    try {
      await saveFixedBlocks(next);
      toast(message);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không lưu được.", "error");
    }
  };

  const upsert = (b: FixedTimeBlock) => {
    const exists = blocks.some((x) => x.id === b.id);
    const next = exists ? blocks.map((x) => (x.id === b.id ? b : x)) : [...blocks, b];
    persist(next, exists ? "Đã lưu thay đổi." : "Đã thêm khung giờ cố định.");
  };

  const remove = (id: string) => {
    persist(blocks.filter((b) => b.id !== id), "Đã xoá khung giờ cố định.");
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h2 className="headline text-[14px] flex items-center gap-1.5">
          <Lock size={15} className="text-brand" /> Khung giờ cố định
        </h2>
        <button
          onClick={() => setEditing("new")}
          className="btn-ghost px-2.5 py-1.5 text-[12px] flex items-center gap-1"
        >
          <Plus size={13} /> Thêm
        </button>
      </div>
      <p className="text-text-3 text-[11.5px] leading-relaxed mb-3">
        Ăn trưa, tan làm, đón con, họp cố định, giờ ngủ... — khai báo 1 lần, AI xếp lịch (Trợ lý AI Chat) sẽ luôn
        tránh chèn task vào đây, không cần tài khoản Google.
      </p>

      {!loaded ? (
        <div className="h-10 rounded-xl" style={{ background: "var(--chip)" }} />
      ) : blocks.length === 0 ? (
        <p className="text-text-3 text-[12px]">Chưa có khung giờ cố định nào.</p>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "var(--chip)" }}
            >
              <div className="min-w-0">
                <div className="text-text text-[12.5px] font-semibold truncate">{b.label}</div>
                <div className="text-text-3 text-[11px] num mt-0.5">
                  {decToLabel(b.start)} · {fmtHours(b.duration)} · {daysLabel(b.days)}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(b)}
                  className="p-2 rounded-lg text-text-2 hover:text-text hover:bg-chip"
                  aria-label="Sửa"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => remove(b.id)}
                  className="p-2 rounded-lg text-text-3 hover:text-bad hover:bg-chip"
                  aria-label="Xoá"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <FixedBlockForm
          block={editing === "new" ? null : editing}
          onSave={upsert}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}
