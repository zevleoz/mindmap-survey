"use client";

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Eye, FileText, LogOut, Lock, X } from "lucide-react";

import { PdfTemplate } from "@/components/survey/pdf-template";
import { PRESSURE_QUESTIONS, type Dimension, type PressureDimension } from "@/lib/survey-data";

// ============ 常量 ============
const ADMIN_PASSWORD = "appark2026";

const LEARNING_DIM_GROUPS: {
  title: string;
  items: Dimension[];
}[] = [
  { title: "自驱力", items: ["自主性", "胜任感", "归属感"] },
  { title: "学习动力", items: ["深层动机", "表层动机", "自我效能感"] },
  {
    title: "学习方法与策略",
    items: ["深层方法", "表层方法", "学习自我调节"],
  },
];

const PRESSURE_DIMS: PressureDimension[] = [
  "学业负担",
  "师生关系",
  "家庭期望",
  "同伴竞争",
  "自我要求",
];

interface CriticalAnswer {
  id: number;
  dbKey: string;
  domain: string;
  text: string;
  value: number | null;
}

interface NormalizedRecord {
  id: string;
  name: string;
  age: number | null;
  school: string | null;
  gender: string | null;
  createdAt: string;
  answers: Record<string, number | undefined>;
  average10: Record<Dimension, number>;
  percent: Record<Dimension, number>;
  pressure: Record<PressureDimension, number>;
  mindsetLabel: "成长型思维" | "固定型思维";
  criticalQuestions: CriticalAnswer[];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

function normalize(raw: unknown): NormalizedRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.name !== "string") return null;

  const answers: Record<string, number | undefined> = {};
  if (obj.answers && typeof obj.answers === "object") {
    for (const [k, v] of Object.entries(obj.answers as object)) {
      if (typeof v === "number") answers[k] = v;
    }
  }

  const percent = {} as Record<Dimension, number>;
  if (obj.percent && typeof obj.percent === "object") {
    for (const [k, v] of Object.entries(obj.percent as object)) {
      if (typeof v === "number") percent[k as Dimension] = v;
    }
  }

  const average10 = {} as Record<Dimension, number>;
  if (obj.average10 && typeof obj.average10 === "object") {
    for (const [k, v] of Object.entries(obj.average10 as object)) {
      if (typeof v === "number") average10[k as Dimension] = v;
    }
  }
  // 若 API 未返回 average10，则从 percent 反推
  if (Object.keys(average10).length === 0) {
    for (const [k, v] of Object.entries(percent)) {
      average10[k as Dimension] = Math.round((v / 10) * 10) / 10;
    }
  }

  const pressure = {} as Record<PressureDimension, number>;
  if (obj.pressure && typeof obj.pressure === "object") {
    for (const [k, v] of Object.entries(obj.pressure as object)) {
      if (typeof v === "number") pressure[k as PressureDimension] = v;
    }
  }

  let mindsetLabel: "成长型思维" | "固定型思维" = "成长型思维";
  if (obj.mindsetLabel === "成长型思维" || obj.mindsetLabel === "固定型思维") {
    mindsetLabel = obj.mindsetLabel;
  } else if (percent["思维模式"] !== undefined) {
    mindsetLabel = percent["思维模式"] >= 50 ? "成长型思维" : "固定型思维";
  }

  const criticalQuestions: CriticalAnswer[] = Array.isArray(obj.criticalQuestions)
    ? (obj.criticalQuestions as unknown[])
        .map((c): CriticalAnswer | null => {
          if (!c || typeof c !== "object") return null;
          const q = c as Record<string, unknown>;
          const id = Number(q.id);
          if (!Number.isFinite(id)) return null;
          return {
            id,
            dbKey: typeof q.dbKey === "string" ? q.dbKey : `q${60 + id}`,
            domain: typeof q.domain === "string" ? q.domain : "",
            text: typeof q.text === "string" ? q.text : `压力题 ${id}`,
            value: typeof q.value === "number" ? q.value : null,
          };
        })
        .filter((x): x is CriticalAnswer => x !== null)
    : [];

  return {
    id: obj.id,
    name: obj.name,
    age: typeof obj.age === "number" ? obj.age : null,
    school: typeof obj.school === "string" ? obj.school : null,
    gender: typeof obj.gender === "string" ? obj.gender : null,
    createdAt:
      typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    answers,
    average10,
    percent,
    pressure,
    mindsetLabel,
    criticalQuestions,
  };
}

