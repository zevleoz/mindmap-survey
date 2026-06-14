"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, School, User, Users } from "lucide-react";

import { PageHeader } from "@/components/survey/page-header";
import { ResultView } from "@/components/survey/result-view";
import { ScoreButtons } from "@/components/survey/score-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getShuffledGroupQuestions,
  getShuffledPressureQuestions,
  LEARNING_QUESTION_BANK,
  PRESSURE_QUESTIONS,
  SURVEY_GROUPS,
  PRESSURE_GROUPS,
  TOTAL_LEARNING_QUESTIONS,
  TOTAL_PRESSURE_QUESTIONS,
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

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white">{children}</div>;
}

function Card({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-[20px] bg-white p-6 shadow-[0_2px_8px_rgba(184,115,51,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

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

function formatQuestionIndex(index: number) {
  return String(index + 1);
}

export default function SurveyPage() {
  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState("");
  const [gender, setGender] = useState("");
  const [learningAnswers, setLearningAnswers] = useState<Record<string, number>>({});
  const [stressAnswers, setStressAnswers] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<SurveyScores | null>(null);
  const [learningGroupIndex, setLearningGroupIndex] = useState(0);
  const [stressGroupIndex, setStressGroupIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // 每次切换 step 或 group 时自动滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, learningGroupIndex, stressGroupIndex]);

  // 每次高亮某题时滚动到它
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(highlightId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = window.setTimeout(() => setHighlightId(null), 2500);
      return () => window.clearTimeout(t);
    }
  }, [highlightId]);

  // 学习力题目（按 group 打乱）
  const shuffledLearningGroups = useMemo(
    () => SURVEY_GROUPS.map((_, i) => getShuffledGroupQuestions(i)),
    []
  );
  // 学业压力题目（按 group 打乱）
  const shuffledStressGroups = useMemo(
    () => PRESSURE_GROUPS.map((_, i) => getShuffledPressureQuestions(i)),
    []
  );

  const currentLearningQuestions = shuffledLearningGroups[learningGroupIndex] ?? [];
  const currentStressQuestions = shuffledStressGroups[stressGroupIndex] ?? [];

  const handleLearningAnswer = useCallback((questionId: number, value: number) => {
    setLearningAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);
  const handleStressAnswer = useCallback((questionId: number, value: number) => {
    setStressAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const isLearningGroupComplete = (gIdx: number) => {
    const qs = shuffledLearningGroups[gIdx] ?? [];
    return qs.every((id) => learningAnswers[String(id)] !== undefined);
  };
  const isStressGroupComplete = (gIdx: number) => {
    const qs = shuffledStressGroups[gIdx] ?? [];
    return qs.every((id) => stressAnswers[String(id)] !== undefined);
  };

  const isLastLearningGroup = learningGroupIndex === SURVEY_GROUPS.length - 1;
  const isLastStressGroup = stressGroupIndex === PRESSURE_GROUPS.length - 1;

  const handleSubmit = useCallback(
    async () => {
      setError("");

      const learningCount = Object.keys(learningAnswers).length;
      const stressCount = Object.keys(stressAnswers).length;

      if (learningCount < TOTAL_LEARNING_QUESTIONS) {
        const firstGroup = SURVEY_GROUPS.findIndex((group) =>
          group.questionIds.some(
            (id) => learningAnswers[String(id)] === undefined
          )
        );
        if (firstGroup >= 0) {
          setLearningGroupIndex(firstGroup);
          const missingId = SURVEY_GROUPS[firstGroup].questionIds.find(
            (id) => learningAnswers[String(id)] === undefined
          );
          if (missingId !== undefined) {
            setStep("learning");
            setTimeout(
              () => setHighlightId(`q-learning-${missingId}`),
              60
            );
          }
        }
        setError(
          `还有 ${TOTAL_LEARNING_QUESTIONS - learningCount} 道学习力题目未作答`
        );
        return;
      }

      if (stressCount < TOTAL_PRESSURE_QUESTIONS) {
        const firstGroup = PRESSURE_GROUPS.findIndex((group) =>
          group.questionIds.some(
            (id) => stressAnswers[String(id)] === undefined
          )
        );
        if (firstGroup >= 0) {
          setStressGroupIndex(firstGroup);
          const missingId = PRESSURE_GROUPS[firstGroup].questionIds.find(
            (id) => stressAnswers[String(id)] === undefined
          );
          if (missingId !== undefined) {
            setStep("stress");
            setTimeout(
              () => setHighlightId(`q-stress-${missingId}`),
              60
            );
          }
        }
        setError(
          `还有 ${TOTAL_PRESSURE_QUESTIONS - stressCount} 道学业压力题目未作答`
        );
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
    [age, gender, learningAnswers, name, school, stressAnswers]
  );

  const handleNextLearningGroup = useCallback(() => {
    const qs = shuffledLearningGroups[learningGroupIndex] ?? [];
    const firstMissing = qs.find(
      (id) => learningAnswers[String(id)] === undefined
    );
    if (firstMissing !== undefined) {
      setHighlightId(`q-learning-${firstMissing}`);
      return;
    }
    if (learningGroupIndex < SURVEY_GROUPS.length - 1) {
      setLearningGroupIndex((i) => i + 1);
    } else {
      setStep("stress-intro");
    }
  }, [learningAnswers, learningGroupIndex, shuffledLearningGroups]);

  const handleNextStressGroup = useCallback(() => {
    const qs = shuffledStressGroups[stressGroupIndex] ?? [];
    const firstMissing = qs.find(
      (id) => stressAnswers[String(id)] === undefined
    );
    if (firstMissing !== undefined) {
      setHighlightId(`q-stress-${firstMissing}`);
      return;
    }
    if (stressGroupIndex < PRESSURE_GROUPS.length - 1) {
      setStressGroupIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  }, [handleSubmit, shuffledStressGroups, stressAnswers, stressGroupIndex]);

  const handleRestart = () => {
    setStep("landing");
    setName("");
    setAge("");
    setSchool("");
    setGender("");
    setLearningAnswers({});
    setStressAnswers({});
    setScores(null);
    setLearningGroupIndex(0);
    setStressGroupIndex(0);
    setError("");
  };

  // ========================= 页面渲染 =========================

  if (step === "landing") {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-12">
          <PageHeader
            title="学习力与学业压力测评"
            subtitle="请根据最近一个月的真实情况作答。"
          />

          <Card className="mt-8 space-y-3">
            <p className="text-sm leading-relaxed text-slate-600">
              本测评共两部分：
              <span className="font-semibold text-slate-800"> 学习力（{TOTAL_LEARNING_QUESTIONS} 题）</span>
              和
              <span className="font-semibold text-slate-800"> 学业压力（{TOTAL_PRESSURE_QUESTIONS} 题）</span>
              ，约需 10–15 分钟。
            </p>
            <div className="rounded-xl bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
              <span className="font-medium">学习力：1–10 分</span>（完全不像我 → 完全像我）
              <br />
              <span className="font-medium">学业压力：1–5 分</span>（完全没有 → 几乎总是）
            </div>
          </Card>

          <div className="mt-auto space-y-3 pt-10">
            <Button
              className="h-14 w-full rounded-2xl bg-amber-700 text-base font-semibold hover:bg-amber-800"
              onClick={() => setStep("info")}
            >
              开始测评
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </main>
      </PageShell>
    );
  }

  if (step === "info") {
    const infoValid = name.trim().length > 0;
    return (
      <PageShell>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-12">
          <PageHeader
            title="填写基本信息"
            subtitle="请如实填写，信息仅用于生成个人报告"
          />

          <Card className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">姓名</Label>
              <IconInput
                id="name"
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入您的姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age" className="text-slate-700">年龄</Label>
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
              <Label htmlFor="school" className="text-slate-700">学校名称</Label>
              <IconInput
                id="school"
                icon={School}
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="请输入学校名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-slate-700">性别</Label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-amber-700/70" />
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-amber-50/40 pl-10 pr-4 text-base text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
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
          </Card>

          <div className="mt-auto space-y-3 pt-10">
            <Button
              className="h-14 w-full rounded-2xl bg-amber-700 text-base font-semibold hover:bg-amber-800"
              disabled={!infoValid}
              onClick={() => setStep("learning")}
            >
              下一步，开始学习力测评
              <ArrowRight className="size-5" />
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl border-slate-200"
              onClick={() => setStep("landing")}
            >
              <ChevronLeft className="size-4" />
              返回
            </Button>
          </div>
        </main>
      </PageShell>
    );
  }

  if (step === "result" && scores) {
    return (
      <PageShell>
        <main className="px-5 py-10">
          <PageHeader
            title="测评报告"
            subtitle="您的学习力与学业压力多维分析结果"
            className="mb-8"
          />
          <ResultView
            name={name}
            scores={scores}
            onRestart={handleRestart}
          />
        </main>
      </PageShell>
    );
  }

  if (step === "stress-intro") {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-12">
          <PageHeader
            title="学业压力测评"
            subtitle="请根据最近一个月的真实情况，选择最符合你的选项。"
          />

          <Card className="mt-8 space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              本部分共 <span className="font-semibold text-slate-800">{TOTAL_PRESSURE_QUESTIONS} 道题目</span>
              ，请如实反映你当前的状态，帮助我们了解你的压力来源。
            </p>
            <div className="rounded-xl bg-violet-50/70 px-4 py-3 text-sm text-violet-900">
              <div className="font-medium mb-1">评分标准</div>
              <ul className="grid grid-cols-1 gap-1">
                <li>1 = 完全没有</li>
                <li>2 = 很少</li>
                <li>3 = 有时</li>
                <li>4 = 经常</li>
                <li>5 = 几乎总是</li>
              </ul>
            </div>
          </Card>

          <div className="mt-auto space-y-3 pt-10">
            <Button
              className="h-14 w-full rounded-2xl bg-amber-700 text-base font-semibold hover:bg-amber-800"
              onClick={() => setStep("stress")}
            >
              开始学业压力测评
              <ArrowRight className="size-5" />
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl border-slate-200"
              onClick={() => {
                setLearningGroupIndex(SURVEY_GROUPS.length - 1);
                setStep("learning");
              }}
            >
              <ChevronLeft className="size-4" />
              返回学习力部分
            </Button>
          </div>
        </main>
      </PageShell>
    );
  }

  // ========================= 学习力 / 学业压力答题页 =========================
  const isLearningMode = step === "learning";

  const currentQuestions = isLearningMode
    ? currentLearningQuestions
    : currentStressQuestions;
  const currentGroupIndex = isLearningMode
    ? learningGroupIndex
    : stressGroupIndex;
  const totalGroups = isLearningMode
    ? SURVEY_GROUPS.length
    : PRESSURE_GROUPS.length;
  const totalQuestions = isLearningMode
    ? TOTAL_LEARNING_QUESTIONS
    : TOTAL_PRESSURE_QUESTIONS;
  const answeredCount = isLearningMode
    ? Object.keys(learningAnswers).length
    : Object.keys(stressAnswers).length;
  const groupTitle = isLearningMode
    ? SURVEY_GROUPS[currentGroupIndex].title
    : PRESSURE_GROUPS[currentGroupIndex].title;

  const totalInGroup = currentQuestions.length;
  const answeredInGroup = currentQuestions.filter(
    (id) =>
      (isLearningMode ? learningAnswers : stressAnswers)[String(id)] !==
      undefined
  ).length;
  const unansweredInGroup = totalInGroup - answeredInGroup;

  const isLastGroup = isLearningMode
    ? isLastLearningGroup
    : isLastStressGroup;
  const groupComplete = unansweredInGroup === 0;

  // 每组的进度百分比（整体）
  const overallProgress = Math.round((answeredCount / totalQuestions) * 100);

  // 进度颜色（根据类型）
  const progressBarColor = isLearningMode
    ? "bg-amber-700"
    : "bg-violet-500";

  return (
    <PageShell>
      {/* 顶部固定进度栏 */}
      <div className="sticky top-0 z-20 border-b border-slate-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-5 py-4">
          <div className="mb-2.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              第 {currentGroupIndex + 1} / {totalGroups} 部分
              <span className="ml-1.5 text-slate-400">· {groupTitle}</span>
            </span>
            <span
              className={cn(
                "font-medium tabular-nums",
                isLearningMode ? "text-amber-700" : "text-violet-600"
              )}
            >
              {overallProgress}% 已完成
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                progressBarColor
              )}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>
              {isLearningMode ? "学习力测评" : "学业压力测评"} · 本组已答{" "}
              {answeredInGroup}/{totalInGroup}
            </span>
            <span>
              已答 {answeredCount}/{totalQuestions} 题
            </span>
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <main className="mx-auto max-w-lg space-y-4 px-5 py-6 pb-36">
        {currentQuestions.map((questionId, idx) => {
          const question = isLearningMode
            ? LEARNING_QUESTION_BANK[questionId]
            : PRESSURE_QUESTIONS.find((q) => q.id === questionId);
          if (!question) return null;
          const id = isLearningMode
            ? `q-learning-${questionId}`
            : `q-stress-${questionId}`;
          const isHighlighted = highlightId === id;
          const currentAnswers = isLearningMode
            ? learningAnswers
            : stressAnswers;
          return (
            <Card
              key={id}
              id={id}
              className={cn(
                "transition-all duration-300",
                isHighlighted &&
                  "ring-2 ring-amber-500 ring-offset-2 ring-offset-white scale-[1.01]"
              )}
            >
              <div className="flex gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                    isLearningMode ? "bg-amber-700" : "bg-violet-500"
                  )}
                >
                  {formatQuestionIndex(idx)}
                </span>
                <div className="min-w-0 flex-1 space-y-4">
                  <p className="text-base font-medium leading-relaxed text-slate-800">
                    {question.text}
                  </p>
                  <ScoreButtons
                    value={currentAnswers[String(questionId)]}
                    onChange={(v) =>
                      isLearningMode
                        ? handleLearningAnswer(questionId, v)
                        : handleStressAnswer(questionId, v)
                    }
                    scale={isLearningMode ? 10 : 5}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </main>

      {/* 底部固定操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Button
            variant="outline"
            className="h-11 shrink-0 rounded-2xl border-slate-200 px-4"
            onClick={() => {
              if (isLearningMode) {
                if (learningGroupIndex > 0) {
                  setLearningGroupIndex((i) => i - 1);
                } else {
                  setStep("info");
                }
              } else {
                if (stressGroupIndex > 0) {
                  setStressGroupIndex((i) => i - 1);
                } else {
                  setStep("stress-intro");
                }
              }
            }}
          >
            <ChevronLeft className="size-4" />
            上一步
          </Button>

          <div className="min-w-0 flex-1 text-center">
            {unansweredInGroup > 0 ? (
              <p className="truncate text-xs text-amber-700 sm:text-sm">
                还有 {unansweredInGroup} 题未作答
              </p>
            ) : (
              <p className="truncate text-xs text-emerald-600 sm:text-sm">
                本部分已完成
              </p>
            )}
            <p className="text-[10px] text-slate-400 sm:text-xs">
              共 {totalQuestions} 题 · 已答 {answeredCount} 题
            </p>
          </div>

          <Button
            className={cn(
              "h-11 shrink-0 rounded-2xl px-4 font-semibold",
              !isLearningMode
                ? groupComplete
                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                  : "bg-slate-200 text-slate-400 hover:bg-slate-200"
                : groupComplete
                  ? "bg-amber-700 hover:bg-amber-800 text-white"
                  : "bg-slate-200 text-slate-400 hover:bg-slate-200"
            )}
            disabled={!groupComplete || submitting}
            onClick={
              isLearningMode ? handleNextLearningGroup : handleNextStressGroup
            }
          >
            {submitting
              ? "提交中..."
              : isLastGroup
                ? isLearningMode
                  ? "下一部分"
                  : "提交"
                : "下一部分"}
            {!submitting && !isLastGroup && <ArrowRight className="size-4" />}
          </Button>
        </div>
        {error && (
          <p className="pb-3 text-center text-sm text-rose-500">{error}</p>
        )}
      </div>
    </PageShell>
  );
}
