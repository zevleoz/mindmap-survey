"use client";

import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";

import { CircularProgress } from "@/components/survey/circular-progress";
import { PressureRadar } from "@/components/survey/pressure-radar";
import { PdfTemplate } from "@/components/survey/pdf-template";
import {
  PRESSURE_DIMENSIONS,
  type SurveyScores,
} from "@/lib/survey-data";

interface ResultViewProps {
  name: string;
  scores: SurveyScores;
  onRestart: () => void;
}

const LEARNING_DIM_GROUPS: {
  title: string;
  items: { key: keyof SurveyScores["average10"]; label: string }[];
}[] = [
  {
    title: "思维模式",
    items: [{ key: "思维模式", label: "思维模式" }],
  },
  {
    title: "自驱力",
    items: [
      { key: "自主性", label: "自主性" },
      { key: "胜任感", label: "胜任感" },
      { key: "归属感", label: "归属感" },
    ],
  },
  {
    title: "学习动力",
    items: [
      { key: "深层动机", label: "深层动机" },
      { key: "表层动机", label: "表层动机" },
      { key: "自我效能感", label: "自我效能感" },
    ],
  },
  {
    title: "学习方法与策略",
    items: [
      { key: "深层方法", label: "深层方法" },
      { key: "表层方法", label: "表层方法" },
      { key: "学习自我调节", label: "学习自我调节" },
    ],
  },
];

function SectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-[18px] bg-white p-4 sm:p-5 shadow-[0_2px_8px_rgba(184,115,51,0.08)] border border-slate-100">
      {children}
    </div>
  );
}

