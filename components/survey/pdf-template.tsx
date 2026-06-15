"use client";

import type { SurveyScores, Dimension, PressureDimension } from "@/lib/survey-data";

// ============================================================
// 颜色常量
// ============================================================
const COLOR_AMBER = "#B45309";
const COLOR_TEAL = "#0D9488";
const COLOR_SLATE = "#475569";
const COLOR_SLATE_LIGHT = "#E2E8F0";
const COLOR_SLATE_BG = "#F8FAFC";
const COLOR_SLATE_DARK = "#0F172A";

// 维度分组
const THINKING = "思维模式" as Dimension;
const INTRINSIC: Dimension[] = ["自主性", "胜任感", "归属感"];
const MOTIVATION: Dimension[] = ["深层动机", "表层动机", "自我效能感"];
const METHOD: Dimension[] = ["深层方法", "表层方法", "学习自我调节"];
const PRESSURE_DIMS: PressureDimension[] = [
  "学业负担",
  "家庭期望",
  "师生关系",
  "同伴竞争",
  "自我要求",
];

// ============================================================
// SVG 圆环图
// ============================================================
function RingSvg({
  percent,
  size,
  strokeWidth,
  color,
  centerText,
  centerFontSize = 11,
}: {
  percent: number;
  size: number;
  strokeWidth: number;
  color: string;
  centerText?: string;
  centerFontSize?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset =
    circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={COLOR_SLATE_LIGHT}
        strokeWidth={strokeWidth}
      />
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
      {/* 圆环中心数字：用 SVG text 精确居中，避免 html2canvas 对 flex 的差异 */}
      {centerText && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{
            fontSize: centerFontSize,
            fontWeight: 700,
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
          }}
        >
          {centerText}
        </text>
      )}
    </svg>
  );
}

// ============================================================
// 学业压力雷达图（5 维度）
// 标签位置：上(学业负担)、右上(师生关系)、右下(家庭期望)、左下(同伴竞争)、左(自我要求)
// ============================================================
function RadarSvg({ values, size = 260 }: { values: number[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 70; // 主体更紧凑，留更多空间给标签
  const num = 5;
  const maxValue = 5;

  // 数据点
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

  // 网格多边形（0.25 / 0.5 / 0.75 / 1.0 共 4 层）
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const grids = gridLevels.map((lvl) =>
    Array.from({ length: num }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
      return `${(cx + radius * lvl * Math.cos(angle)).toFixed(1)},${(
        cy + radius * lvl * Math.sin(angle)
      ).toFixed(1)}`;
    }).join(" ")
  );

  // 平均水平 = 3 分的五边形（scale = 3/5 = 0.6）
  const avgScale = 3 / 5;
  const avgPoints = Array.from({ length: num }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
    return `${(cx + radius * avgScale * Math.cos(angle)).toFixed(1)},${(
      cy + radius * avgScale * Math.sin(angle)
    ).toFixed(1)}`;
  }).join(" ");

  // 辐射线
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

  // 数据填充多边形
  const dataPoints = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // 五个角落标签：放在更远的外圈，不遮挡五边形
  //  i=0: 学业负担（上）
  //  i=1: 师生关系（右上）
  //  i=2: 家庭期望（右下）
  //  i=3: 同伴竞争（左下）
  //  i=4: 自我要求（左）
  const labels = PRESSURE_DIMS;
  const labelRadius = radius + 20; // 标签紧挨着五边形外沿，完全在 SVG 范围内
  const labelPositions = labels.map((lbl, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
    const x = cx + labelRadius * Math.cos(angle);
    const y = cy + labelRadius * Math.sin(angle);

    let anchor: "start" | "middle" | "end" = "middle";
    let dy = "0.35em";
    if (i === 0) { anchor = "middle"; dy = "-0.25em"; }    // 上：正上方居中
    else if (i === 1) { anchor = "start"; dy = "0.3em"; }   // 右上：向右展开
    else if (i === 2) { anchor = "start"; dy = "0.3em"; }   // 右下：向右展开
    else if (i === 3) { anchor = "end"; dy = "0.3em"; }     // 左下：向左展开
    else if (i === 4) { anchor = "end"; dy = "0.3em"; }     // 左：向左展开

    return { text: lbl, x, y, anchor, dy };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {/* 背景网格：淡色 */}
      {grids.map((pts, i) => (
        <polygon
          key={`g-${i}`}
          points={pts}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={1}
        />
      ))}
      {radialLines.map((ln, i) => (
        <line
          key={`r-${i}`}
          x1={ln.x1}
          y1={ln.y1}
          x2={ln.x2}
          y2={ln.y2}
          stroke="#E2E8F0"
          strokeWidth={1}
        />
      ))}
      {/* 平均水平（3 分）五边形：灰色虚线 */}
      <polygon
        points={avgPoints}
        fill="none"
        stroke="#94A3B8"
        strokeWidth={1.2}
        strokeDasharray="4 3"
        strokeLinejoin="round"
      />
      {/* 学生得分（teal-600）：加粗 + 填充 */}
      <polygon
        points={dataPoints}
        fill={COLOR_TEAL}
        fillOpacity={0.28}
        stroke={COLOR_TEAL}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2.5} fill={COLOR_TEAL} />
      ))}
      {/* 五个角落标签：字号适中，不遮挡主体 */}
      {labelPositions.map((lp, i) => (
        <text
          key={`lbl-${i}`}
          x={lp.x}
          y={lp.y}
          textAnchor={lp.anchor}
          dy={lp.dy}
          fill={COLOR_SLATE_DARK}
          style={{ fontSize: 11, fontWeight: 700 }}
        >
          {lp.text}
        </text>
      ))}
    </svg>
  );
}

