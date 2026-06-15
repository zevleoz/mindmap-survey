"use client";

import type { SurveyScores, Dimension, PressureDimension } from "@/lib/survey-data";

// ============================================================
// 颜色常量（使用 hex，避免 oklch —— html2canvas 1.4 不支持 oklch）
// ============================================================
const COLOR_AMBER = "#B45309";
const COLOR_TEAL = "#0D9488";
const COLOR_SLATE = "#475569";
const COLOR_SLATE_LIGHT = "#E2E8F0";
const COLOR_SLATE_BG = "#F8FAFC";
const COLOR_SLATE_DARK = "#0F172A";

// 维度列表
const THINKING = "思维模式" as Dimension;
const INTRINSIC: Dimension[] = ["自主性", "胜任感", "归属感"];
const MOTIVATION: Dimension[] = ["深层动机", "表层动机", "自我效能感"];
const METHOD: Dimension[] = ["深层方法", "表层方法", "学习自我调节"];
const PRESSURE_DIMS: PressureDimension[] = [
  "学业负担",
  "师生关系",
  "家庭期望",
  "同伴竞争",
  "自我要求",
];

// ============================================================
// SVG 圆环图（用于 PDF 模板 - 浏览器原生 SVG，html2canvas 支持）
// ============================================================
function RingSvg({
  percent,
  size,
  strokeWidth,
  color,
}: {
  percent: number;
  size: number;
  strokeWidth: number;
  color: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {/* 底环 */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={COLOR_SLATE_LIGHT}
        strokeWidth={strokeWidth}
      />
      {/* 进度环 */}
      {percent > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
    </svg>
  );
}

// ============================================================
// 学业压力雷达图（SVG，浏览器原生）
// ============================================================
function RadarSvg({ values, size = 180 }: { values: number[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30;
  const num = 5;
  const maxValue = 5;

  const points = [];
  for (let i = 0; i < num; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
    const v = Math.min(values[i] ?? 0, maxValue);
    const scale = v / maxValue;
    points.push({
      x: cx + radius * scale * Math.cos(angle),
      y: cy + radius * scale * Math.sin(angle),
    });
  }

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const grids = gridLevels.map((lvl) =>
    Array.from({ length: num }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
      return `${(cx + radius * lvl * Math.cos(angle)).toFixed(1)},${(
        cy + radius * lvl * Math.sin(angle)
      ).toFixed(1)}`;
    }).join(" ")
  );

  const radialLines = [];
  for (let i = 0; i < num; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
    radialLines.push({
      x1: cx,
      y1: cy,
      x2: cx + radius * Math.cos(angle),
      y2: cy + radius * Math.sin(angle),
    });
  }

  const dataPoints = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const labels = PRESSURE_DIMS;
  const labelRadius = radius + 20;
  const labelPositions = labels.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
    return {
      text: labels[i],
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {grids.map((pts, i) => (
        <polygon
          key={`g-${i}`}
          points={pts}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth={0.8}
        />
      ))}
      {radialLines.map((ln, i) => (
        <line
          key={`r-${i}`}
          x1={ln.x1}
          y1={ln.y1}
          x2={ln.x2}
          y2={ln.y2}
          stroke="#CBD5E1"
          strokeWidth={0.8}
        />
      ))}
      <polygon
        points={dataPoints}
        fill={COLOR_TEAL}
        fillOpacity={0.25}
        stroke={COLOR_TEAL}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2.5} fill={COLOR_TEAL} />
      ))}
      {labelPositions.map((lp, i) => (
        <text
          key={`lbl-${i}`}
          x={lp.x}
          y={lp.y + 3}
          textAnchor="middle"
          fill={COLOR_SLATE_DARK}
          style={{ fontSize: 9, fontWeight: 700 }}
        >
          {lp.text}
        </text>
      ))}
    </svg>
  );
}

