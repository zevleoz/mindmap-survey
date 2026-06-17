"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, School, User, Users } from "lucide-react";

import type { SurveyScores } from "@/lib/survey-data";
import {
  LEARNING_QUESTION_BANK,
  PRESSURE_QUESTIONS,
  TOTAL_LEARNING_QUESTIONS,
  TOTAL_PRESSURE_QUESTIONS,
  shuffleQuestionIds,
} from "@/lib/survey-data";
import { cn } from "@/lib/utils";

type Step =
  | "landing"
  | "info"
  | "learning"
  | "stress-intro"
  | "stress"
  | "submitted"
  | "result";

type NetStatus = "online" | "slow" | "offline";

const GENDER_OPTIONS = ["男", "女", "其他", "不愿透露"];

// 每页 6 道题：60 道学习力 = 10 页；30 道压力 = 5 页
const LEARNING_PAGE_SIZE = 6;
const PRESSURE_PAGE_SIZE = 6;

// localStorage key 常量
const LS_ANSWERS = "p4learning_survey_answers";
const LS_STUDENT = "p4learning_survey_student";
const LS_PENDING = "p4learning_pending_submissions";

interface PersistedAnswers {
  step: Step;
  learningPageIndex: number;
  stressPageIndex: number;
  learningAnswers: Record<string, number>;
  stressAnswers: Record<string, number>;
  name: string;
  age: string;
  school: string;
  gender: string;
  savedAt: number;
  version: number;
}

const PERSIST_VERSION = 1;

// ------------------------- 本地存储工具 -------------------------
function loadPersisted(): PersistedAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_ANSWERS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAnswers;
    if (parsed && typeof parsed === "object" && parsed.version === PERSIST_VERSION) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function savePersisted(p: PersistedAnswers) {
  try {
    window.localStorage.setItem(LS_ANSWERS, JSON.stringify(p));
  } catch {
    // 忽略存储异常（隐私模式/配额）
  }
}

function clearPersisted() {
  try {
    window.localStorage.removeItem(LS_ANSWERS);
    window.localStorage.removeItem(LS_STUDENT);
  } catch {
    // ignore
  }
}

function loadStudentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_STUDENT);
  } catch {
    return null;
  }
}

function saveStudentId(id: string) {
  try {
    window.localStorage.setItem(LS_STUDENT, id);
  } catch {
    // ignore
  }
}

