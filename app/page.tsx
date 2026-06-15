"use client";

import { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronDown, School, User, Users } from "lucide-react";

import { ResultView } from "@/components/survey/result-view";
import { ScoreButtons } from "@/components/survey/score-buttons";
import { Input } from "@/components/ui/input";
import {
  DIMENSIONS,
  PRESSURE_DIMENSIONS,
  LEARNING_QUESTION_BANK,
  PRESSURE_QUESTIONS,
  TOTAL_LEARNING_QUESTIONS,
  TOTAL_PRESSURE_QUESTIONS,
  shuffleQuestionIds,
  splitIntoPages,
  type SurveyScores,
} from "@/lib/survey-data";
import { cn } from "@/lib/utils";

type Step =
  | "landing"
  | "info"
  | "learning"
  | "stress-intro"
  | "stress"
  | "result";

const GENDER_OPTIONS = ["男", "女", "其他", "不愿透露"];

// 每页 6 道题：60 道学习力 = 10 页；30 道压力 = 5 页
const LEARNING_PAGE_SIZE = 6;
const PRESSURE_PAGE_SIZE = 6;

function IconInput({
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Input> & { icon: React.ElementType }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-amber-700/70" />
      <Input
        {...props}
        className={cn(
          "h-12 rounded-xl border-slate-200 bg-amber-50/40 pl-10 text-base focus-visible:border-amber-700 focus-visible:ring-amber-700/20",
          props.className
        )}
      />
    </div>
  );
}

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white">
      {children}
    </div>
  );
}

// ============== 以下组件从 SurveyPage 内部提取到外部 ==============
// 修复：之前在 SurveyPage 内部定义，每次答题导致 React 认为是全新组件
// 类型 -> 卸载并重新挂载整个 DOM 子树 -> 滚动位置被重置