// ============ 压力题 10 道关键题（与 api/admin/route.ts 保持一致）============
const CRITICAL_QUESTIONS_TOPIC: { id: number; domain: string; text: string }[] = [
  { id: 1, domain: "学业负担", text: "我感觉学校作业负担很重" },
  { id: 5, domain: "学业负担", text: "学业占用了我大部分时间" },
  { id: 7, domain: "考试焦虑", text: "考试前我会非常紧张" },
  { id: 12, domain: "考试焦虑", text: "考场里脑子会一片空白" },
  { id: 14, domain: "自我施压", text: "排名下降我会特别在意" },
  { id: 18, domain: "自我施压", text: "目标没有达成会让我很沮丧" },
  { id: 20, domain: "家长期望", text: "我害怕让父母失望" },
  { id: 24, domain: "家长期望", text: "我不想比别人差" },
  { id: 26, domain: "身心困扰", text: "学习让我情绪低落或烦躁" },
  { id: 30, domain: "身心困扰", text: "压力大时我会想哭/崩溃" },
];

// ============ PDF 下载逻辑（复用 PdfTemplate） ============
async function downloadPDF(record: NormalizedRecord) {
  const [html2canvasMod, jsPDFMod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const html2canvas = html2canvasMod.default;
  const jsPDF = jsPDFMod.default;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const scores = {
    average10: record.average10,
    percent: record.percent,
    pressure: record.pressure,
    mindsetLabel: record.mindsetLabel,
  };

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.zIndex = "-100";
  container.style.background = "#ffffff";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<PdfTemplate name={record.name} scores={scores} dateStr={dateStr} />);

  try {
    await new Promise((r) => setTimeout(r, 400));
    const templateEl = container.querySelector(
      "[data-pdf-template]"
    ) as HTMLElement | null;
    if (!templateEl) throw new Error("PDF 模板未渲染");

    const canvas = await html2canvas(templateEl, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    let heightLeft = imgHeight - pageHeight;
    let position = -pageHeight + imgHeight;
    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      position -= pageHeight;
      heightLeft -= pageHeight;
    }

    pdf.save(`${record.name || "学生"}_学习力测评报告_${yyyy}${mm}${dd}.pdf`);
  } finally {
    setTimeout(() => {
      root.unmount();
      container.remove();
    }, 100);
  }
}

// ============ 模态框 shell（统一 esc + 禁止 body 滚动） ============
function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={
          "relative w-full rounded-[20px] bg-white shadow-[0_2px_16px_rgba(184,115,51,0.18)] " +
          (wide ? "max-w-[900px]" : "max-w-4xl")
        }
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[20px] border-b border-amber-100 bg-white p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-amber-800 sm:text-xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800 transition hover:bg-amber-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

