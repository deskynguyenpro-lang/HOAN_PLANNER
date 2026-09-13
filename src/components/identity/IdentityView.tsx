"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Loader2, Sparkles, Target, TrendingDown, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/bits";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/data/store";
import { PILLARS, pillarOf } from "@/lib/domain/pillars";
import { fmtHours } from "@/lib/domain/dates";
import {
  emptyIdentity,
  normalizeWeights,
  recommendedAllocation,
  FOCUS_MODE_LABEL,
  FOCUS_MODE_HINT,
  type FocusMode,
  type IdentityProfile,
  type PillarWeights,
} from "@/lib/domain/identity";
import { fetchIdentity, saveIdentity } from "@/lib/data/identity-store";
import { PriorityWeightBar } from "./PriorityWeightBar";

export function IdentityView() {
  const { goals, logs } = useStore();
  const { toast } = useToast();

  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<IdentityProfile>(emptyIdentity());
  const [vision, setVision] = useState("");
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({
    work: "25",
    study: "25",
    health: "25",
    research: "25",
  });
  const [focusMode, setFocusMode] = useState<FocusMode>("balance");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchIdentity();
        setProfile(p);
        setVision(p.vision);
        setFocusMode(p.focusMode);
        setWeightInputs(
          Object.fromEntries(PILLARS.map((pl) => [pl.id, String(p.pillarWeights[pl.id])])),
        );
      } catch {
        /* giữ mặc định nếu tải lỗi */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const previewWeights: PillarWeights = useMemo(
    () => normalizeWeights(Object.fromEntries(PILLARS.map((p) => [p.id, weightInputs[p.id]]))),
    [weightInputs],
  );
  const rawTotal = PILLARS.reduce((s, p) => s + (Number(weightInputs[p.id]) || 0), 0);

  const allocation = useMemo(
    () => recommendedAllocation(previewWeights, goals, logs),
    [previewWeights, goals, logs],
  );
  const totalCapacity = allocation.reduce((s, a) => s + a.actualHours, 0);

  const persist = async (next: IdentityProfile, message: string) => {
    setSaving(true);
    try {
      await saveIdentity(next);
      setProfile(next);
      toast(message);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không lưu được định hướng.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveManual = () => {
    const next: IdentityProfile = {
      ...profile,
      vision,
      pillarWeights: previewWeights,
      focusMode,
      updatedAt: new Date().toISOString(),
    };
    persist(next, "Đã lưu định hướng.");
  };

  const runAnalysis = async () => {
    if (vision.trim().length < 10) {
      setError("Viết rõ hơn định hướng của bạn (ít nhất một câu đầy đủ) để AI phân tích đúng.");
      return;
    }
    setError("");
    setAnalyzing(true);
    try {
      const briefGoals = goals
        .filter((g) => !g.archived)
        .map((g) => ({ id: g.id, name: g.name, pillar: pillarOf(g.category).label, targetHours: g.target }));
      const res = await fetch("/api/identity-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vision, goals: briefGoals }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Không phân tích được.");

      const next: IdentityProfile = {
        vision,
        pillarWeights: normalizeWeights(data.pillarWeights),
        focusMode,
        strategicSummary: data.strategicSummary,
        corePriorities: data.corePriorities,
        coreGoalIds: data.coreGoalIds,
        deprioritizedAdvice: data.deprioritizedAdvice,
        updatedAt: new Date().toISOString(),
      };
      setWeightInputs(Object.fromEntries(PILLARS.map((p) => [p.id, String(next.pillarWeights[p.id])])));
      await persist(next, "Đã tạo chiến lược mới từ AI.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không phân tích được lúc này.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!loaded) {
    return <div className="h-64 rounded-2xl" style={{ background: "var(--chip)" }} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow mb-1">Định hướng</div>
        <h1 className="display text-[24px] lg:text-[26px]">Định hướng &amp; trọng số ưu tiên</h1>
        <p className="text-text-2 text-[13px] mt-1.5 max-w-[620px]">
          Mô tả bạn muốn trở thành người thế nào trong 1-3 năm tới. AI (hoặc chính bạn) sẽ
          tính lại tỷ trọng nên đầu tư cho 4 trụ cột, thay vì mặc định chia đều 25% mỗi bên.
        </p>
      </div>

      <Card>
        <h2 className="headline text-[15px] flex items-center gap-1.5 mb-3">
          <Compass size={16} className="text-brand" /> Định hướng của bạn (1-3 năm tới)
        </h2>
        <textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          rows={5}
          placeholder='VD: "Trở thành kỹ sư cơ khí làm việc được ở môi trường quốc tế trong 2 năm tới — cần IELTS 6.5, vững chuyên môn, giữ sức khoẻ để trụ được cường độ cao."'
          className="field w-full px-3.5 py-3 text-sm leading-relaxed"
        />
        {error && <p className="text-bad text-[12px] mt-2">{error}</p>}
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="btn-primary mt-3 px-4 py-2.5 text-[13px] flex items-center gap-2 disabled:opacity-60"
        >
          {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Phân tích &amp; tạo chiến lược
        </button>
        <p className="text-text-3 text-[11px] mt-2">
          Cần cấu hình khoá API riêng (tính phí theo lượt). Không có khoá vẫn chỉnh trọng số
          bằng tay được ở dưới.
        </p>
      </Card>

      {profile.strategicSummary && (
        <Card style={{ background: "color-mix(in srgb, var(--research) 8%, var(--surface))" }}>
          <h2 className="headline text-[14px] flex items-center gap-1.5 mb-2">
            <Sparkles size={14} style={{ color: "var(--research)" }} /> Chiến lược AI đề xuất
          </h2>
          <p className="text-text text-[13px] leading-relaxed mb-3">{profile.strategicSummary}</p>
          {profile.corePriorities.length > 0 && (
            <div className="space-y-2 mb-3">
              {profile.corePriorities.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Target size={13} className="mt-0.5 flex-shrink-0" style={{ color: pillarOf(c.pillar).color }} />
                  <div className="text-[12.5px] text-text-2">
                    <b className="text-text">{c.action}</b> — {c.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
          {profile.deprioritizedAdvice && (
            <div className="flex items-start gap-2.5 text-[12.5px] text-text-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <TrendingDown size={13} className="mt-0.5 flex-shrink-0" />
              {profile.deprioritizedAdvice}
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="headline text-[15px] mb-3">Trọng số 4 trụ cột</h2>
        <PriorityWeightBar weights={previewWeights} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {PILLARS.map((p) => (
            <label key={p.id} className="block">
              <span className="eyebrow" style={{ color: p.color }}>
                {p.label}
              </span>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightInputs[p.id]}
                  onChange={(e) => setWeightInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                  className="field num w-full px-3 py-2 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 text-[12px]">%</span>
              </div>
            </label>
          ))}
        </div>
        <p className="text-text-3 text-[11px] mt-2">
          Tổng bạn nhập: <b className="num">{rawTotal}%</b> — sẽ tự quy đổi về đúng 100% khi
          lưu (không cần chỉnh cho khớp tuyệt đối).
        </p>

        <div className="mt-4">
          <span className="eyebrow mb-1.5 block">Chế độ tập trung</span>
          <Segmented
            value={focusMode}
            onChange={setFocusMode}
            options={(Object.keys(FOCUS_MODE_LABEL) as FocusMode[]).map((m) => ({
              value: m,
              label: FOCUS_MODE_LABEL[m],
            }))}
          />
          <p className="text-text-3 text-[11.5px] mt-1.5 flex items-center gap-1.5">
            {focusMode === "sprint" && <Zap size={12} style={{ color: "var(--warn)" }} />}
            {FOCUS_MODE_HINT[focusMode]}
          </p>
        </div>

        <button
          onClick={saveManual}
          disabled={saving}
          className="btn-primary mt-4 px-4 py-2.5 text-[13px] disabled:opacity-60"
        >
          Lưu định hướng
        </button>
      </Card>

      <Card>
        <h2 className="headline text-[15px] mb-1">Ngân sách giờ/tuần theo trọng số</h2>
        <p className="text-text-3 text-[11.5px] mb-3">
          Chia lại đúng {fmtHours(totalCapacity)} bạn đang có trên lịch mỗi tuần theo tỷ
          trọng ở trên — so với số giờ thật sự đang đặt cho từng trụ cột.
        </p>
        <div className="space-y-3">
          {allocation.map((a) => {
            const p = pillarOf(a.id);
            const over = a.deltaHours < -0.25;
            const under = a.deltaHours > 0.25;
            return (
              <div key={a.id} className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2">
                  <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: p.color }} />
                  {p.label}
                </span>
                <span className="num text-text-2">
                  {fmtHours(a.actualHours)} / nên ~{fmtHours(a.recommendedHours)}
                  {under && <span className="ml-1.5 font-bold" style={{ color: "var(--warn)" }}>thiếu {fmtHours(a.deltaHours)}</span>}
                  {over && <span className="ml-1.5 font-bold text-text-3">dư {fmtHours(-a.deltaHours)}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
