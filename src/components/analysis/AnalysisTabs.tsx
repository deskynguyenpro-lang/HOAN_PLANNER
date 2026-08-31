"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui/bits";
import { ReportsView } from "@/components/reports/ReportsView";
import { WeeklyReviewView } from "@/components/weekly/WeeklyReviewView";

export function AnalysisTabs() {
  const params = useSearchParams();
  const initial = params.get("tab") === "tuan" ? "tuan" : "bao-cao";
  const [tab, setTab] = useState<"bao-cao" | "tuan">(initial);

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow mb-1">Phân tích</div>
        <h1 className="headline text-[22px] mb-3">Hiệu quả &amp; phản hồi</h1>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "bao-cao", label: "Báo cáo" },
            { value: "tuan", label: "Tổng kết tuần" },
          ]}
        />
      </div>
      {tab === "bao-cao" ? <ReportsView /> : <WeeklyReviewView />}
    </div>
  );
}