function loadPending(): Array<{
  timestamp: number;
  payload: Record<string, unknown>;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_PENDING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function pushPending(item: { timestamp: number; payload: Record<string, unknown> }) {
  try {
    const list = loadPending();
    list.push(item);
    window.localStorage.setItem(LS_PENDING, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function removePending(timestamp: number) {
  try {
    const list = loadPending().filter((x) => x.timestamp !== timestamp);
    window.localStorage.setItem(LS_PENDING, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// ------------------------- 带超时的 fetch -------------------------
async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = 10_000
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      controller.abort();
      reject(new Error("timeout"));
    }, timeoutMs);
    fetch(input, { ...init, signal: controller.signal })
      .then((res) => {
        window.clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

// 带重试的 POST（2s / 4s / 8s），最多 3 次
async function postWithRetry(
  url: string,
  body: Record<string, unknown>,
  onProgress?: (attempt: number) => void
): Promise<{ data: Record<string, unknown>; response: Response }> {
  const delays = [2000, 4000, 8000];
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0 && onProgress) onProgress(attempt);
    try {
      const res = await fetchWithTimeout(
        url,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        10_000
      );
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }
      if (res.ok) return { data, response: res };
      lastErr = data?.error || `提交失败（${res.status}）`;
    } catch (err) {
      lastErr = err;
    }
    if (attempt < delays.length) {
      await new Promise((r) => window.setTimeout(r, delays[attempt]));
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "提交失败，请稍后重试");
  throw new Error(msg);
}

// ------------------------- 网络状态 Hook -------------------------
function useNetStatus(): NetStatus {
  const [status, setStatus] = useState<NetStatus>(() => {
    if (typeof navigator === "undefined") return "online";
    return navigator.onLine ? "online" : "offline";
  });

  useEffect(() => {
    const goOnline = () => setStatus("online");
    const goOffline = () => setStatus("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return status;
}

// ------------------------- UI 小组件 -------------------------
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

function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20",
        className ?? ""
      )}
    />
  );
}

function PageLayout({
  children,
  error,
  onCloseError,
}: {
  children: React.ReactNode;
  error?: string | null;
  onCloseError?: () => void;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-[#FBF7F0] to-white">
      {error ? (
        <div className="sticky top-0 z-30 w-full bg-rose-50 border-b border-rose-200">
          <div className="mx-auto max-w-3xl flex items-start justify-between gap-3 px-5 py-3 sm:px-8">
            <p className="text-sm text-rose-700 leading-snug">{error}</p>
            {onCloseError ? (
              <button
                type="button"
                onClick={onCloseError}
                className="text-rose-500 hover:text-rose-700 text-xs font-medium whitespace-nowrap shrink-0"
                aria-label="关闭错误提示"
              >
                关闭
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 select-none"
        style={{
          backgroundImage: "url('/branding/watermark.jpg')",
          backgroundSize: "280px 280px",
          backgroundRepeat: "repeat",
          backgroundPosition: "0 0",
          opacity: 0.08,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function QuestionCard({
  number,
  text,
  en,
  value,
  onChange,
  scale,
  color,
}: {
  number: number;
  text: string;
  en?: string;
  value?: number;
  onChange: (v: number) => void;
  scale: 10 | 5;
  color: "amber" | "teal";
}) {
  const leftLabel = scale === 5 ? "完全没有" : "完全不像我";
  const rightLabel = scale === 5 ? "几乎总是" : "完全像我";

  // 防快速连点：150ms 防抖
  const lastClickRef = useRef(0);
  const handleClick = useCallback(
    (v: number) => {
      const now = Date.now();
      if (now - lastClickRef.current < 150) return;
      lastClickRef.current = now;
      onChange(v);
    },
    [onChange]
  );

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
            color === "teal" ? "bg-teal-600" : "bg-amber-700"
          )}
        >
          {number}
        </div>
        <div>
          <p className="text-base font-medium leading-relaxed text-slate-800">{text}</p>
          {en ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-400 break-words">{en}</p>
          ) : null}
        </div>
      </div>

      <div className="flex w-full justify-between gap-1 sm:gap-2">
        {(scale === 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleClick(num)}
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
        ))}
      </div>

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
  netStatus,
  offlineRetry,
}: {
  progress: number;
  title: string;
  current: number;
  total: number;
  color: "amber" | "teal";
  netStatus: NetStatus;
  offlineRetry?: () => void;
}) {
  const dotColor =
    netStatus === "online"
      ? "bg-emerald-500"
      : netStatus === "slow"
      ? "bg-amber-500"
      : "bg-rose-500";
  return (
    <div className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="min-w-0 flex items-center gap-2">
            <span
              title={
                netStatus === "online"
                  ? "网络正常"
                  : netStatus === "slow"
                  ? "网络较慢"
                  : "网络已断开"
              }
              className={cn(
                "inline-block h-2 w-2 shrink-0 rounded-full opacity-80",
                dotColor
              )}
            />
            <span className="min-w-0 truncate text-slate-700 font-medium">
              第 {current} / {total} 部分 · {title}
            </span>
          </div>
          <span
            className={cn(
              "tabular-nums font-medium",
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
        {netStatus === "offline" && offlineRetry ? (
          <button
            type="button"
            onClick={offlineRetry}
            className="mt-2 text-xs text-rose-700 underline underline-offset-2"
          >
            网络已断开：点击手动重试未提交的数据
          </button>
        ) : null}
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
  const buttonText = submitting
    ? "正在提交，请稍候…"
    : disabled
    ? "请先完成本组题目"
    : nextLabel;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 w-full border-t border-slate-200 bg-white/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
        {info && (
          <p className="mb-2 truncate text-center text-xs text-slate-500 sm:text-sm">{info}</p>
        )}
        <div className="flex items-center gap-3">
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
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNext();
            }}
            className={cn(
              "h-11 shrink-0 flex-1 rounded-2xl px-4 text-sm font-semibold transition-all active:scale-95",
              disabled || submitting
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : activeColors
            )}
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                {buttonText}
              </span>
            ) : (
              buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------- 主组件 -------------------------
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
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ timestamp: number } | null>(null);
  const [submittedOverlay, setSubmittedOverlay] = useState<{
    message: string;
    retry?: boolean;
    offline?: boolean;
  } | null>(null);

  const netStatus = useNetStatus();

  // 提交按钮点击锁（避免狂点）
  const submitLockRef = useRef(false);

  // 首次挂载：拉取 localStorage，并检查是否有恢复场景/未提交队列
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loaded = loadPersisted();
    const sid = loadStudentId();
    if (sid) setStudentId(sid);

    if (loaded) {
      // 有未完成的作答：填入答案与基本信息，跳转到对应步骤
      setName(loaded.name ?? "");
      setAge(loaded.age ?? "");
      setSchool(loaded.school ?? "");
      setGender(loaded.gender ?? "");
      setLearningAnswers(loaded.learningAnswers ?? {});
      setStressAnswers(loaded.stressAnswers ?? {});
      // 恢复分页：默认从 info 开始；若 learning/stress 有作答则恢复到对应页
      if (typeof loaded.learningPageIndex === "number") {
        setLearningPageIndex(loaded.learningPageIndex);
      }
      if (typeof loaded.stressPageIndex === "number") {
        setStressPageIndex(loaded.stressPageIndex);
      }
      setResumePrompt({ timestamp: loaded.savedAt });
    }

    // 启动离线队列静默重试
    void flushPending();
  }, []);

  // URL 参数解锁报告
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token");
      if (token) {
        setUnlockLoading(true);
        fetch(`/api/responses/${encodeURIComponent(token)}?token=${encodeURIComponent(token)}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "加载失败");
            return res.json();
          })
          .then((data) => {
            if (data && data.scores) {
              setScores(data.scores);
              if (typeof data.name === "string") setName(data.name);
              setResponseId(data.id || token);
              setUnlocked(true);
              setStep("result");
            }
          })
          .catch((e) => {
            setSubmitError(e instanceof Error ? e.message : "加载失败");
          })
          .finally(() => setUnlockLoading(false));
      }
    } catch {
      // ignore
    }
  }, []);

  // visibility 变化：立即保存
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        persistCurrent({ skipDebounce: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, age, school, gender, step, learningAnswers, stressAnswers]);

  // beforeunload 提示（仅在有未提交作答时）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasWork =
      Object.keys(learningAnswers).length > 0 ||
      Object.keys(stressAnswers).length > 0 ||
      name.trim().length > 0;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasWork) return;
      // 触发浏览器原生离开提示
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [learningAnswers, stressAnswers, name]);

  // 稳定打乱：只在 mount 时打乱一次
  const shuffled = useMemo(() => shuffleQuestionIds(), []);
  const learningPages = useMemo(
    () => splitIntoPages(shuffled.learning, LEARNING_PAGE_SIZE),
    [shuffled.learning]
  );
  const pressurePages = useMemo(
    () => splitIntoPages(shuffled.pressure, PRESSURE_PAGE_SIZE),
    [shuffled.pressure]
  );

  const [learningPageIndex, setLearningPageIndex] = useState(0);
  const [stressPageIndex, setStressPageIndex] = useState(0);

  // 当前页的题号列表（放在这里以便 handleNextLearningPage 等能正确引用）
  const currentLearningPage = learningPages[learningPageIndex] ?? [];
  const currentPressurePage = pressurePages[stressPageIndex] ?? [];
  const answeredLearningCount = Object.keys(learningAnswers).length;
  const answeredStressCount = Object.keys(stressAnswers).length;
  const learningProgress = Math.round(
    (answeredLearningCount / TOTAL_LEARNING_QUESTIONS) * 100
  );
  const stressProgress = Math.round(
    (answeredStressCount / TOTAL_PRESSURE_QUESTIONS) * 100
  );
  const pageComplete = (pageIds: number[], ans: Record<string, number>) =>
    pageIds.every((id) => ans[String(id)] !== undefined);

  // 防抖保存：500ms 后写入 localStorage
  const debounceRef = useRef<number | null>(null);
  const persistCurrent = useCallback(
    (opts?: { skipDebounce?: boolean }) => {
      const payload: PersistedAnswers = {
        step,
        learningPageIndex,
        stressPageIndex,
        learningAnswers,
        stressAnswers,
        name,
        age,
        school,
        gender,
        savedAt: Date.now(),
        version: PERSIST_VERSION,
      };
      const write = () => savePersisted(payload);
      if (opts?.skipDebounce) {
        write();
        return;
      }
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(write, 500);
    },
    [step, learningPageIndex, stressPageIndex, learningAnswers, stressAnswers, name, age, school, gender]
  );

  // 每当状态变化时触发保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === "landing" || step === "result" || step === "submitted") return;
    persistCurrent();
  }, [persistCurrent, step]);

  // 基本信息提交时：校验 + 静默创建 student + 保存
  const handleConfirmInfo = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setSubmitError("请填写姓名");
      return;
    }
    if (age) {
      const n = Number(age);
      if (!Number.isFinite(n) || n < 1 || n > 50) {
        setSubmitError("请检查年龄");
        return;
      }
    }
    setSubmitError("");
    persistCurrent({ skipDebounce: true });

    // 静默创建 student（即使失败也不阻塞）
    (async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetchWithTimeout(
          "/api/students",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmed,
              age: age ? Number(age) : null,
              school: school.trim() || null,
              gender: gender || null,
            }),
          },
          8000
        );
        if (res.ok) {
          const data = (await res.json()) as { id?: string };
          if (data?.id) {
            setStudentId(data.id);
            saveStudentId(data.id);
          }
        }
      } catch (err) {
        console.warn("[survey] student create failed, will retry on submit", err);
        if (!studentId) {
          const temp = "temp-" + Date.now().toString(36);
          setStudentId(temp);
          saveStudentId(temp);
        }
      }
    })();

    setStep("learning");
    window.scrollTo({ top: 0, left: 0 });
  }, [name, age, school, gender, persistCurrent, studentId]);

  const handleLearningAnswer = useCallback((questionId: number, value: number) => {
    setLearningAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);
  const handleStressAnswer = useCallback((questionId: number, value: number) => {
    setStressAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
    }, []);

  // 静默 PATCH auto-save（失败不打扰用户）
  const autoSavePage = useCallback(
    async (section: "learning" | "stress", pageIdx: number) => {
      if (!navigator.onLine) return;
      if (!studentId) return;
      try {
        const pageIds = section === "learning" ? learningPages[pageIdx] : pressurePages[pageIdx];
        if (!pageIds) return;
        const ans = section === "learning" ? learningAnswers : stressAnswers;
        const pageAnswers: Record<string, number> = {};
        for (const id of pageIds) {
          if (ans[String(id)] !== undefined) pageAnswers[String(id)] = ans[String(id)];
        }
        const body: Record<string, unknown> = {
          studentId,
          studentInfo: {
            name: name.trim(),
            age: age ? Number(age) : null,
            school: school.trim() || null,
            gender: gender || null,
          },
          pageIndex: pageIdx,
          section,
        };
        if (section === "learning") body.learningAnswers = pageAnswers;
        else body.pressureAnswers = pageAnswers;

        const started = Date.now();
        const res = await fetchWithTimeout(
          "/api/responses",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          12_000
        );
        const elapsed = Date.now() - started;
        // 响应过慢（>3s）标记为 slow，用于 UI 的状态指示
        if (elapsed > 3000) console.info("[survey] slow save", elapsed, "ms");
        if (!res.ok) throw new Error("auto-save non-2xx: " + res.status);
      } catch (err) {
        console.warn("[survey] auto-save skipped:", err);
      }
    },
    [studentId, learningPages, pressurePages, learningAnswers, stressAnswers, name, age, school, gender]
  );

  const handleNextLearningPage = useCallback(() => {
    const missing = currentLearningPage.find(
      (id) => learningAnswers[String(id)] === undefined
    );
    if (missing !== undefined) return;
    const idx = learningPageIndex;
    window.scrollTo({ top: 0, left: 0 });
    void autoSavePage("learning", idx);
    if (learningPageIndex < learningPages.length - 1) {
      setLearningPageIndex((i) => i + 1);
    } else {
      setStep("stress-intro");
    }
  }, [autoSavePage, currentLearningPage, learningAnswers, learningPageIndex, learningPages.length]);

  const handleNextStressPage = useCallback(() => {
    const missing = currentPressurePage.find(
      (id) => stressAnswers[String(id)] === undefined
    );
    if (missing !== undefined) return;
    const idx = stressPageIndex;
    window.scrollTo({ top: 0, left: 0 });
    void autoSavePage("stress", idx);
    if (stressPageIndex < pressurePages.length - 1) {
      setStressPageIndex((i) => i + 1);
    } else {
      void handleSubmit();
    }
  }, [autoSavePage, currentPressurePage, stressAnswers, stressPageIndex, pressurePages.length]);

  const handleRestart = useCallback(() => {
    clearPersisted();
    setStep("landing");
    setName("");
    setAge("");
    setSchool("");
    setGender("");
    setLearningAnswers({});
    setStressAnswers({});
    setScores(null);
    setStudentId(null);
    setLearningPageIndex(0);
    setStressPageIndex(0);
    setSubmitError("");
    setSubmitAttempt(0);
    setSubmittedOverlay(null);
    setResumePrompt(null);
  }, []);

  // ------------------------- 提交（三重保险） -------------------------
  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    setSubmitAttempt(0);

    const finalStudentInfo = {
      name: name.trim() || "未填写",
      age: age ? Number(age) : null,
      school: school.trim() || null,
      gender: gender || null,
    };

    try {
      if (!navigator.onLine) {
        // 离线：推入离线队列
        const ts = Date.now();
        pushPending({
          timestamp: ts,
          payload: {
            studentId: studentId || ("temp-" + ts.toString(36)),
            ...finalStudentInfo,
            learningAnswers,
            pressureAnswers: stressAnswers,
            fromPending: true,
          },
        });
        persistCurrent({ skipDebounce: true });
        setSubmittedOverlay({
          message:
            "网络已断开。你的答案已自动保存在本机，网络恢复后会静默重新提交。你也可以稍后再次打开本页提交。",
          offline: true,
          retry: true,
        });
        return;
      }

      let usedStudentId = studentId;
      if (!usedStudentId) {
        usedStudentId = "temp-" + Date.now().toString(36);
        setStudentId(usedStudentId);
        saveStudentId(usedStudentId);
      }

      const payload: Record<string, unknown> = {
        studentId: usedStudentId,
        ...finalStudentInfo,
        learningAnswers,
        pressureAnswers: stressAnswers,
      };

      const { data } = await postWithRetry("/api/responses", payload, (attempt) =>
        setSubmitAttempt(attempt)
      );

      // 成功：回写 studentId/responseId，并清空 pending 里同一份（若有）
      if (typeof data?.studentId === "string") {
        setStudentId(data.studentId);
        saveStudentId(data.studentId);
      }
      if (typeof data?.id === "string") setResponseId(data.id);
      if (data?.scores) setScores(data.scores as SurveyScores);

      // 清理本地保存
      clearPersisted();
      setSubmittedOverlay(null);
      setStep("submitted");
      window.scrollTo({ top: 0, left: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "提交失败，请稍后重试";
      // 推入离线队列
      const ts = Date.now();
      pushPending({
        timestamp: ts,
        payload: {
          studentId: studentId || ("temp-" + ts.toString(36)),
          ...finalStudentInfo,
          learningAnswers,
          pressureAnswers: stressAnswers,
          fromPending: true,
          error: msg,
        },
      });
      persistCurrent({ skipDebounce: true });
      setSubmittedOverlay({
        message: `${msg}。答案已保存在本机，将在网络恢复后自动重试。你也可以点击下方按钮手动重试。`,
        retry: true,
      });
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }, [studentId, name, age, school, gender, learningAnswers, stressAnswers]);

  // 离线队列静默刷新
  const flushPending = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    const list = loadPending();
    if (list.length === 0) return;
    for (const item of list) {
      try {
        const res = await fetchWithTimeout(
          "/api/responses",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          },
          12_000
        );
        if (res.ok) {
          removePending(item.timestamp);
          console.info("[survey] pending submitted", item.timestamp);
        } else {
          console.warn("[survey] pending failed", res.status);
          // 这一个失败就暂停本轮刷新，避免连续失败
          break;
        }
      } catch (err) {
        console.warn("[survey] pending failed", err);
        break;
      }
    }
  }, []);

  // 每隔 30 秒检查一次离线队列；网络回到 online 时也触发
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (netStatus === "online") void flushPending();
  }, [netStatus, flushPending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = window.setInterval(() => void flushPending(), 30_000);
    return () => window.clearInterval(interval);
  }, [flushPending]);

  // ------------------------- 渲染分支 -------------------------
  if (unlockLoading) {
    return (
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-5 py-12 sm:px-8">
          <div className="text-sm text-slate-500">正在加载报告…</div>
        </main>
      </PageLayout>
    );
  }

  // 首次打开/恢复确认弹窗
  if (resumePrompt) {
    return (
      <PageLayout>
        <main className="mx-auto flex min-h-screen max-w-2xl w-full flex-col items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(184,115,51,0.08)] sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900">检测到未完成的测评</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              你之前的答题内容已自动保存（保存时间：
              {new Date(resumePrompt.timestamp).toLocaleString()}）。是否继续上次答题，还是从新开始？
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setResumePrompt(null);
                  setSubmitError("");
                  // 跳转到合适的 step
                  if (Object.keys(stressAnswers).length > 0) {
                    setStep("stress");
                  } else if (Object.keys(learningAnswers).length > 0) {
                    setStep("learning");
                  } else {
                    setStep("info");
                  }
                  window.scrollTo({ top: 0, left: 0 });
                }}
                className="h-12 rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800 active:scale-95 transition-all"
              >
                继续答题
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPersisted();
                  setName("");
                  setAge("");
                  setSchool("");
                  setGender("");
                  setLearningAnswers({});
                  setStressAnswers({});
                  setStudentId(null);
                  setLearningPageIndex(0);
                  setStressPageIndex(0);
                  setResumePrompt(null);
                  setStep("info");
                  window.scrollTo({ top: 0, left: 0 });
                }}
                className="h-12 rounded-2xl border border-slate-200 text-slate-700 text-base font-medium hover:border-slate-300 transition-all"
              >
                重新开始
              </button>
            </div>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (step === "landing") {
    return (
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
        <main className="mx-auto flex min-h-screen max-w-2xl w-full flex-col px-5 py-10 sm:px-8">
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
              <span className="font-semibold text-slate-800">
                学习力（{TOTAL_LEARNING_QUESTIONS} 题）
              </span>
              和
              <span className="font-semibold text-slate-800">
                学业压力（{TOTAL_PRESSURE_QUESTIONS} 题）
              </span>
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

          <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
            <img
              src="/branding/logo_color.png"
              alt="凭远教育"
              className="h-32 w-32 max-h-[30vh] max-w-[30vh] object-contain sm:h-44 sm:w-44 md:h-48 md:w-48 lg:h-56 lg:w-56"
            />
          </div>

          <div className="mt-auto space-y-3">
            <button
              type="button"
              onClick={() => {
                setSubmitError("");
                setStep("info");
              }}
              className="h-14 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800 active:scale-95 transition-all"
            >
              开始测评
            </button>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (step === "info") {
    const infoValid = name.trim().length > 0;
    return (
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
        <main className="mx-auto flex min-h-screen max-w-2xl w-full flex-col px-5 py-12 sm:px-8">
          <div className="rounded-[24px] bg-white p-6 shadow-[0_2px_12px_rgba(184,115,51,0.08)] sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">填写基本信息</h2>
            <p className="mt-1 text-sm text-slate-500">如实填写，信息仅用于生成个人报告</p>
            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">
                  姓名
                </label>
                <IconInput
                  id="name"
                  icon={User}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的姓名"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="age" className="text-sm font-medium text-slate-700">
                    年龄
                  </label>
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
                  <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                    性别
                  </label>
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
                <label htmlFor="school" className="text-sm font-medium text-slate-700">
                  学校名称
                </label>
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
              disabled={!infoValid || submitting}
              onClick={() => handleConfirmInfo()}
              className={cn(
                "h-14 w-full rounded-2xl text-base font-semibold transition-all active:scale-95",
                infoValid && !submitting
                  ? "bg-amber-700 text-white hover:bg-amber-800"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              下一步，开始学习力测评
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitError("");
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

  if (step === "submitted") {
    return (
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full rounded-[24px] bg-white p-8 text-center shadow-[0_2px_12px_rgba(184,115,51,0.08)] sm:p-12">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-amber-50 sm:size-28">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B45309"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-12 sm:size-14"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              测评完成！
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              你的学习力测评报告已生成。
            </p>
            <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-amber-100 bg-amber-50/60 p-5 text-base leading-relaxed text-amber-900 sm:p-6">
              请联系你的凭远教育顾问解锁完整报告。
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12">
              <img
                src="/branding/logo_color.png"
                alt="凭远教育"
                className="h-14 w-auto object-contain sm:h-16"
              />
            </div>

            <div className="mx-auto mt-10 max-w-md sm:mt-12">
              <button
                type="button"
                onClick={() => handleRestart()}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white text-base font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow active:scale-[0.98] sm:h-16"
              >
                重新测评
              </button>
            </div>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (step === "result" && scores && unlocked) {
    return (
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
        <main className="w-full py-8">
          {/* 报告视图：此处保持与先前一致的简单结构（外部提供）。若你需要保留原 result-view，已在外部。 */}
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h1 className="text-2xl font-bold text-slate-900">
              {name ? `${name} 的报告` : "学习力报告"}
            </h1>
            <p className="mt-2 text-slate-600">
              综合得分（思维模式）：
              <span className="font-semibold text-amber-800">
                {Math.round(Number(scores.percent["思维模式"] ?? 0))}
              </span>
            </p>
            <div className="mt-8 space-y-6">
              {Object.entries(scores.percent).map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{k}</span>
                    <span className="text-amber-800 font-semibold">{v}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => handleRestart()}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-medium text-slate-700 hover:border-slate-300 transition-all"
              >
                重新测评
              </button>
            </div>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (step === "stress-intro") {
    return (
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
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
              本部分共{" "}
              <span className="font-semibold text-slate-800">
                {TOTAL_PRESSURE_QUESTIONS} 道题目
              </span>
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
              onClick={() => {
                setSubmitError("");
                setStep("stress");
                window.scrollTo({ top: 0, left: 0 });
              }}
              className="h-14 w-full rounded-2xl bg-teal-600 text-base font-semibold text-white hover:bg-teal-700 active:scale-95 transition-all"
            >
              开始学业压力测评
            </button>
            <button
              type="button"
              onClick={() => {
                setLearningPageIndex(learningPages.length - 1);
                setStep("learning");
                window.scrollTo({ top: 0, left: 0 });
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
      <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
        <TopProgress
          progress={learningProgress}
          title="学习力测评"
          current={learningPageIndex + 1}
          total={learningPages.length}
          color="amber"
          netStatus={netStatus}
          offlineRetry={() => void flushPending()}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col space-y-4 px-4 pt-16 pb-32 sm:px-6">
          {currentLearningPage.map((qid, idx) => {
            const q = LEARNING_QUESTION_BANK[qid];
            if (!q) return null;
            const globalNum = learningPageIndex * LEARNING_PAGE_SIZE + idx + 1;
            return (
              <QuestionCard
                key={qid}
                number={globalNum}
                text={q.text}
                en={q.en}
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
          nextLabel={isLastLearningPage(learningPageIndex, learningPages.length) ? "第二部分" : "下一页"}
          disabled={!pageComplete(currentLearningPage, learningAnswers)}
          submitting={submitting}
          variant={isLastLearningPage(learningPageIndex, learningPages.length) ? "teal" : "amber"}
          info={`本组已答 ${currentLearningPage.filter((id) => learningAnswers[String(id)] !== undefined).length}/${currentLearningPage.length} · 总计 ${answeredLearningCount}/${TOTAL_LEARNING_QUESTIONS}`}
        />
      </PageLayout>
    );
  }

  // ============ 学业压力答题页 + 提交遮罩 ============
  return (
    <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
      <TopProgress
        progress={stressProgress}
        title="学业压力测评"
        current={stressPageIndex + 1}
        total={pressurePages.length}
        color="teal"
        netStatus={netStatus}
        offlineRetry={() => void flushPending()}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col space-y-4 px-4 pt-16 pb-32 sm:px-6">
        {currentPressurePage.map((qid, idx) => {
          const q = PRESSURE_QUESTIONS.find((x) => x.id === qid);
          if (!q) return null;
          const globalNum = stressPageIndex * PRESSURE_PAGE_SIZE + idx + 1;
          return (
            <QuestionCard
              key={qid}
              number={globalNum}
              text={q.text}
              en={q.en}
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
        nextLabel={isLastLearningPage(stressPageIndex, pressurePages.length) ? "提交" : "下一页"}
        disabled={!pageComplete(currentPressurePage, stressAnswers)}
        submitting={submitting}
        variant="teal"
        info={`本组已答 ${currentPressurePage.filter((id) => stressAnswers[String(id)] !== undefined).length}/${currentPressurePage.length} · 总计 ${answeredStressCount}/${TOTAL_PRESSURE_QUESTIONS}`}
      />

      {submitting || submittedOverlay ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            {submitting ? (
              <>
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50">
                  <svg
                    className="h-7 w-7 animate-spin text-amber-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">正在提交…</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {submitAttempt > 0
                    ? `网络不稳定，正在第 ${Math.min(submitAttempt, 3)} 次重试（最多 3 次）`
                    : "请稍候，不要关闭页面。数据会同时保存在本地。"}
                </p>
              </>
            ) : submittedOverlay ? (
              <>
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50">
                  <span className="text-2xl" aria-hidden>
                    !
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {submittedOverlay.offline ? "网络已断开" : "提交遇到问题"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {submittedOverlay.message}
                </p>
                {submittedOverlay.retry ? (
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedOverlay(null);
                        void handleSubmit();
                      }}
                      className="h-12 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800 active:scale-95 transition-all"
                    >
                      重试提交
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedOverlay(null);
                      }}
                      className="h-12 w-full rounded-2xl border border-slate-200 text-slate-700"
                    >
                      稍后再说（已自动保存）
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
}

// 工具：判断是否学习/压力最后一页（避免闭包依赖警告）
function isLastLearningPage(idx: number, total: number) {
  return idx === total - 1;
}

// 工具：把打乱后的题号数组按 pageSize 切成多页
function splitIntoPages(ids: number[], pageSize: number): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < ids.length; i += pageSize) {
    result.push(ids.slice(i, i + pageSize));
  }
  return result;
}
