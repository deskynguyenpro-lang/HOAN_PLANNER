"use client";

import Link from "next/link";
import { Wand2, Target, CalendarPlus, ArrowRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { buildSampleData } from "@/lib/domain/sample";

const STEPS = [
  {
    icon: Target,
    title: "Đặt mục tiêu lớn",
    body: "Ví dụ “IELTS 6.5”, “Giảm 5kg”, “Xuất bản 1 paper” — cái đích để mọi việc hằng ngày hướng về.",
  },
  {
    icon: CalendarPlus,
    title: "Thêm mục tiêu hằng ngày",
    body: "Mỗi mục tiêu có khung giờ lặp lại. App tự đưa vào lịch trình từng ngày cho bạn.",
  },
  {
    icon: Sparkles,
    title: "Bám lịch & nhận phản hồi",
    body: "Đánh dấu hoàn thành mỗi ngày. Cuối tuần app tự chấm điểm, chỉ chỗ lệch và gợi ý điều chỉnh.",
  },
];

export function OnboardingCard() {
  const { replaceAll } = useStore();

  return (
    <div className="card p-5 lg:p-6 overflow-hidden relative">
      <div
        aria-hidden
        className="absolute -top-24 -right-16 w-64 h-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 22%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="eyebrow mb-1.5">Bắt đầu</div>
        <h2 className="display text-[19px] mb-1">Dựng kế hoạch đầu tiên trong 1 phút</h2>
        <p className="text-text-2 text-[13px] leading-relaxed mb-5 max-w-[560px]">
          Bốn trụ cột — Công việc, Học tập, Sức khỏe, Nghiên cứu — theo một chỗ. Bạn lập
          kế hoạch, app đo hiệu quả và phản hồi để bạn điều chỉnh.
        </p>

        <ol className="grid sm:grid-cols-3 gap-3 mb-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="rounded-xl p-3.5"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="num text-[11px] font-bold w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
                  >
                    {i + 1}
                  </span>
                  <Icon size={15} className="text-text-2" />
                </div>
                <div className="text-text text-[12.5px] font-bold mb-0.5">{s.title}</div>
                <div className="text-text-3 text-[11.5px] leading-relaxed">{s.body}</div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => replaceAll(buildSampleData())}
            className="btn-primary px-4 py-2.5 text-[13px] flex items-center gap-2"
          >
            <Wand2 size={15} /> Tải dữ liệu mẫu để xem thử
          </button>
          <Link
            href="/ke-hoach"
            className="btn-ghost px-4 py-2.5 text-[13px] flex items-center gap-2"
          >
            Tự tạo mục tiêu <ArrowRight size={14} />
          </Link>
        </div>
        <p className="text-text-3 text-[11px] mt-3">
          Dữ liệu mẫu có thể xoá bất cứ lúc nào ở <b>Thiết lập → Tải dữ liệu mẫu</b>, hoặc
          nhập lại tay.
        </p>
      </div>
    </div>
  );
}