// ============================================================
// 小圆环卡片：圆环 + 数字 + 维度名
// ============================================================
function RingCell({
  percent,
  scoreText,
  label,
  color,
  size = 50,
  strokeWidth = 4,
}: {
  percent: number;
  scoreText: string;
  label: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: COLOR_SLATE_BG,
        borderRadius: 6,
        paddingTop: 10,
        paddingBottom: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* 绝对定位叠加：SVG + 数字 */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RingSvg percent={percent} size={size} strokeWidth={strokeWidth} color={color} />
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 11,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {scoreText}
        </span>
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          fontWeight: 700,
          color: COLOR_SLATE_DARK,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 8.5,
          color: COLOR_SLATE,
        }}
      >
        / 10 分
      </div>
    </div>
  );
}

// ============================================================
// 思维模式大卡片
// ============================================================
function ThinkingBlock({
  percent,
  scoreText,
  avg,
  label,
  color,
}: {
  percent: number;
  scoreText: string;
  avg: number;
  label: string;
  color: string;
}) {
  const size = 100;
  const strokeWidth = 9;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        background: COLOR_SLATE_BG,
        borderRadius: 8,
        padding: 14,
      }}
    >
      {/* 左：大圆环 */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RingSvg percent={percent} size={size} strokeWidth={strokeWidth} color={color} />
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 20,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {scoreText}
        </span>
      </div>

      {/* 右：文字 */}
      <div
        style={{
          marginLeft: 18,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            fontWeight: 700,
            color: COLOR_SLATE_DARK,
          }}
        >
          综合得分：{avg.toFixed(1)} / 10
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: COLOR_SLATE,
            lineHeight: 1.4,
          }}
        >
          该维度反映学生对能力可塑性的认知倾向。
        </div>
        <div
          style={{
            fontSize: 9,
            color: COLOR_SLATE,
            lineHeight: 1.4,
          }}
        >
          成长型思维者相信能力可以通过努力提升，面对挑战更具韧性。
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Section 标题
// ============================================================
function SectionTitle({
  title,
  hint,
  color,
}: {
  title: string;
  hint?: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          width: 3,
          height: 12,
          background: color,
          marginRight: 8,
          borderRadius: 1.5,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: COLOR_SLATE_DARK,
        }}
      >
        {title}
      </span>
      {hint && (
        <span style={{ fontSize: 9, color: COLOR_SLATE, marginLeft: 10 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ============================================================
// PDF 模板组件（渲染在隐藏容器中，由 html2canvas 捕获）
// ============================================================
interface PdfTemplateProps {
  name: string;
  scores: SurveyScores;
  dateStr?: string;
}

export function PdfTemplate({ name, scores, dateStr }: PdfTemplateProps) {
  const d = new Date();
  const date =
    dateStr ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const thinkingAvg = (scores.average10?.[THINKING] as number) ?? 0;
  const thinkingPct = (scores.percent?.[THINKING] as number) ?? 0;
  const mindsetLabel = scores.mindsetLabel ?? "成长型思维";

  const pressureValues = PRESSURE_DIMS.map(
    (dim) => (scores.pressure?.[dim] as number) ?? 0
  );
  const pressureAvg =
    pressureValues.reduce((a, b) => a + b, 0) / pressureValues.length;

  return (
    <div
      data-pdf-template
      style={{
        width: 794, // A4 宽度（96dpi）
        background: "#ffffff",
        padding: 40,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif',
        color: COLOR_SLATE_DARK,
        boxSizing: "border-box",
      }}
    >
      {/* ========== 顶部：标题 + 姓名日期 ========== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 10,
          borderBottom: `2px solid ${COLOR_AMBER}`,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: COLOR_AMBER,
            letterSpacing: 1,
          }}
        >
          学习力测评报告
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: COLOR_SLATE }}>
            姓名：{name || "—"}
          </div>
          <div
            style={{ fontSize: 10, color: COLOR_SLATE, marginTop: 2 }}
          >
            日期：{date}
          </div>
        </div>
      </div>

      {/* ========== Section 1：思维模式 ========== */}
      <SectionTitle title="思维模式" color={COLOR_AMBER} />
      <ThinkingBlock
        percent={thinkingPct}
        scoreText={thinkingAvg.toFixed(1)}
        avg={thinkingAvg}
        label={mindsetLabel}
        color={COLOR_AMBER}
      />

      {/* ========== Section 2：内在动力（3 维度） ========== */}
      <SectionTitle
        title="内在动力"
        hint="自主性 · 胜任感 · 归属感"
        color={COLOR_AMBER}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {INTRINSIC.map((dim, idx) => {
          const avg = (scores.average10?.[dim] as number) ?? 0;
          const pct = (scores.percent?.[dim] as number) ?? 0;
          return (
            <div
              key={dim}
              style={{ flex: 1, marginRight: idx < INTRINSIC.length - 1 ? 0 : 0 }}
            >
              <RingCell
                percent={pct}
                scoreText={avg.toFixed(1)}
                label={dim}
                color={COLOR_AMBER}
                size={50}
                strokeWidth={4}
              />
            </div>
          );
        })}
      </div>

      {/* ========== Section 3：学习动机与效能（3 维度） ========== */}
      <SectionTitle
        title="学习动机与效能"
        hint="深层 · 表层 · 自我效能"
        color={COLOR_AMBER}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {MOTIVATION.map((dim, idx) => {
          const avg = (scores.average10?.[dim] as number) ?? 0;
          const pct = (scores.percent?.[dim] as number) ?? 0;
          return (
            <div key={dim} style={{ flex: 1 }}>
              <RingCell
                percent={pct}
                scoreText={avg.toFixed(1)}
                label={dim}
                color={COLOR_AMBER}
                size={50}
                strokeWidth={4}
              />
            </div>
          );
        })}
      </div>

      {/* ========== Section 4：学习方法与调节（3 维度） ========== */}
      <SectionTitle
        title="学习方法与调节"
        hint="深层 · 表层 · 自我调节"
        color={COLOR_AMBER}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {METHOD.map((dim) => {
          const avg = (scores.average10?.[dim] as number) ?? 0;
          const pct = (scores.percent?.[dim] as number) ?? 0;
          return (
            <div key={dim} style={{ flex: 1 }}>
              <RingCell
                percent={pct}
                scoreText={avg.toFixed(1)}
                label={dim}
                color={COLOR_AMBER}
                size={50}
                strokeWidth={4}
              />
            </div>
          );
        })}
      </div>

      {/* ========== Section 5：学业压力（左列表 + 右雷达图） ========== */}
      <SectionTitle
        title="学业压力分析"
        hint="（满分 5 分）"
        color={COLOR_TEAL}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        {/* 左：5 维度分数列表 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          {PRESSURE_DIMS.map((dim) => {
            const v = (scores.pressure?.[dim] as number) ?? 0;
            return (
              <div
                key={dim}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: COLOR_SLATE_BG,
                  borderRadius: 4,
                  paddingTop: 5,
                  paddingBottom: 5,
                  paddingLeft: 10,
                  paddingRight: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: COLOR_SLATE_DARK,
                  }}
                >
                  {dim}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: COLOR_TEAL,
                  }}
                >
                  {v.toFixed(1)} / 5
                </span>
              </div>
            );
          })}
          {/* 综合压力水平 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#CCFBF1",
              borderRadius: 4,
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 10,
              paddingRight: 10,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: COLOR_TEAL,
              }}
            >
              综合压力水平
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLOR_TEAL,
              }}
            >
              {Math.round(pressureAvg * 10) / 10} / 5
            </span>
          </div>
        </div>

        {/* 右：雷达图 */}
        <div
          style={{
            width: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RadarSvg values={pressureValues} size={180} />
        </div>
      </div>

      {/* ========== 页脚 ========== */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 8,
          borderTop: `1px solid #E2E8F0`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: COLOR_SLATE,
        }}
      >
        <span>
          学生：{name || "—"} · 测评日期：{date}
        </span>
        <span>凭远教育 APP-ARK</span>
      </div>
    </div>
  );
}