// ============================================================
// 小圆环卡片：圆环 + 数字 + 维度名
// 关键：数字在圆环中心绝对居中
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
      {/* 圆环 + 数字叠加：数字在 SVG 内用 textAnchor=middle 精确居中 */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
        }}
      >
        <RingSvg
          percent={percent}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
          centerText={scoreText}
          centerFontSize={11}
        />
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
      {/* 左：大圆环 - 数字通过 SVG text 精确水平/垂直居中 */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <RingSvg
          percent={percent}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
          centerText={scoreText}
          centerFontSize={20}
        />
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
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{label}</div>
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
  // 竖线 bar 与标题文字顶部对齐：
  // 用 flex-start + 显式 marginTop = 0，确保竖线与文字第一行顶部平齐
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginTop: 14,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* 竖线放在标题文字的 border-left 上，这样竖线顶端与文字字符顶端天然对齐 */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLOR_SLATE_DARK,
            lineHeight: 1.2,
            letterSpacing: 0.5,
            borderLeft: `4px solid ${color}`,
            paddingLeft: 8,
            borderRadius: 2,
          }}
        >
          {title}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 10,
              color: COLOR_SLATE,
              marginLeft: 10,
              lineHeight: 1.2,
              paddingTop: 3,
            }}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PDF 模板主组件
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

  // 三个 section 的维度
  const section2Dims: Dimension[] = INTRINSIC; // 自驱力
  const section3Dims: Dimension[] = MOTIVATION; // 学习动力
  const section4Dims: Dimension[] = METHOD; // 学习方法与策略

  const renderDimRow = (dims: Dimension[]) => (
    <div style={{ display: "flex", gap: 12 }}>
      {dims.map((dim) => {
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
  );

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
        position: "relative", // 为水印提供定位基准
      }}
    >
      {/* ========== 水印：半透明平铺 fill 整页，不阻挡内容 ========== */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          userSelect: "none",
          backgroundImage: "url('/branding/watermark.jpg')",
          backgroundSize: "300px 300px",
          backgroundRepeat: "repeat",
          backgroundPosition: "0 0",
          opacity: 0.12,
          imageRendering: "-webkit-optimize-contrast",
        }}
      />
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
        <div style={{ fontSize: 16, fontWeight: 700, color: COLOR_AMBER, letterSpacing: 1 }}>
          学习力测评报告
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: COLOR_SLATE }}>
            姓名：{name || "—"}
          </div>
          <div style={{ fontSize: 10, color: COLOR_SLATE, marginTop: 2 }}>
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

      {/* ========== Section 2：自驱力（3 维度） ========== */}
      <SectionTitle
        title="自驱力"
        hint="自主性 · 胜任感 · 归属感"
        color={COLOR_AMBER}
      />
      {renderDimRow(section2Dims)}

      {/* ========== Section 3：学习动力（3 维度） ========== */}
      <SectionTitle
        title="学习动力"
        hint="深层 · 表层 · 自我效能"
        color={COLOR_AMBER}
      />
      {renderDimRow(section3Dims)}

      {/* ========== Section 4：学习方法与策略（3 维度） ========== */}
      <SectionTitle
        title="学习方法与策略"
        hint="深层 · 表层 · 自我调节"
        color={COLOR_AMBER}
      />
      {renderDimRow(section4Dims)}

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
          gap: 28,
        }}
      >
        {/* 左：5 维度分数列表 - 紧凑排版：行高 40px，字体较小 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {PRESSURE_DIMS.map((dim, i) => {
            const v = (scores.pressure?.[dim] as number) ?? 0;
            return (
              <div
                key={dim}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: 40,
                  paddingLeft: 8,
                  paddingRight: 8,
                  borderBottom:
                    i === PRESSURE_DIMS.length - 1 ? "none" : "1px solid #E2E8F0",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: COLOR_SLATE_DARK,
                    lineHeight: 1,
                  }}
                >
                  {dim}
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: COLOR_TEAL,
                      lineHeight: 1,
                    }}
                  >
                    {v.toFixed(1)}
                  </span>
                  <span
                    style={{
                      marginLeft: 3,
                      fontSize: 10,
                      color: COLOR_SLATE,
                      lineHeight: 1,
                    }}
                  >
                    / 5
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* 右：雷达图 - 放大占满右侧空间，底部加 Legend 居中 */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflow: "visible",
          }}
        >
          <RadarSvg values={pressureValues} size={260} />

          {/* Legend：学生得分 / 平均水平 (3 分) 居中 */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 20,
              marginTop: 6,
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: COLOR_TEAL,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: COLOR_SLATE_DARK,
                  lineHeight: 1,
                }}
              >
                学生得分
              </span>
            </span>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  borderTop: `1px dashed ${COLOR_SLATE_LIGHT === "#E2E8F0" ? "#94A3B8" : COLOR_SLATE}`,
                  height: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: COLOR_SLATE_DARK,
                  lineHeight: 1,
                }}
              >
                平均水平 (3 分)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ========== 页脚 ========== */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 10,
          borderTop: `1px solid #E2E8F0`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          color: COLOR_SLATE,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src="/branding/logo_inline.png"
            alt="凭远教育"
            style={{ width: 70, height: "auto", objectFit: "contain" }}
          />
          <span>凭远教育 APP-ARK · 本报告为个性化测评结果，仅供参考</span>
        </div>
        <span>
          学生：{name || "—"} · 测评日期：{date}
        </span>
      </div>
    </div>
  );
}
