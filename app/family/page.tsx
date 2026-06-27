"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, BookOpen } from "lucide-react";

import type { FamilyScores } from "@/lib/survey-data";
import {
  FAMILY_QUESTIONS,
  FAMILY_PAGE_SIZE,
  TOTAL_FAMILY_QUESTIONS,
  shuffleArray,
  FAMILY_QUESTION_IDS,
} from "@/lib/survey-data";
import { cn } from "@/lib/utils";

type Step = "landing" | "info" | "questions" | "submitted";
type NetStatus = "online" | "slow" | "offline";

const GRADE_OPTIONS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11", "G12"];

const LS_ANSWERS = "p4learning_family_answers";
const LS_PARENT = "p4learning_family_parent";
const LS_PENDING = "p4learning_family_pending";

interface PersistedAnswers {
  step: Step;
  pageIndex: number;
  answers: Record<string, number>;
  name: string;
  childName: string;
  school: string;
  grade: string;
  savedAt: number;
  version: number;
}

const PERSIST_VERSION = 1;

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
    // ignore
  }
}

function clearPersisted() {
  try {
    window.localStorage.removeItem(LS_ANSWERS);
    window.localStorage.removeItem(LS_PARENT);
  } catch {
    // ignore
  }
}

function loadParentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_PARENT);
  } catch {
    return null;
  }
}

function saveParentId(id: string) {
  try {
    window.localStorage.setItem(LS_PARENT, id);
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
  value,
  onChange,
}: {
  number: number;
  text: string;
  value?: number;
  onChange: (v: number) => void;
}) {
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-700 text-sm font-bold text-white">
          {number}
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-800">{text}</p>
      </div>

      <div className="flex w-full justify-between gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5, 6].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleClick(num)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center rounded-xl text-base font-semibold tabular-nums transition-colors active:scale-95 sm:text-lg",
              "h-12",
              value === num
                ? "bg-amber-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>完全不像我的选择倾向</span>
        <span>非常像我的选择倾向</span>
      </div>
    </div>
  );
}

