"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import { CircularProgress } from "@/components/survey/circular-progress";
import { PressureRadar } from "@/components/survey/pressure-radar";
import { Button } from "@/components/ui/button";
import {
  PRESSURE_DIMENSIONS,
  type SurveyScores,
} from "@/lib/survey-data";

interface ResultViewProps {
  name: string;
  scores: SurveyScores;
  onRestart: () => void;
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-white p-6 shadow-[0_2px_8px_rgba(184,115,51,0.08)] border border-slate-100">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1 rounded-sm bg-amber-700" />
          <div>
            <h3 className="text-base font-semibold text-slate-700">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ResultView({ name, scores, onRestart }: ResultViewProps) {
  const coverRef = useRef<HTMLDivElement>(null);
  const intrinsicRef = useRef<HTMLDivElement>(null);
  const motivationRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);
  const pressureRef = useRef<HTMLDivElement>(null);

  const [exporting, setExporting] = useState(false);
  const [progressText, setProgressText] = useState("");

  const thinkingPercent = scores.percent?.思维模式 ?? 0;
  const thinkingLabel = scores.mindsetLabel || "学习力";

  const intrinsicGroup = [
    { key: "自主性" as const, label: "自主性" },
    { key: "胜任感" as const, label: "胜任感" },
    { key: "归属感" as const, label: "归属感" },
  ];
  const motivationGroup = [
    { key: "深层动机" as const, label: "深层动机" },
    { key: "表层动机" as const, label: "表层动机" },
    { key: "自我效能感" as const, label: "自我效能感" },
  ];
  const methodGroup = [
    { key: "深层方法" as const, label: "深层学习方法" },
    { key: "表层方法" as const, label: "表层学习方法" },
    { key: "学习自我调节" as const, label: "学习自我调节" },
  ];