// ============ 快速查看弹窗（思维模式% + 9维度10分制 + 压力 + 10关键题） ============
function QuickViewModal({
  record,
  onClose,
}: {
  record: NormalizedRecord;
  onClose: () => void;
}) {
  const thinkingPct = toNumber(record.percent["思维模式"], 0);
  const criticalQs =
    record.criticalQuestions?.length > 0
      ? record.criticalQuestions
      : CRITICAL_QUESTIONS_TOPIC.map((q) => {
          const v = record.answers[`q${60 + q.id}`];
          return {
            ...q,
            value: typeof v === "number" ? v : null,
            dbKey: `q${60 + q.id}`,
          };
        });

  return (
    <ModalShell
      title={`${record.name} · 快速查看`}
      subtitle={
        (record.school ? `${record.school} · ` : "") +
        `${record.gender ?? "—"}${record.age ? ` · ${record.age}岁` : ""} · 提交时间 ${formatDate(record.createdAt)}`
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* 思维模式（百分比） */}
        <div className="rounded-2xl bg-amber-50/50 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">思维模式</p>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold tabular-nums text-amber-800">
              {Math.round(thinkingPct)}
              <span className="ml-1 text-lg font-medium text-amber-700">%</span>
            </div>
            <div className="flex-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-700 transition-all duration-700"
                  style={{
                    width: `${Math.max(0, Math.min(100, thinkingPct))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{record.mindsetLabel}</p>
            </div>
          </div>
        </div>

        {/* 其他 9 维度（10 分制，分 3 组） */}
        {LEARNING_DIM_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl bg-amber-50/30 p-5">
            <p className="mb-3 text-sm font-semibold text-amber-800">{group.title}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {group.items.map((dim) => {
                const avg = toNumber(record.average10[dim], 0);
                const pct = toNumber(record.percent[dim], 0);
                return (
                  <div
                    key={dim}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-amber-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{dim}</p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-amber-100 sm:w-32">
                        <div
                          className="h-full rounded-full bg-amber-700"
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums text-amber-800">
                        {avg.toFixed(1)}
                        <span className="ml-0.5 text-sm font-medium text-amber-600">
                          /10
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 学业压力 5 维度 */}
        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">
            学业压力 · 5 维度（满分 5 分）
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRESSURE_DIMS.map((dim) => {
              const v = toNumber(record.pressure[dim], 0);
              const isHigh = v >= 3;
              return (
                <div
                  key={dim}
                  className={`rounded-xl p-4 text-center ring-1 ${
                    isHigh ? "bg-rose-50 ring-rose-200" : "bg-white ring-amber-100"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-600">{dim}</p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${
                      isHigh ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {v.toFixed(1)}
                    <span className="ml-0.5 text-sm font-medium text-slate-400">
                      /5
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 10 道关键题 */}
        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">
            压力 · 10 道关键题（得分大于 3 建议特别关注）
          </p>
          <div className="space-y-2">
            {criticalQs.map((c) => {
              const isHigh = c.value !== null && c.value !== undefined && c.value > 3;
              const bankQ = PRESSURE_QUESTIONS.find((q) => q.id === c.id);
              const zh = bankQ?.text?.trim() ?? "";
              const en = bankQ?.en?.trim() ?? "";
              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                    isHigh
                      ? "bg-rose-50 ring-1 ring-rose-200"
                      : "bg-white ring-1 ring-amber-100"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                        压力题 #{c.id}
                      </span>
                      {c.domain && (
                        <span className="text-[11px] font-medium text-slate-500">
                          {c.domain}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-800">{zh}</div>
                    {en && <div className="mt-1 text-xs text-slate-500">{en}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        isHigh ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {c.value !== null && c.value !== undefined ? c.value : "—"}
                      <span className="ml-0.5 text-xs font-normal text-slate-400">
                        /5
                      </span>
                    </div>
                    {isHigh && (
                      <div className="text-[11px] font-medium text-rose-600">
                        高风险 · 需关注
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ============ 查看报告弹窗（完整 PdfTemplate） ============
function ReportModal({
  record,
  onClose,
}: {
  record: NormalizedRecord;
  onClose: () => void;
}) {
  const scores = {
    average10: record.average10,
    percent: record.percent,
    pressure: record.pressure,
    mindsetLabel: record.mindsetLabel,
  };
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return (
    <ModalShell
      title={`${record.name} · 学习力测评报告`}
      subtitle={`提交时间 ${formatDate(record.createdAt)}`}
      onClose={onClose}
      wide
    >
      <div className="overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-200">
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="mx-auto flex justify-center bg-[#FBF7F0] p-3">
            <div className="w-full max-w-[794px] bg-white">
              <PdfTemplate name={record.name} scores={scores} dateStr={dateStr} />
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ============ 登录页 ============
function LoginPage({
  onLogin,
  error,
  onErrorChange,
}: {
  onLogin: () => void;
  error: string;
  onErrorChange: (v: string) => void;
}) {
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === ADMIN_PASSWORD) {
      onLogin();
    } else {
      onErrorChange("密码错误，请重试");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FBF7F0] to-white p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_2px_8px_rgba(184,115,51,0.1)]"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-700 shadow-lg shadow-amber-200">
            <Lock className="size-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">管理后台登录</h1>
          <p className="text-sm text-slate-500">请输入管理员密码查看所有测评记录</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700">
              密码
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                onErrorChange("");
              }}
              placeholder="请输入管理员密码"
              className="h-12 w-full rounded-xl border border-slate-200 bg-amber-50/40 px-4 text-base text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              autoFocus
            />
            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
          <button
            type="submit"
            className="h-12 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white transition hover:bg-amber-800"
          >
            登录
          </button>
        </div>
      </form>
    </div>
  );
}

// ============ 管理面板主页面 ============
// 关键点：SSR 与 CSR 首次渲染都返回登录页（无 window/sessionStorage 依赖），
// 只有 useEffect 之后才切换到"已登录/加载数据"视图，从根本上消除 hydration 不一致。
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [query, setQuery] = useState("");
  const [quickView, setQuickView] = useState<NormalizedRecord | null>(null);
  const [reportView, setReportView] = useState<NormalizedRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 1) 登录态初始化（只在客户端运行，SSR 保持 authed=false）
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("survey_admin_authed") === "1") {
        setAuthed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // 2) 登录后拉取数据
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLoading(true);
    setFetchError("");
    async function fetchRecords() {
      try {
        const res = await fetch("/api/admin", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          throw new Error("加载失败，请稍后重试");
        }
        const data = await res.json();
        const arr: unknown[] = Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data)
            ? data
            : [];
        const normalized: NormalizedRecord[] = [];
        for (const item of arr) {
          const rec = normalize(item);
          if (rec) normalized.push(rec);
        }
        if (!cancelled) setRecords(normalized);
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRecords();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const handleLogin = () => {
    try {
      window.sessionStorage.setItem("survey_admin_authed", "1");
    } catch {
      // ignore
    }
    setAuthed(true);
  };

  const handleLogout = () => {
    try {
      window.sessionStorage.removeItem("survey_admin_authed");
    } catch {
      // ignore
    }
    setAuthed(false);
    setRecords([]);
    setFetchError("");
    setQuickView(null);
    setReportView(null);
  };

  // SSR 与首次 CSR 都渲染登录页（确定性、无 window 依赖）
  if (!authed) {
    return (
      <LoginPage
        onLogin={handleLogin}
        error={loginError}
        onErrorChange={setLoginError}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? records.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.school && r.school.toLowerCase().includes(q)) ||
          (r.gender && String(r.gender).toLowerCase().includes(q))
      )
    : records;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white">
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-5 sm:py-8">
        {/* 标题 + 操作栏 */}
        <div className="flex flex-col gap-4 rounded-[20px] bg-white p-5 shadow-[0_2px_8px_rgba(184,115,51,0.08)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="text-xl font-bold text-amber-800 sm:text-2xl">
              测评管理后台
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              查看所有学生的测评记录 · 共 {records.length} 条
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索（姓名 / 学校 / 性别）"
              className="h-11 w-full rounded-xl border border-slate-200 bg-amber-50/40 px-4 text-sm text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 sm:w-64"
            />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 text-sm font-medium text-amber-800 transition hover:bg-amber-50"
            >
              <LogOut className="size-4" />
              退出登录
            </button>
          </div>
        </div>

        {/* 数据表格 */}
        <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(184,115,51,0.08)]">
          {loading ? (
            <p className="py-16 text-center text-slate-500">加载中…</p>
          ) : fetchError ? (
            <div className="p-6 text-center">
              <p className="text-rose-500">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-slate-500">暂无测评记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-amber-50/70 text-left text-sm text-amber-800">
                    <th className="px-4 py-3 font-semibold sm:px-5">姓名</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">年龄</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">学校</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">性别</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">提交时间</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-amber-50/30">
                      <td className="px-4 py-4 font-medium text-slate-800 sm:px-5">
                        {r.name}
                      </td>
                      <td className="px-4 py-4 sm:px-5">{r.age ?? "—"}</td>
                      <td className="max-w-[220px] truncate px-4 py-4 text-slate-600 sm:px-5">
                        {r.school ?? "—"}
                      </td>
                      <td className="px-4 py-4 sm:px-5">{r.gender ?? "—"}</td>
                      <td className="px-4 py-4 text-slate-500 sm:px-5">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickView(r)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-700 px-3 text-sm font-medium text-white transition hover:bg-amber-800"
                          >
                            <Eye className="size-4" />
                            快速查看
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportView(r)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 text-sm font-medium text-amber-800 transition hover:bg-amber-50"
                          >
                            <FileText className="size-4" />
                            查看报告
                          </button>
                          <button
                            type="button"
                            disabled={downloadingId === r.id}
                            onClick={async () => {
                              setDownloadingId(r.id);
                              try {
                                await downloadPDF(r);
                              } catch (e) {
                                console.error(e);
                                alert("下载失败，请稍后重试");
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Download className="size-4" />
                            {downloadingId === r.id ? "下载中…" : "下载 PDF 报告"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {quickView && <QuickViewModal record={quickView} onClose={() => setQuickView(null)} />}
      {reportView && <ReportModal record={reportView} onClose={() => setReportView(null)} />}
    </div>
  );
}