function TopProgress({
  progress,
  title,
  current,
  total,
  netStatus,
  offlineRetry,
}: {
  progress: number;
  title: string;
  current: number;
  total: number;
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
          <span className="tabular-nums font-medium text-amber-700">
            {progress}% 已完成
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-700 transition-all duration-500 ease-out"
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
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  backLabel?: string;
  disabled?: boolean;
  submitting?: boolean;
  info?: string;
}) {
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
                : "bg-amber-700 text-white hover:bg-amber-800"
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

export default function FamilySurveyPage() {
  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<FamilyScores | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<{ timestamp: number } | null>(null);
  const [submittedOverlay, setSubmittedOverlay] = useState<{
    message: string;
    retry?: boolean;
    offline?: boolean;
  } | null>(null);

  const netStatus = useNetStatus();
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loaded = loadPersisted();
    const pid = loadParentId();
    if (pid) setParentId(pid);

    if (loaded) {
      setName(loaded.name ?? "");
      setChildName(loaded.childName ?? "");
      setSchool(loaded.school ?? "");
      setGrade(loaded.grade ?? "");
      setAnswers(loaded.answers ?? {});
      if (typeof loaded.pageIndex === "number") {
        setPageIndex(loaded.pageIndex);
      }
      setResumePrompt({ timestamp: loaded.savedAt });
    }

    void flushPending();
  }, []);

  const shuffled = useMemo(() => shuffleArray(FAMILY_QUESTION_IDS), []);
  const pages = useMemo(() => {
    const result: number[][] = [];
    for (let i = 0; i < shuffled.length; i += FAMILY_PAGE_SIZE) {
      result.push(shuffled.slice(i, i + FAMILY_PAGE_SIZE));
    }
    return result;
  }, [shuffled]);

  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[pageIndex] ?? [];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / TOTAL_FAMILY_QUESTIONS) * 100);
  const pageComplete = (pageIds: number[], ans: Record<string, number>) =>
    pageIds.every((id) => ans[String(id)] !== undefined);

  const debounceRef = useRef<number | null>(null);
  const persistCurrent = useCallback(
    (opts?: { skipDebounce?: boolean }) => {
      const payload: PersistedAnswers = {
        step,
        pageIndex,
        answers,
        name,
        childName,
        school,
        grade,
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
    [step, pageIndex, answers, name, childName, school, grade]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === "landing" || step === "submitted") return;
    persistCurrent();
  }, [persistCurrent, step]);

  const handleConfirmInfo = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setSubmitError("请填写家长称呼");
      return;
    }
    setSubmitError("");
    persistCurrent({ skipDebounce: true });

    (async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetchWithTimeout(
          "/api/family",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parentId: parentId || ("temp-" + Date.now().toString(36)),
              parentInfo: {
                name: trimmed,
                childName: childName.trim() || null,
                school: school.trim() || null,
                grade: grade || null,
              },
            }),
          },
          8000
        );
        if (res.ok) {
          const data = (await res.json()) as { parentId?: string };
          if (data?.parentId) {
            setParentId(data.parentId);
            saveParentId(data.parentId);
          }
        }
      } catch (err) {
        console.warn("[family] parent create failed", err);
        if (!parentId) {
          const temp = "temp-" + Date.now().toString(36);
          setParentId(temp);
          saveParentId(temp);
        }
      }
    })();

    setStep("questions");
    window.scrollTo({ top: 0, left: 0 });
  }, [name, childName, school, grade, persistCurrent, parentId]);

  const handleAnswer = useCallback((questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const autoSavePage = useCallback(
    async (pageIdx: number) => {
      if (!navigator.onLine) return;
      if (!parentId) return;
      try {
        const pageIds = pages[pageIdx];
        if (!pageIds) return;
        const pageAnswers: Record<string, number> = {};
        for (const id of pageIds) {
          if (answers[String(id)] !== undefined) pageAnswers[String(id)] = answers[String(id)];
        }

        const body: Record<string, unknown> = {
          parentId,
          parentInfo: {
            name: name.trim(),
            childName: childName.trim() || null,
            school: school.trim() || null,
            grade: grade || null,
          },
          pageIndex: pageIdx,
          answers: pageAnswers,
        };

        const res = await fetchWithTimeout(
          "/api/family",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          12_000
        );
        if (!res.ok) throw new Error("auto-save non-2xx: " + res.status);
      } catch (err) {
        console.warn("[family] auto-save skipped:", err);
      }
    },
    [parentId, pages, answers, name, childName, school, grade]
  );

  const handleNextPage = useCallback(() => {
    const missing = currentPage.find((id) => answers[String(id)] === undefined);
    if (missing !== undefined) return;
    const idx = pageIndex;
    window.scrollTo({ top: 0, left: 0 });
    void autoSavePage(idx);
    if (pageIndex < pages.length - 1) {
      setPageIndex((i) => i + 1);
    } else {
      void handleSubmit();
    }
  }, [autoSavePage, currentPage, answers, pageIndex, pages.length]);

  const handleRestart = useCallback(() => {
    clearPersisted();
    setStep("landing");
    setName("");
    setChildName("");
    setSchool("");
    setGrade("");
    setAnswers({});
    setScores(null);
    setParentId(null);
    setPageIndex(0);
    setSubmitError("");
    setSubmitAttempt(0);
    setSubmittedOverlay(null);
    setResumePrompt(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    setSubmitAttempt(0);

    const finalParentInfo = {
      name: name.trim() || "未填写",
      childName: childName.trim() || null,
      school: school.trim() || null,
      grade: grade || null,
    };

    try {
      if (!navigator.onLine) {
        const ts = Date.now();
        pushPending({
          timestamp: ts,
          payload: {
            parentId: parentId || ("temp-" + ts.toString(36)),
            ...finalParentInfo,
            answers,
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

      let usedParentId = parentId;
      if (!usedParentId) {
        usedParentId = "temp-" + Date.now().toString(36);
        setParentId(usedParentId);
        saveParentId(usedParentId);
      }

      const payload: Record<string, unknown> = {
        parentId: usedParentId,
        ...finalParentInfo,
        answers,
      };

      const { data } = await postWithRetry("/api/family", payload, (attempt) =>
        setSubmitAttempt(attempt)
      );

      if (typeof data?.parentId === "string") {
        setParentId(data.parentId);
        saveParentId(data.parentId);
      }
      if (typeof data?.id === "string") setResponseId(data.id);
      if (data?.scores) setScores(data.scores as FamilyScores);

      clearPersisted();
      setSubmittedOverlay(null);
      setStep("submitted");
      window.scrollTo({ top: 0, left: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "提交失败，请稍后重试";
      const ts = Date.now();
      pushPending({
        timestamp: ts,
        payload: {
          parentId: parentId || ("temp-" + ts.toString(36)),
          ...finalParentInfo,
          answers,
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
  }, [parentId, name, childName, school, grade, answers]);

  const flushPending = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    const list = loadPending();
    if (list.length === 0) return;
    for (const item of list) {
      try {
        const res = await fetchWithTimeout(
          "/api/family",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          },
          12_000
        );
        if (res.ok) {
          removePending(item.timestamp);
          console.info("[family] pending submitted", item.timestamp);
        } else {
          console.warn("[family] pending failed", res.status);
          break;
        }
      } catch (err) {
        console.warn("[family] pending failed", err);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (netStatus === "online") void flushPending();
  }, [netStatus, flushPending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = window.setInterval(() => void flushPending(), 30_000);
    return () => window.clearInterval(interval);
  }, [flushPending]);

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
                  setStep(Object.keys(answers).length > 0 ? "questions" : "info");
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
                  setChildName("");
                  setSchool("");
                  setGrade("");
                  setAnswers({});
                  setParentId(null);
                  setPageIndex(0);
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
              家庭教育价值选择倾向问卷
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              了解您的教育选择倾向
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              共 {TOTAL_FAMILY_QUESTIONS} 道题目，约需 5–10 分钟完成。
            </p>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">填写说明</div>
                <div className="mt-1 text-xs opacity-90">请回想过去一年中真实发生过的教育选择，按您的真实倾向作答。</div>
              </div>
              <div className="rounded-xl bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
                <div className="font-semibold">评分标准</div>
                <div className="mt-1 text-xs opacity-90">1–6 分 · 完全不像我的选择倾向 → 非常像我的选择倾向</div>
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
                  家长怎么称呼？
                </label>
                <IconInput
                  id="name"
                  icon={User}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的称呼"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="childName" className="text-sm font-medium text-slate-700">
                  孩子怎么称呼？
                </label>
                <IconInput
                  id="childName"
                  icon={User}
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="请输入孩子的称呼"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="school" className="text-sm font-medium text-slate-700">
                  学校
                </label>
                <IconInput
                  id="school"
                  icon={BookOpen}
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="请输入学校名称"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="grade" className="text-sm font-medium text-slate-700">
                  年级
                </label>
                <div className="relative">
                  <BookOpen className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-amber-700/70" />
                  <select
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-amber-50/40 pl-10 pr-10 text-base text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                  >
                    <option value="">请选择年级</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
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
              下一步，开始问卷
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
              您的家庭教育价值选择倾向报告已生成。
            </p>
            <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-amber-100 bg-amber-50/60 p-5 text-base leading-relaxed text-amber-900 sm:p-6">
              请联系您的凭远教育顾问解锁完整报告。
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

  return (
    <PageLayout error={submitError || null} onCloseError={() => setSubmitError("")}>
      <TopProgress
        progress={progress}
        title="家庭教育价值选择倾向问卷"
        current={pageIndex + 1}
        total={pages.length}
        netStatus={netStatus}
        offlineRetry={() => void flushPending()}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col space-y-4 px-4 pt-16 pb-32 sm:px-6">
        {currentPage.map((qid, idx) => {
          const q = FAMILY_QUESTIONS.find((x) => x.id === qid);
          if (!q) return null;
          const globalNum = pageIndex * FAMILY_PAGE_SIZE + idx + 1;
          return (
            <QuestionCard
              key={qid}
              number={globalNum}
              text={q.text}
              value={answers[String(qid)]}
              onChange={(v) => handleAnswer(qid, v)}
            />
          );
        })}
      </main>
      <BottomNav
        onBack={() => {
          window.scrollTo({ top: 0, left: 0 });
          if (pageIndex > 0) {
            setPageIndex((i) => i - 1);
          } else {
            setStep("info");
          }
        }}
        onNext={handleNextPage}
        nextLabel={pageIndex === pages.length - 1 ? "提交" : "下一页"}
        disabled={!pageComplete(currentPage, answers)}
        submitting={submitting}
        info={`本组已答 ${currentPage.filter((id) => answers[String(id)] !== undefined).length}/${currentPage.length} · 总计 ${answeredCount}/${TOTAL_FAMILY_QUESTIONS}`}
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
                  <span className="text-2xl" aria-hidden>!</span>
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