  const renderCircleGroup = (
    items: { key: keyof SurveyScores["percent"]; label: string }[]
  ) => (
    <div className="rounded-2xl bg-amber-50/40 p-6">
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => {
          const pct = (scores.percent?.[item.key] as number) ?? 0;
          const avg = (scores.average10?.[item.key] as number) ?? 0;
          return (
            <div key={item.key} className="flex flex-col items-center gap-3">
              <CircularProgress
              value={pct}
              size={88}
              strokeWidth={3}
              showLabel={false}
              />
              <p className="text-center text-sm font-medium text-slate-700 leading-tight">
                {item.label}
              </p>
              <p className="text-center text-2xl font-bold tabular-nums text-amber-700">
                {avg.toFixed(1)}
                <span className="text-slate-400 text-xs font-normal">/10</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  const pressureData = PRESSURE_DIMENSIONS.map((dim) => ({
    dimension: dim,
    value: (scores.pressure?.[dim] as number) ?? 0,
  }));

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const pdfFileName = `${name || "学生"}_学习力测评报告_${yyyy}${mm}${dd}.pdf`;

  async function captureSection(
    ref: React.RefObject<HTMLDivElement>,
    stepName: string
  ): Promise<HTMLCanvasElement | null> {
    if (!ref.current) return null;
    setProgressText(stepName);
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    return canvas;
  }

  function addImageToPdf(
    pdf: jsPDF,
    canvas: HTMLCanvasElement
  ) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeightPx = (canvas.height * imgWidth) / canvas.width;
    const imgHeightMm = imgHeightPx; // html2canvas scale=2 时 1px ≈ 1/96 inch，这里我们直接用 img 像素比
    // 修正：canvas 的像素宽度被等比缩放到 imgWidth 毫米，所以 1 像素 = imgWidth / canvas.width 毫米
    // 即 imgHeightMm = canvas.height * imgWidth / canvas.width = (canvas.height * imgWidth) / canvas.width (mm)
    const usableHeight = pageHeight - margin * 2;
    const imgData = canvas.toDataURL("image/png");

    // 计算每页在 canvas 中的像素高度（对应 usableHeight mm）
    const pxPerMm = canvas.width / imgWidth;
    const pagePxHeight = usableHeight * pxPerMm;
    let offsetPx = 0;
    let firstPage = true;

    while (offsetPx < canvas.height) {
      if (!firstPage) pdf.addPage();
      firstPage = false;
      // 从 source canvas 的 offsetPx 处取 pagePxHeight 高度
      const sliceHeight = Math.min(pagePxHeight, canvas.height - offsetPx);
      // 创建局部 canvas，避免大图分页失真
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const sctx = sliceCanvas.getContext("2d");
      if (!sctx) break;
      sctx.fillStyle = "#ffffff";
      sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sctx.drawImage(canvas, 0, -offsetPx);

      const sliceData = sliceCanvas.toDataURL("image/png");
      const sliceMmHeight = (sliceHeight * imgWidth) / canvas.width;
      pdf.addImage(sliceData, "PNG", margin, margin, imgWidth, sliceMmHeight);
      offsetPx += pagePxHeight;
    }
  }

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      setProgressText("准备导出 PDF");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // 每页独立 capture，保证每个图表不被切分
      const captures: { ref: React.RefObject<HTMLDivElement>; stepName: string }[] = [
        { ref: coverRef, stepName: "封面" },
        { ref: intrinsicRef, stepName: "内在动力" },
        { ref: motivationRef, stepName: "学习动机与效能" },
        { ref: methodRef, stepName: "学习方法与调节" },
        { ref: pressureRef, stepName: "学业压力" },
      ];

      for (let i = 0; i < captures.length; i++) {
        const { ref, stepName } = captures[i];
        const canvas = await captureSection(ref, stepName);
        if (!canvas) continue;
        if (i > 0) pdf.addPage();
        addImageToPdf(pdf, canvas);
      }

      pdf.save(pdfFileName);
    } catch (err) {
      console.error("PDF 导出失败", err);
      alert("PDF 导出失败，请重试");
    } finally {
      setExporting(false);
      setProgressText("");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      {/* 封面：思维模式大圆环 */}
      <div
        ref={coverRef}
        className="rounded-[20px] bg-white p-6 shadow-[0_2px_8px_rgba(184,115,51,0.08)] border border-slate-100"
        style={{ pageBreakInside: "avoid" }}
      >
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold text-amber-700 text-center">
            学习力测评报告
          </h2>
          <p className="text-sm text-slate-500">
            姓名：{name || "—"} · 测评日期：{yyyy}-{mm}-{dd}
          </p>
          <div className="flex items-center gap-6 mt-4">
            <CircularProgress
              value={thinkingPercent}
              size={128}
              strokeWidth={3}
              labelClassName="text-2xl"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">思维模式</p>
              <p className="text-2xl font-bold tabular-nums text-amber-700">
                {(scores.average10?.思维模式 ?? 0).toFixed(1)}
                <span className="text-base font-normal text-slate-400">/10</span>
              </p>
              <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {thinkingLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 内在动力 */}
      <div ref={intrinsicRef} style={{ pageBreakInside: "avoid" }}>
        <SectionCard title="内在动力" subtitle="自主性、胜任感、归属感">
          {renderCircleGroup(intrinsicGroup)}
        </SectionCard>
      </div>

      {/* 学习动机与效能 */}
      <div ref={motivationRef} style={{ pageBreakInside: "avoid" }}>
        <SectionCard title="学习动机与效能" subtitle="深层动机、表层动机、自我效能感">
          {renderCircleGroup(motivationGroup)}
        </SectionCard>
      </div>

      {/* 学习方法与调节 */}
      <div ref={methodRef} style={{ pageBreakInside: "avoid" }}>
        <SectionCard title="学习方法与调节" subtitle="深层方法、表层方法、学习自我调节">
          {renderCircleGroup(methodGroup)}
        </SectionCard>
      </div>

      {/* 学业压力雷达图 */}
      <div
        ref={pressureRef} style={{ pageBreakInside: "avoid" }}>
        <div className="rounded-[20px] bg-white p-6 shadow-[0_2px_8px_rgba(184,115,51,0.08)] border border-slate-100">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-5 w-1 rounded-sm bg-violet-500" />
              <div>
                <h3 className="text-base font-semibold text-slate-700">
                  学业压力分析
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  五个维度的压力来源分布
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-violet-700">
              满分 5 分
            </span>
          </div>
          <PressureRadar pressure={scores.pressure ?? {}} showAverage />
          <div className="mt-4 rounded-2xl bg-violet-50/60 p-6">
            <div className="grid grid-cols-1 gap-2">
              {pressureData.map((d) => (
                <div
                  key={d.dimension}
                  className="flex items-center justify-between text-sm"
                >
                    <span className="text-slate-700 font-medium">
                      {d.dimension}
                    </span>
                    <span className="tabular-nums text-violet-700 font-bold">
                      {d.value.toFixed(1)}/5
                    </span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-center text-sm text-slate-500">
        {name}，以上为您的个人学习力报告
        </p>
        <Button
          className="h-12 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
          onClick={handleDownloadPDF}
          disabled={exporting}
        >
          <Download className="size-4" />
          {exporting
            ? progressText
              ? `正在生成 PDF（${progressText}）...`
              : "正在生成 PDF..."
            : "下载测评报告（PDF）"}
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full rounded-2xl border-slate-200 text-slate-700"
          onClick={onRestart}
        >
          <RotateCcw className="size-4" />
          重新测评
        </Button>
      </div>
    </div>
  );
}