function QuestionCard({
  number,
  text,
  value,
  onChange,
  scale,
  color,
}: {
  number: number;
  text: string;
  value?: number;
  onChange: (v: number) => void;
  scale: 10 | 5;
  color: "amber" | "teal";
}) {
  const leftLabel = scale === 5 ? "完全没有" : "完全不像我";
  const rightLabel = scale === 5 ? "几乎总是" : "完全像我";
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm p-4 sm:p-5">
      {/* 第一行：题号 + 题目文字 */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
            color === "teal" ? "bg-teal-600" : "bg-amber-700"
          )}
        >
          {number}
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-800">
          {text}
        </p>
      </div>

      {/* 第二行：按钮区域 - 必须占满卡片宽度，不能有额外左边距 */}
      <div className="flex w-full justify-between gap-1 sm:gap-2">
        {(scale === 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map(
          (num) => (
            <button
              key={num}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(num);
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center rounded-xl text-base font-semibold tabular-nums transition-colors active:scale-95 sm:text-lg",
                scale === 5 ? "h-14" : "h-12",
                value === num
                  ? color === "teal"
                    ? "bg-teal-600 text-white"
                    : "bg-amber-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {num}
            </button>
          )
        )}
      </div>

      {/* 第三行：左右提示文字 */}
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function TopProgress({
  progress,
  title,
  current,
  total,
  color,
}: {
  progress: number;
  title: string;
  current: number;
  total: number;
  color: "amber" | "teal";
}) {
  return (
    <div className="sticky inset-x-0 top-0 z-30 w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            第 {current} / {total} 部分 · {title}
          </span>
          <span
            className={cn(
              "font-medium tabular-nums",
              color === "teal" ? "text-teal-700" : "text-amber-700"
            )}
          >
            {progress}% 已完成
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              color === "teal" ? "bg-teal-600" : "bg-amber-700"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BottomNav({
  onBack,
  onNext,
  nextLabel,
  backLabel = "上一步",
  disabled,
  submitting,
  info,
  variant = "amber",
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  backLabel?: string;
  disabled?: boolean;
  submitting?: boolean;
  info?: string;
  variant?: "amber" | "teal";
}) {
  const activeColors =
    variant === "teal"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : "bg-amber-700 text-white hover:bg-amber-800";
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 w-full border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-4 sm:px-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBack();
          }}
          className="h-11 shrink-0 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 active:scale-95 transition-all"
        >
          {backLabel}
        </button>
        {info && (
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs text-slate-600 sm:text-sm">{info}</p>
          </div>
        )}
        <button
          type="button"
          disabled={disabled || submitting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNext();
          }}
          className={cn(
            "h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold transition-all active:scale-95",
            disabled || submitting
              ? "bg-slate-200 text-slate-400"
              : activeColors
          )}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
// ============== 以上组件从 SurveyPage 内部提取到外部 ==============

export default function SurveyPage() {
  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState("");
  const [gender, setGender] = useState("");
  const [learningAnswers, setLearningAnswers] = useState<Record<string, number>>({});
  const [stressAnswers, setStressAnswers] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<SurveyScores | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 稳定打乱：只在 mount 时打乱一次，之后永远不变；两个分池独立打乱，不交叉
  const shuffled = useMemo(() => shuffleQuestionIds(), []);
  // 学习力：60 道整池打乱后按 pageSize 分页，学生看不到维度
  const learningPages = useMemo(
    () => splitIntoPages(shuffled.learning, LEARNING_PAGE_SIZE),
    [shuffled.learning]
  );
  // 学业压力：30 道整池打乱后按 pageSize 分页，学生看不到维度
  const pressurePages = useMemo(
    () => splitIntoPages(shuffled.pressure, PRESSURE_PAGE_SIZE),
    [shuffled.pressure]
  );

  const [learningPageIndex, setLearningPageIndex] = useState(0);
  const [stressPageIndex, setStressPageIndex] = useState(0);

  const currentLearningPage = learningPages[learningPageIndex] ?? [];
  const currentPressurePage = pressurePages[stressPageIndex] ?? [];

  const handleLearningAnswer = useCallback(
    (questionId: number, value: number) => {
      setLearningAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
    },
    []
  );
  const handleStressAnswer = useCallback((questionId: number, value: number) => {
    setStressAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const answeredLearningCount = Object.keys(learningAnswers).length;
  const answeredStressCount = Object.keys(stressAnswers).length;
  const learningProgress = Math.round(
    (answeredLearningCount / TOTAL_LEARNING_QUESTIONS) * 100
  );
  const stressProgress = Math.round(
    (answeredStressCount / TOTAL_PRESSURE_QUESTIONS) * 100
  );

  const isLastLearningPage = learningPageIndex === learningPages.length - 1;
  const isLastStressPage = stressPageIndex === pressurePages.length - 1;

  const pageComplete = (pageIds: number[], ans: Record<string, number>) =>
    pageIds.every((id) => ans[String(id)] !== undefined);

  const handleSubmit = useCallback(
    async () => {
      setError("");
      if (answeredLearningCount < TOTAL_LEARNING_QUESTIONS) {
        setError(
          `还有 ${TOTAL_LEARNING_QUESTIONS - answeredLearningCount} 道学习力题目未作答`
        );
        setStep("learning");
        // 跳转到第一个未作答的页面
        const missing = learningPages.findIndex((p) =>
          p.some((id) => learningAnswers[String(id)] === undefined)
        );
        if (missing >= 0) setLearningPageIndex(missing);
        return;
      }
      if (answeredStressCount < TOTAL_PRESSURE_QUESTIONS) {
        setError(
          `还有 ${TOTAL_PRESSURE_QUESTIONS - answeredStressCount} 道学业压力题目未作答`
        );
        setStep("stress");
        const missing = pressurePages.findIndex((p) =>
          p.some((id) => stressAnswers[String(id)] === undefined)
        );
        if (missing >= 0) setStressPageIndex(missing);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            age: age ? parseInt(age, 10) : null,
            school,
            gender,
            learningAnswers,
            stressAnswers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "提交失败");
        setScores(data.scores);
        setStep("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败，请稍后重试");
      } finally {
        setSubmitting(false);
      }
    },
    [age, answeredLearningCount, answeredStressCount, gender, learningAnswers, name, school, stressAnswers, learningPages, pressurePages]
  );

  const handleNextLearningPage = useCallback(() => {
    const missing = currentLearningPage.find(
      (id) => learningAnswers[String(id)] === undefined
    );
    if (missing !== undefined) {
      return;
    }
    // 修复：只在翻页时滚动到顶部，不在答题时滚动
    window.scrollTo({ top: 0, left: 0 });
    if (learningPageIndex < learningPages.length - 1) {
      setLearningPageIndex((i) => i + 1);
    } else {
      setStep("stress-intro");
    }
  }, [currentLearningPage, learningAnswers, learningPageIndex, learningPages.length]);

  const handleNextStressPage = useCallback(() => {
    const missing = currentPressurePage.find(
      (id) => stressAnswers[String(id)] === undefined
    );
    if (missing !== undefined) {
      return;
    }
    window.scrollTo({ top: 0, left: 0 });
    if (stressPageIndex < pressurePages.length - 1) {
      setStressPageIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  }, [currentPressurePage, handleSubmit, stressAnswers, stressPageIndex, pressurePages.length]);

  const handleRestart = () => {
    setStep("landing");
    setName("");
    setAge("");
    setSchool("");
    setGender("");
    setLearningAnswers({});
    setStressAnswers({});
    setScores(null);
    setLearningPageIndex(0);
    setStressPageIndex(0);
    setError("");
  };

  // ======================== 各页面 ========================

  // ============ 临时：生成假的 scores 用于 PDF 调试 ============
  const getFakeScores = useCallback((): SurveyScores => {
    const average10: Record<string, number> = {};
    const percent: Record<string, number> = {};
    DIMENSIONS.forEach((d, i) => {
      const avg = 5 + (i % 4) * 1.2;
      average10[d] = Math.round(avg * 10) / 10;
      percent[d] = Math.round(avg * 10);
    });
    const pressure: Record<string, number> = {};
    PRESSURE_DIMENSIONS.forEach((d, i) => {
      pressure[d] = Math.round((2 + i * 0.5) * 10) / 10;
    });
    return {
      average10,
      percent,
      pressure,
      mindsetLabel: (average10["思维模式"] ?? 7) >= 5 ? "成长型思维" : "固定型思维",
    };
  }, []);

  // ============ 临时：直接下载 PDF 进行调试 ============
  const handleDebugDownload = async () => {
    try {
      const [{ default: html2canvas }, { default: jsPDF }, { PdfTemplate }] =
        await Promise.all([
          import("html2canvas"),
          import("jspdf"),
          import("@/components/survey/pdf-template"),
        ]);
      const scores = getFakeScores();
      // 离屏容器
      const container = document.createElement("div");
      container.style.cssText =
        "position:fixed;left:-10000px;top:0;width:794px;z-index:-1;opacity:0;pointer-events:none";
      document.body.appendChild(container);
      const root = createRoot(container);
      await new Promise<void>((resolve) => {
        root.render(<PdfTemplate name="测试用户" scores={scores} dateStr="2026-06-15" />);
        requestAnimationFrame(() => setTimeout(() => resolve(), 50));
      });
      const templateEl = container.querySelector('[data-pdf-template]');
      if (!templateEl) throw new Error("PDF 模板未找到");
      const canvas = await html2canvas(templateEl as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      root.unmount();
      document.body.removeChild(container);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
      });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const iw = pw;
      const ih = (canvas.height * iw) / canvas.width;
      let hl = ih;
      let pos = 0;
      pdf.addImage(imgData, "JPEG", 0, pos, iw, ih);
      hl -= ph;
      while (hl > 0) {
        pos = hl - ih;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, iw, ih);
        hl -= ph;
      }
      pdf.save("测试报告.pdf");
    } catch (err) {
      console.error("PDF 调试失败", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("PDF 测试失败：" + msg);
    }
  };

  if (step === "landing") {
    return (
      <PageLayout>
        <main className="mx-auto flex min-h-screen max-w-2xl w-full flex-col px-5 py-12 sm:px-8">
          <div className="rounded-[24px] bg-white p-6 shadow-[0_2px_12px_rgba(184,115,51,0.08)] sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-700" />
              学习力与学业压力测评
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              了解真实的学习状态
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              共两部分：
              <span className="font-semibold text-slate-800">学习力（{TOTAL_LEARNING_QUESTIONS} 题）</span>
              和
              <span className="font-semibold text-slate-800">学业压力（{TOTAL_PRESSURE_QUESTIONS} 题）</span>
              ，约需 10–15 分钟。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">第一部分 · 学习力</div>
                <div className="mt-1 text-xs opacity-90">1–10 分 · 完全不像我 → 完全像我</div>
              </div>
              <div className="rounded-xl bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
                <div className="font-semibold">第二部分 · 学业压力</div>
                <div className="mt-1 text-xs opacity-90">1–5 分 · 完全没有 → 几乎总是</div>
              </div>
            </div>
          </div>
          <div className="mt-auto space-y-3 pt-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStep("info");
              }}
              className="h-14 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800 active:scale-95 transition-all"
            >
              开始测评
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDebugDownload();
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 active:scale-95 transition-all"
            >
              测试 PDF 下载
            </button>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (step === "info") {
    const infoValid = name.trim().length > 0;
    return (
      <PageLayout>
        <main className="mx-auto flex min-h-screen max-w-2xl w-full flex-col px-5 py-12 sm:px-8">
          <div className="rounded-[24px] bg-white p-6 shadow-[0_2px_12px_rgba(184,115,51,0.08)] sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              填写基本信息
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              如实填写，信息仅用于生成个人报告
            </p>
            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">姓名</label>
                <IconInput
                  id="name"
                  icon={User}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的姓名"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="age" className="text-sm font-medium text-slate-700">年龄</label>
                  <IconInput
                    id="age"
                    icon={User}
                    type="number"
                    min={5}
                    max={99}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="请输入年龄"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="gender" className="text-sm font-medium text-slate-700">性别</label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-amber-700/70" />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500" />
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-amber-50/40 pl-10 pr-10 text-base text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                    >
                      <option value="">请选择性别</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="school" className="text-sm font-medium text-slate-700">学校名称</label>
                <IconInput
                  id="school"
                  icon={School}
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="请输入学校名称"
                />
              </div>
            </div>
          </div>
          <div className="mt-auto space-y-3 pt-10">
            <button
              type="button"
              disabled={!infoValid}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.scrollTo({ top: 0, left: 0 });
                setStep("learning");
              }}
              className={cn(
                "h-14 w-full rounded-2xl text-base font-semibold transition-all active:scale-95",
                infoValid ? "bg-amber-700 text-white hover:bg-amber-800" : "bg-slate-200 text-slate-400"
              )}
            >
              下一步，开始学习力测评
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.scrollTo({ top: 0, left: 0 });
                setStep("landing");
              }}
              className="h-12 w-full rounded-2xl border border-slate-200 text-slate-700"
            >
              返回
            </button>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (step === "result" && scores) {
    return (
      <PageLayout>
        <main className="w-full py-8">
          <ResultView name={name} scores={scores} onRestart={handleRestart} />
        </main>
      </PageLayout>
    );
  }

  if (step === "stress-intro") {
    return (
      <PageLayout>
        <main className="mx-auto flex min-h-screen max-w-2xl w-full flex-col px-5 py-12 sm:px-8">
          <div className="rounded-[24px] bg-white p-6 shadow-[0_2px_12px_rgba(14,116,144,0.08)] sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
              <span className="size-1.5 rounded-full bg-teal-600" />
              第二部分
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              学业压力测评
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              本部分共 <span className="font-semibold text-slate-800">{TOTAL_PRESSURE_QUESTIONS} 道题目</span>
              ，请如实反映你当前的状态，帮助我们了解你的压力来源。
            </p>
            <div className="mt-5 rounded-xl bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
              <div className="font-medium">评分标准</div>
              <div className="mt-2 space-y-1 text-xs opacity-90">
                <div>1 · 完全没有</div>
                <div>2 · 很少</div>
                <div>3 · 有时</div>
                <div>4 · 经常</div>
                <div>5 · 几乎总是</div>
              </div>
            </div>
          </div>
          <div className="mt-auto space-y-3 pt-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.scrollTo({ top: 0, left: 0 });
                setStep("stress");
              }}
              className="h-14 w-full rounded-2xl bg-teal-600 text-base font-semibold text-white hover:bg-teal-700 active:scale-95 transition-all"
            >
              开始学业压力测评
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.scrollTo({ top: 0, left: 0 });
                setLearningPageIndex(learningPages.length - 1);
                setStep("learning");
              }}
              className="h-12 w-full rounded-2xl border border-slate-200 text-slate-700"
            >
              返回学习力部分
            </button>
          </div>
        </main>
      </PageLayout>
    );
  }

  // ============ 学习力答题页 ============
  if (step === "learning") {
    return (
      <PageLayout>
        <TopProgress
          progress={learningProgress}
          title="学习力测评"
          current={learningPageIndex + 1}
          total={learningPages.length}
          color="amber"
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col space-y-4 px-4 py-6 pb-32 sm:px-6">
          {currentLearningPage.map((qid, idx) => {
            const q = LEARNING_QUESTION_BANK[qid];
            if (!q) return null;
            const globalNum = learningPageIndex * LEARNING_PAGE_SIZE + idx + 1;
            return (
              <QuestionCard
                key={qid}
                number={globalNum}
                text={q.text}
                value={learningAnswers[String(qid)]}
                onChange={(v) => handleLearningAnswer(qid, v)}
                scale={10}
                color="amber"
              />
            );
          })}
        </main>
        <BottomNav
          onBack={() => {
            window.scrollTo({ top: 0, left: 0 });
            if (learningPageIndex > 0) {
              setLearningPageIndex((i) => i - 1);
            } else {
              setStep("info");
            }
          }}
          onNext={handleNextLearningPage}
          nextLabel={isLastLearningPage ? "第二部份" : "下一页"}
          disabled={!pageComplete(currentLearningPage, learningAnswers)}
          submitting={submitting}
          variant={isLastLearningPage ? "teal" : "amber"}
          info={`本组已答 ${currentLearningPage.filter((id) => learningAnswers[String(id)] !== undefined).length}/${currentLearningPage.length} · 总计 ${answeredLearningCount}/${TOTAL_LEARNING_QUESTIONS}`}
        />
      </PageLayout>
    );
  }

  // ============ 学业压力答题页 ============
  return (
    <PageLayout>
      <TopProgress
        progress={stressProgress}
        title="学业压力测评"
        current={stressPageIndex + 1}
        total={pressurePages.length}
        color="teal"
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col space-y-4 px-4 py-6 pb-32 sm:px-6">
        {currentPressurePage.map((qid, idx) => {
          const q = PRESSURE_QUESTIONS.find((x) => x.id === qid);
          if (!q) return null;
          const globalNum = stressPageIndex * PRESSURE_PAGE_SIZE + idx + 1;
          return (
            <QuestionCard
              key={qid}
              number={globalNum}
              text={q.text}
              value={stressAnswers[String(qid)]}
              onChange={(v) => handleStressAnswer(qid, v)}
              scale={5}
              color="teal"
            />
          );
        })}
      </main>
      <BottomNav
        onBack={() => {
          window.scrollTo({ top: 0, left: 0 });
          if (stressPageIndex > 0) {
            setStressPageIndex((i) => i - 1);
          } else {
            setStep("stress-intro");
          }
        }}
        onNext={handleNextStressPage}
        nextLabel={isLastStressPage ? "提交" : "下一页"}
        disabled={!pageComplete(currentPressurePage, stressAnswers)}
        submitting={submitting}
        variant="teal"
        info={`本组已答 ${currentPressurePage.filter((id) => stressAnswers[String(id)] !== undefined).length}/${currentPressurePage.length} · 总计 ${answeredStressCount}/${TOTAL_PRESSURE_QUESTIONS}`}
      />
    </PageLayout>
  );
}