export function ResultView({ name, scores, onRestart }: ResultViewProps) {
  const [exporting, setExporting] = useState(false);

  const thinkingAvg = (scores.average10?.["思维模式"] as number) ?? 0;
  const thinkingPct = (scores.percent?.["思维模式"] as number) ?? 0;
  const mindsetLabel = scores.mindsetLabel;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  function RingRow({
    color,
    items,
  }: {
    color: "amber" | "teal";
    items: { key: keyof SurveyScores["average10"]; label: string }[];
  }) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {items.map((item) => {
          const avg = (scores.average10?.[item.key] as number) ?? 0;
          const pct = (scores.percent?.[item.key] as number) ?? 0;
          return (
            <motion.div
              key={String(item.key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-2"
            >
              <CircularProgress
                value={pct}
                size={120}
                strokeWidth={6}
                color={color}
                showNumber
                displayNumber={avg.toFixed(1)}
              />
              <div className="text-sm font-medium text-slate-700">
                {item.label}
              </div>
              <div className="text-xs text-slate-400">/ 10 分</div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  const resultRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      // 1. 动态导入 html2canvas 和 jsPDF（避免 SSR 加载重型库）
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all(
        [import("html2canvas"), import("jspdf")]
      );

      // 2. 创建一个离屏容器来渲染 PDF 模板
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0";
      container.style.width = "794px";
      container.style.zIndex = "-1";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      document.body.appendChild(container);

      // 3. 使用 React 把 PdfTemplate 渲染到容器
      const root = createRoot(container);

      await new Promise<void>((resolve) => {
        // 在回调里渲染并等待 DOM 完成
        root.render(<PdfTemplate name={name} scores={scores} dateStr={dateStr} />);
        // 给浏览器一帧时间完成渲染
        requestAnimationFrame(() => setTimeout(() => resolve(), 50));
      });

      // 4. 用 html2canvas 捕获 PDF 模板的内容
      const templateEl = container.querySelector('[data-pdf-template]');
      if (!templateEl) {
        throw new Error("PDF 模板未找到");
      }

      const canvas = await html2canvas(templateEl as HTMLElement, {
        scale: 2, // 高清
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // 5. 清理离屏容器
      root.unmount();
      document.body.removeChild(container);

      // 6. 用 jsPDF 生成 PDF（A4 纵向）
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 如果内容超过一页，需要分页
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 7. 下载
      pdf.save(`${name || "学生"}_学习力测评报告_${yyyy}${mm}${dd}.pdf`);
    } catch (err) {
      console.error("PDF 导出失败:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`PDF 生成失败：${msg}\n\n请重试`);
    } finally {
      setExporting(false);
    }
  };

  // ========================= 页面渲染 =========================
  return (
    <div ref={resultRef} className="mx-auto flex max-w-3xl w-full flex-col gap-4 bg-white px-3 py-6 sm:px-5 sm:py-8">
      {/* 顶部品牌标识 */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <img
          src="/branding/logo_color.png"
          alt="凭远教育"
          className="h-8 w-auto object-contain"
        />
        <span>学习力测评报告 · {yyyy}-{mm}-{dd}</span>
      </div>
      {/* 封面：思维模式大圆环 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SectionShell>
          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-700" />
              学习力测评报告
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              你好，{name || "同学"}
            </h2>
            <p className="text-sm text-slate-500">
              以下是你的学习力与学业压力多维分析结果 · {yyyy}-{mm}-{dd}
            </p>
            <div className="flex w-full flex-col items-center gap-6 border-t border-slate-100 pt-6 sm:flex-row sm:justify-center">
              <CircularProgress
                value={thinkingPct}
                size={160}
                strokeWidth={7}
                color="amber"
                showNumber
                displayNumber={thinkingAvg.toFixed(1)}
              />
              <div className="flex flex-col items-center gap-3 sm:items-start">
                <div>
                  <p className="text-sm font-medium text-slate-700">思维模式</p>
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="text-slate-700">综合得分</span> · {thinkingAvg.toFixed(1)} / 10
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  {mindsetLabel}
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
      </motion.div>

      {/* 学习力各维度 */}
      {LEARNING_DIM_GROUPS.slice(1).map((g) => (
        <motion.div
          key={g.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <SectionShell>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block h-5 w-1 rounded-sm bg-amber-700" />
              <h3 className="text-base font-semibold text-slate-700">{g.title}</h3>
            </div>
            <RingRow color="amber" items={g.items} />
          </SectionShell>
        </motion.div>
      ))}

      {/* 学业压力雷达图 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <SectionShell>
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-block h-5 w-1 rounded-sm bg-teal-600" />
            <h3 className="text-base font-semibold text-slate-700">学业压力分析</h3>
            <span className="ml-auto text-xs text-slate-500">满分 5 分</span>
          </div>

          {/* 桌面端：左列表右雷达图；移动端：上雷达图下列表 */}
          <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:gap-10">
            {/* 雷达图（移动端在上、桌面端在右） */}
            <div className="order-1 lg:order-2 flex-1 overflow-visible">
              <div className="mx-auto h-[380px] w-full lg:h-[440px] overflow-visible">
                <PressureRadar pressure={scores.pressure ?? {}} showAverage />
              </div>
            </div>

            {/* 左边：维度列表 */}
            <div className="order-2 lg:order-1 flex-1">
              <div>
                {PRESSURE_DIMENSIONS.map((d, i) => {
                  const v = (scores.pressure?.[d] as number) ?? 0;
                  return (
                    <div
                      key={d}
                      className={
                        "flex h-14 items-center justify-between px-2 " +
                        (i === PRESSURE_DIMENSIONS.length - 1
                          ? ""
                          : "border-b border-slate-100")
                      }
                    >
                      <span className="text-base font-medium leading-none text-slate-700">
                        {d}
                      </span>
                      <span className="flex items-center">
                        <span className="text-lg font-bold leading-none tabular-nums text-teal-600">
                          {v.toFixed(1)}
                        </span>
                        <span className="ml-0.5 text-sm font-normal leading-none text-slate-400">
                          / 5
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 综合压力水平：突出显示 */}
              <div className="mt-4 flex h-14 items-center justify-between rounded-xl bg-teal-50 px-4">
                <span className="font-semibold leading-none text-teal-800">
                  综合压力水平
                </span>
                <span className="flex items-center">
                  <span className="text-xl font-bold leading-none tabular-nums text-teal-700">
                    {(
                      Math.round(
                        (PRESSURE_DIMENSIONS.reduce(
                          (sum, d) =>
                            sum + ((scores.pressure?.[d] as number) ?? 0),
                          0
                        ) /
                          PRESSURE_DIMENSIONS.length) *
                          10
                      ) / 10
                    ).toFixed(1)}
                  </span>
                  <span className="ml-1 text-sm font-normal leading-none text-slate-400">
                    / 5
                  </span>
                </span>
              </div>
            </div>
          </div>
        </SectionShell>
      </motion.div>

      {/* 底部操作 */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          disabled={exporting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDownloadPDF();
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-700 text-base font-semibold text-white transition-all hover:bg-amber-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
        >
          <Download className="size-4" />
          {exporting ? "生成中..." : "下载测评报告（PDF）"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRestart();
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 transition-all active:scale-95"
        >
          <RotateCcw className="size-4" />
          重新测评
        </button>
      </div>

      {/* 页脚：品牌 logo + 版权 */}
      <div className="mt-6 flex flex-col items-center gap-2 border-t border-slate-100 pt-5">
        <img
          src="/branding/logo_inline.png"
          alt="凭远教育 APP-ARK"
          className="h-6 w-auto object-contain opacity-80"
        />
        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          凭远教育 APP-ARK © {yyyy}　·　本报告为个性化测评结果，仅供参考
        </p>
      </div>
    </div>
  );
}
