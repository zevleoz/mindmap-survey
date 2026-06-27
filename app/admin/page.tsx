"use client";

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Eye, FileText, LogOut, Lock, X, Users, User } from "lucide-react";

import { PdfTemplate } from "@/components/survey/pdf-template";
import {
  LEARNING_QUESTION_BANK,
  PRESSURE_QUESTIONS,
  FAMILY_VALUES,
  FAMILY_HIGHER_ORDER,
  type Dimension,
  type PressureDimension,
} from "@/lib/survey-data";

const ADMIN_PASSWORD = "appark2026";

type SurveyType = "student" | "family";

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
  age?: number | null;
  school: string | null;
  gender?: string | null;
  grade?: string | null;
  childName?: string | null;
  createdAt: string;
  isDraft?: boolean;
  totalAnswered?: number;
  learningAnswered?: number;
  pressureAnswered?: number;
  answers: Record<string, number | undefined>;
  average10: Record<Dimension, number>;
  percent: Record<Dimension, number>;
  pressure: Record<PressureDimension, number>;
  mindsetLabel: "成长型思维" | "固定型思维";
  criticalQuestions: CriticalAnswer[];
  valueScores?: Record<string, number>;
  higherOrderScores?: Record<string, number>;
  higherOrderRawScores?: Record<string, number>;
  centeredScores?: Record<string, number>;
  personalMean?: number;
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

function normalize(raw: unknown, type: SurveyType): NormalizedRecord | null {
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

  const valueScores: Record<string, number> | undefined =
    obj.valueScores && typeof obj.valueScores === "object"
      ? (obj.valueScores as Record<string, number>)
      : undefined;

  const higherOrderScores: Record<string, number> | undefined =
    obj.higherOrderScores && typeof obj.higherOrderScores === "object"
      ? (obj.higherOrderScores as Record<string, number>)
      : undefined;

  const higherOrderRawScores: Record<string, number> | undefined =
    obj.higherOrderRawScores && typeof obj.higherOrderRawScores === "object"
      ? (obj.higherOrderRawScores as Record<string, number>)
      : undefined;

  const centeredScores: Record<string, number> | undefined =
    obj.centeredScores && typeof obj.centeredScores === "object"
      ? (obj.centeredScores as Record<string, number>)
      : undefined;

  return {
    id: obj.id,
    name: obj.name,
    age: typeof obj.age === "number" ? obj.age : null,
    school: typeof obj.school === "string" ? obj.school : null,
    gender: typeof obj.gender === "string" ? obj.gender : null,
    grade: typeof obj.grade === "string" ? obj.grade : null,
    childName: typeof obj.childName === "string" ? obj.childName : null,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    isDraft: obj.isDraft === true,
    totalAnswered: typeof obj.totalAnswered === "number" ? obj.totalAnswered : undefined,
    learningAnswered: typeof obj.learningAnswered === "number" ? obj.learningAnswered : undefined,
    pressureAnswered: typeof obj.pressureAnswered === "number" ? obj.pressureAnswered : undefined,
    answers,
    average10,
    percent,
    pressure,
    mindsetLabel,
    criticalQuestions,
    valueScores,
    higherOrderScores,
    higherOrderRawScores,
    centeredScores,
    personalMean: typeof obj.personalMean === "number" ? obj.personalMean : undefined,
  };
}

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
    const templateEl = container.querySelector("[data-pdf-template]") as HTMLElement | null;
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

function StudentQuickViewModal({
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
          return { ...q, value: typeof v === "number" ? v : null, dbKey: `q${60 + q.id}` };
        });

  const LEARNING_SECTIONS: {
    title: string;
    items: { id: number; domain: string; isReverse: boolean }[];
  }[] = [
    {
      title: "自驱力",
      items: [
        { id: 11, domain: "自主性", isReverse: false },
        { id: 12, domain: "胜任感", isReverse: false },
      ],
    },
    {
      title: "深层动机",
      items: [
        { id: 23, domain: "深层动机", isReverse: false },
        { id: 28, domain: "深层动机", isReverse: false },
      ],
    },
    {
      title: "学习方法",
      items: [
        { id: 29, domain: "学习方法", isReverse: true },
        { id: 41, domain: "学习方法", isReverse: true },
      ],
    },
    { title: "表层动机", items: [] },
    { title: "表层方法", items: [{ id: 42, domain: "表层方法", isReverse: false }] },
  ];

  const learningSections = LEARNING_SECTIONS.map((section) => {
    const rows = section.items.map((it) => {
      const bank = LEARNING_QUESTION_BANK[it.id];
      const zh = bank?.text ?? `学习力题 ${it.id}`;
      const en = bank?.en ?? "";
      const dbKey = `q${it.id}`;
      const v = record.answers[dbKey];
      const value = typeof v === "number" ? v : null;
      const flagged = value !== null && ((it.isReverse ? value > 5 : value < 5) as boolean);
      return { id: it.id, dbKey, domain: it.domain, isReverse: it.isReverse, zh, en, value, flagged };
    });
    return { title: section.title, rows };
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
                  style={{ width: `${Math.max(0, Math.min(100, thinkingPct))}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{record.mindsetLabel}</p>
            </div>
          </div>
        </div>

        {LEARNING_DIM_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl bg-amber-50/30 p-5">
            <p className="mb-3 text-sm font-semibold text-amber-800">{group.title}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {group.items.map((dim) => {
                const avg = toNumber(record.average10[dim], 0);
                const pct = toNumber(record.percent[dim], 0);
                return (
                  <div key={dim} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-amber-100">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{dim}</p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-amber-100 sm:w-32">
                        <div className="h-full rounded-full bg-amber-700" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums text-amber-800">
                        {avg.toFixed(1)}
                        <span className="ml-0.5 text-sm font-medium text-amber-600">/10</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">学业压力 · 5 维度（满分 5 分）</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRESSURE_DIMS.map((dim) => {
              const v = toNumber(record.pressure[dim], 0);
              const isHigh = v >= 3;
              return (
                <div key={dim} className={`rounded-xl p-4 text-center ring-1 ${isHigh ? "bg-rose-50 ring-rose-200" : "bg-white ring-amber-100"}`}>
                  <p className="text-sm font-medium text-slate-600">{dim}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${isHigh ? "text-rose-600" : "text-emerald-700"}`}>
                    {v.toFixed(1)}
                    <span className="ml-0.5 text-sm font-medium text-slate-400">/5</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">压力 · 10 道关键题（得分大于 3 建议特别关注）</p>
          <div className="space-y-2">
            {criticalQs.map((c) => {
              const isHigh = c.value !== null && c.value !== undefined && c.value > 3;
              const bankQ = PRESSURE_QUESTIONS.find((q) => q.id === c.id);
              const zh = bankQ?.text?.trim() ?? "";
              const en = bankQ?.en?.trim() ?? "";
              return (
                <div key={c.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${isHigh ? "bg-rose-50 ring-1 ring-rose-200" : "bg-white ring-1 ring-amber-100"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">压力题 #{c.id}</span>
                      {c.domain && <span className="text-[11px] font-medium text-slate-500">{c.domain}</span>}
                    </div>
                    <div className="mt-1 text-sm text-slate-800">{zh}</div>
                    {en && <div className="mt-1 text-xs text-slate-500">{en}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-lg font-bold tabular-nums ${isHigh ? "text-rose-600" : "text-slate-700"}`}>
                      {c.value !== null && c.value !== undefined ? c.value : "—"}
                      <span className="ml-0.5 text-xs font-normal text-slate-400">/5</span>
                    </div>
                    {isHigh && <div className="text-[11px] font-medium text-rose-600">高风险 · 需关注</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {learningSections
          .filter((section) => section.rows.length > 0)
          .map((section) => (
          <div key={section.title} className="rounded-2xl bg-amber-50/30 p-5">
            <p className="mb-3 text-sm font-semibold text-amber-800">{section.title}（学习力 1–10 分制）</p>
            <div className="space-y-2">
              {section.rows.map((c) => (
                <div key={c.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${c.flagged ? "bg-rose-50 ring-1 ring-rose-200" : "bg-white ring-1 ring-amber-100"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">学习力题 #{c.id}</span>
                      {c.domain && <span className="text-[11px] font-medium text-slate-500">{c.domain}</span>}
                      {c.isReverse && <span className="text-[11px] font-medium text-slate-400">反向题</span>}
                    </div>
                    <div className="mt-1 text-sm text-slate-800">{c.zh}</div>
                    {c.en && <div className="mt-1 text-xs text-slate-500">{c.en}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-lg font-bold tabular-nums ${c.flagged ? "text-rose-600" : "text-slate-700"}`}>
                      {c.value !== null && c.value !== undefined ? c.value : "—"}
                      <span className="ml-0.5 text-xs font-normal text-slate-400">/10</span>
                    </div>
                    {c.flagged && <div className="text-[11px] font-medium text-rose-600">需关注</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function FamilyQuickViewModal({
  record,
  onClose,
}: {
  record: NormalizedRecord;
  onClose: () => void;
}) {
  const valueScores = record.valueScores ?? {};
  const centeredScores = record.centeredScores ?? {};
  const higherOrderScores = record.higherOrderScores ?? {};
  const higherOrderRawScores = record.higherOrderRawScores ?? {};
  const personalMean = record.personalMean ?? 0;

  const getPriorityLevel = (score: number): { label: string; color: string } => {
    if (score >= 0.5) return { label: "相对核心价值", color: "bg-emerald-100 text-emerald-700" };
    if (score >= 0.2) return { label: "相对较高优先", color: "bg-amber-100 text-amber-700" };
    if (score >= -0.19) return { label: "处于中间位置", color: "bg-slate-100 text-slate-600" };
    if (score >= -0.49) return { label: "相对较低优先", color: "bg-orange-100 text-orange-700" };
    return { label: "明显非优先价值", color: "bg-rose-100 text-rose-700" };
  };

  return (
    <ModalShell
      title={`${record.name} · 快速查看`}
      subtitle={
        (record.school ? `${record.school} · ` : "") +
        `${record.grade ?? "—"}${record.childName ? ` · 孩子：${record.childName}` : ""} · 提交时间 ${formatDate(record.createdAt)}`
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-amber-50/50 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">个人总均分（1–6 分）</p>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold tabular-nums text-amber-800">
              {personalMean.toFixed(1)}
              <span className="ml-1 text-lg font-medium text-amber-700">/6</span>
            </div>
            <div className="flex-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-700 transition-all duration-700"
                  style={{ width: `${(personalMean / 6) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">反映填写者整体偏向使用高分还是低分</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">10 个基本价值维度（原始分）</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {FAMILY_VALUES.map((value) => {
              const score = toNumber(valueScores[value], 0);
              return (
                <div key={value} className="rounded-xl bg-white p-3 text-center ring-1 ring-amber-100">
                  <p className="text-xs font-medium text-slate-600">{value}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-amber-800">
                    {score.toFixed(1)}
                    <span className="ml-0.5 text-xs font-medium text-slate-400">/6</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">中心化相对优先级（原始分 - 个人总均分）</p>
          <div className="relative">
            <div className="absolute left-[88px] right-[120px] top-0 bottom-0 flex items-center">
              <div className="relative h-full w-full">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" />
                <div className="absolute left-0 top-0 h-full w-px bg-slate-200" />
                <div className="absolute right-0 top-0 h-full w-px bg-slate-200" />
              </div>
            </div>
            <div className="space-y-2.5 relative z-10">
              {FAMILY_VALUES.map((value) => {
                const score = toNumber(centeredScores[value], 0);
                const priority = getPriorityLevel(score);
                const absScore = Math.abs(score);
                const isPositive = score >= 0;
                const barPercent = Math.min(100, absScore * 50);
                return (
                  <div key={value} className="flex items-center gap-3">
                    <div className="w-[80px] shrink-0 text-sm font-medium text-slate-800 text-right">{value}</div>
                    <div className="flex-1 h-6 relative">
                      <div className="absolute inset-0 flex">
                        <div className="flex-1 flex justify-end">
                          <div
                            className={`h-full transition-all duration-500 rounded-l-lg ${!isPositive ? "bg-rose-400" : "bg-transparent"}`}
                            style={{ width: isPositive ? "0%" : `${barPercent}%` }}
                          />
                        </div>
                        <div className="w-0.5 bg-slate-400 shrink-0" />
                        <div className="flex-1">
                          <div
                            className={`h-full transition-all duration-500 rounded-r-lg ${isPositive ? "bg-amber-600" : "bg-transparent"}`}
                            style={{ width: isPositive ? `${barPercent}%` : "0%" }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="w-[52px] shrink-0 text-right">
                      <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-amber-700" : "text-rose-600"}`}>
                        {isPositive ? "+" : ""}{score.toFixed(2)}
                      </span>
                    </div>
                    <div className={`w-[60px] shrink-0 text-center rounded-md px-1.5 py-1 text-[10px] font-medium ${priority.color}`}>
                      {priority.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex mt-2 text-[11px] text-slate-500">
              <div className="w-[80px] shrink-0" />
              <div className="flex-1 flex justify-between px-1">
                <span>-2.0</span>
                <span>0</span>
                <span>+2.0</span>
              </div>
              <div className="w-[116px] shrink-0" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/30 p-5">
          <p className="mb-3 text-sm font-semibold text-amber-800">4 个高阶价值方向（平均分）</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FAMILY_HIGHER_ORDER.map((order) => {
              const rawScore = toNumber(higherOrderRawScores[order] ?? higherOrderScores[order], 0);
              const displayScore = rawScore > 6 ? rawScore / 6 : rawScore;
              const finalScore = displayScore > 0 ? displayScore : 0;
              return (
                <div key={order} className="rounded-xl bg-white p-4 ring-1 ring-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-800">{order}</span>
                    <span className="text-lg font-bold tabular-nums text-amber-700">
                      {finalScore.toFixed(1)}
                      <span className="ml-0.5 text-xs font-medium text-slate-400">/6</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, (finalScore / 6) * 100)}%` }}
                    />
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
      <form onSubmit={submit} className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_2px_8px_rgba(184,115,51,0.1)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-700 shadow-lg shadow-amber-200">
            <Lock className="size-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">管理后台登录</h1>
          <p className="text-sm text-slate-500">请输入管理员密码查看所有测评记录</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700">密码</label>
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
          <button type="submit" className="h-12 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white transition hover:bg-amber-800">登录</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [surveyType, setSurveyType] = useState<SurveyType>("student");
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [query, setQuery] = useState("");
  const [quickView, setQuickView] = useState<NormalizedRecord | null>(null);
  const [reportView, setReportView] = useState<NormalizedRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("survey_admin_authed") === "1") {
        setAuthed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLoading(true);
    setFetchError("");
    async function fetchRecords() {
      try {
        const url = surveyType === "student" ? "/api/admin" : "/api/family";
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) throw new Error("加载失败，请稍后重试");
        const data = await res.json();
        const arr: unknown[] = Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data)
            ? data
            : [];
        const normalized: NormalizedRecord[] = [];
        for (const item of arr) {
          const rec = normalize(item, surveyType);
          if (rec) normalized.push(rec);
        }
        if (!cancelled) setRecords(normalized);
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRecords();
    return () => { cancelled = true; };
  }, [authed, surveyType]);

  const handleLogin = () => {
    try {
      window.sessionStorage.setItem("survey_admin_authed", "1");
    } catch { /* ignore */ }
    setAuthed(true);
  };

  const handleLogout = () => {
    try {
      window.sessionStorage.removeItem("survey_admin_authed");
    } catch { /* ignore */ }
    setAuthed(false);
    setRecords([]);
    setFetchError("");
    setQuickView(null);
    setReportView(null);
  };

  if (!authed) {
    return <LoginPage onLogin={handleLogin} error={loginError} onErrorChange={setLoginError} />;
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? records.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.school && r.school.toLowerCase().includes(q)) ||
          (r.gender && String(r.gender).toLowerCase().includes(q)) ||
          (r.grade && String(r.grade).toLowerCase().includes(q)) ||
          (r.childName && r.childName.toLowerCase().includes(q))
      )
    : records;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white">
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-5 sm:py-8">
        <div className="flex flex-col gap-4 rounded-[20px] bg-white p-5 shadow-[0_2px_8px_rgba(184,115,51,0.08)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="text-xl font-bold text-amber-800 sm:text-2xl">测评管理后台</h1>
            <p className="mt-1 text-sm text-slate-500">
              查看所有{surveyType === "student" ? "学生" : "家长"}的测评记录 · 共 {records.length} 条
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-xl border border-amber-200 p-1 bg-amber-50/40">
              <button
                type="button"
                onClick={() => { setSurveyType("student"); setQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  surveyType === "student"
                    ? "bg-amber-700 text-white"
                    : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                <User className="size-4" />
                学生测评
              </button>
              <button
                type="button"
                onClick={() => { setSurveyType("family"); setQuery(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  surveyType === "family"
                    ? "bg-amber-700 text-white"
                    : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                <Users className="size-4" />
                家长测评
              </button>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`搜索（姓名 / 学校 / ${surveyType === "family" ? "孩子姓名 / 年级" : "性别"}）`}
              className="h-11 w-full rounded-xl border border-slate-200 bg-amber-50/40 px-4 text-sm text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 sm:w-64"
            />
            <button type="button" onClick={handleLogout} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 text-sm font-medium text-amber-800 transition hover:bg-amber-50">
              <LogOut className="size-4" />
              退出登录
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(184,115,51,0.08)]">
          {loading ? (
            <p className="py-16 text-center text-slate-500">加载中…</p>
          ) : fetchError ? (
            <div className="p-6 text-center">
              <p className="text-rose-500">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-slate-500">暂无{surveyType === "student" ? "学生" : "家长"}测评记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-amber-50/70 text-left text-sm text-amber-800">
                    <th className="px-4 py-3 font-semibold sm:px-5">姓名</th>
                    {surveyType === "family" && <th className="px-4 py-3 font-semibold sm:px-5">孩子姓名</th>}
                    {surveyType === "family" && <th className="px-4 py-3 font-semibold sm:px-5">年级</th>}
                    {surveyType === "student" && <th className="px-4 py-3 font-semibold sm:px-5">年龄</th>}
                    <th className="px-4 py-3 font-semibold sm:px-5">学校</th>
                    {surveyType === "student" && <th className="px-4 py-3 font-semibold sm:px-5">性别</th>}
                    <th className="px-4 py-3 font-semibold sm:px-5">提交时间</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-amber-50/30">
                      <td className="px-4 py-4 font-medium text-slate-800 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span>{r.name}</span>
                          {r.isDraft ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800" title={`未完成 · ${r.totalAnswered ?? 0}/${surveyType === "student" ? 90 : 30}`}>
                              <span className="size-1.5 rounded-full bg-amber-600" />
                              未完成 · {r.totalAnswered ?? 0}/{surveyType === "student" ? 90 : 30}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              已完成
                            </span>
                          )}
                        </div>
                      </td>
                      {surveyType === "family" && (
                        <td className="px-4 py-4 text-slate-600 sm:px-5">{r.childName ?? "—"}</td>
                      )}
                      {surveyType === "family" && (
                        <td className="px-4 py-4 text-slate-600 sm:px-5">{r.grade ?? "—"}</td>
                      )}
                      {surveyType === "student" && <td className="px-4 py-4 sm:px-5">{r.age ?? "—"}</td>}
                      <td className="max-w-[220px] truncate px-4 py-4 text-slate-600 sm:px-5">{r.school ?? "—"}</td>
                      {surveyType === "student" && <td className="px-4 py-4 sm:px-5">{r.gender ?? "—"}</td>}
                      <td className="px-4 py-4 text-slate-500 sm:px-5">{formatDate(r.createdAt)}</td>
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
                          {surveyType === "student" && (
                            <>
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
                            </>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`确认删除「${r.name}」的测评记录？此操作不可恢复。`)) return;
                              try {
                                const url = surveyType === "student" ? `/api/responses/${r.id}` : `/api/family?id=${r.id}`;
                                const method = surveyType === "student" ? "DELETE" : "DELETE";
                                const res = await fetch(url, { method });
                                if (!res.ok) throw new Error("Delete failed");
                                setRecords((prev) => prev.filter((x) => x.id !== r.id));
                              } catch (e) {
                                console.error(e);
                                alert("删除失败，请稍后重试");
                              }
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                          >
                            删除
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

      {quickView && surveyType === "student" && <StudentQuickViewModal record={quickView} onClose={() => setQuickView(null)} />}
      {quickView && surveyType === "family" && <FamilyQuickViewModal record={quickView} onClose={() => setQuickView(null)} />}
      {reportView && <ReportModal record={reportView} onClose={() => setReportView(null)} />}
    </div>
  );
}