"use client";

import {
  Document,
  Page,
  Svg,
  Circle,
  Line,
  Polygon,
  Path,
  Text,
  View,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { SurveyScores, Dimension, PressureDimension } from "@/lib/survey-data";

// ============================================================
// 颜色常量
// ============================================================
const COLOR_AMBER = "#B45309"; // amber-700
const COLOR_TEAL = "#0D9488"; // teal-600
const COLOR_SLATE = "#475569"; // slate-600
const COLOR_SLATE_LIGHT = "#E2E8F0"; // slate-200
const COLOR_SLATE_BG = "#F8FAFC"; // slate-50
const COLOR_SLATE_DARK = "#0F172A"; // slate-900
const COLOR_GRID = "#CBD5E1"; // slate-300

// 维度分组
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
// 中文字体注册：使用 TTF 文件作为 font
// 如果字体加载失败，会退回到默认 Helvetica（PDF 内置）
// ============================================================
let fontReady = false;

export function registerChineseFont(fontUrl: string, boldUrl?: string) {
  if (fontReady) return;
  try {
    // @react-pdf/renderer 需要通过多次 register 注册不同字重
    // 使用 any 类型绕过严格检查（运行时正常工作）
    Font.register({
      family: "Chinese",
      src: fontUrl,
    } as any);
    if (boldUrl) {
      Font.register({
        family: "Chinese",
        src: boldUrl,
        fontWeight: 700,
      } as any);
    }
    Font.registerHyphenationCallback((word) => [word]);
    fontReady = true;
  } catch (e) {
    // 失败时静默降级到 Helvetica
  }
}

// 默认字体族
function FONT() {
  return fontReady ? "Chinese" : "Helvetica";
}

// ============================================================
// 圆环图（SVG Path + 外部数字）：
// - SVG 绘制底环和进度弧
// - 数字放在 SVG 下方或旁边（不使用 SVG Text）
// ============================================================
function Ring({
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
  const safePct = Math.max(0.1, Math.min(100, percent));

  // 从 12 点方向顺时针
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (safePct / 100) * 2 * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const sweep = 1;

  const arcD =
    safePct > 0
      ? `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`
      : `M ${cx} ${cy - r}`;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={COLOR_SLATE_LIGHT}
        strokeWidth={strokeWidth}
      />
      {safePct > 0 && (
        <Path
          d={arcD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

// 带数字的圆环卡片：圆环在上方，数字在下，维度名在最下
function RingCell({
  percent,
  scoreText,
  label,
  color,
  size,
  strokeWidth,
}: {
  percent: number;
  scoreText: string;
  label: string;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        marginRight: 8,
        backgroundColor: COLOR_SLATE_BG,
        borderRadius: 6,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 4,
        paddingRight: 4,
        alignItems: "center",
      }}
    >
      <Ring percent={percent} size={size} strokeWidth={strokeWidth} color={color} />
      <Text
        style={{
          fontFamily: FONT(),
          fontSize: 11,
          fontWeight: "bold",
          color,
          marginTop: 2,
        }}
      >
        {scoreText}
      </Text>
      <Text
        style={{
          fontFamily: FONT(),
          fontSize: 9,
          fontWeight: "bold",
          color: COLOR_SLATE_DARK,
          marginTop: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: FONT(),
          fontSize: 7.5,
          color: COLOR_SLATE,
          marginTop: 1,
        }}
      >
        / 10 分
      </Text>
    </View>
  );
}

// 思维模式大圆环：
// 左：圆环 + 中心数字（数字放在 SVG 外部的另一个 View 中）
// 右：标签 + 描述文字
function ThinkingBigRing({
  percent,
  scoreText,
  label,
  color,
  avg,
}: {
  percent: number;
  scoreText: string;
  label: string;
  color: string;
  avg: number;
}) {
  const size = 90;
  const strokeWidth = 8;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: COLOR_SLATE_BG,
        borderRadius: 6,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 14,
        paddingRight: 14,
        alignItems: "center",
      }}
    >
      {/* 左：圆环区域 - 用一个固定大小的 View 包裹 */}
      <View
        style={{
          width: size,
          height: size,
          position: "relative" as const,
        }}
      >
        <Ring percent={percent} size={size} strokeWidth={strokeWidth} color={color} />
        {/* 数字覆盖在中心 - 在 PDF 中通过绝对定位实现 */}
        <View
          style={{
            position: "absolute" as const,
            top: size / 2 - 12,
            left: 0,
            width: size,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: FONT(),
              fontSize: 18,
              fontWeight: "bold",
              color,
            }}
          >
            {scoreText}
          </Text>
        </View>
      </View>

      {/* 右：文字信息 */}
      <View style={{ marginLeft: 18, flex: 1 }}>
        <Text
          style={{
            fontFamily: FONT(),
            fontSize: 12,
            fontWeight: "bold",
            color,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: FONT(),
            fontSize: 9,
            fontWeight: "bold",
            color: COLOR_SLATE_DARK,
            marginTop: 4,
          }}
        >
          综合得分：{avg.toFixed(1)} / 10
        </Text>
        <Text
          style={{
            fontFamily: FONT(),
            fontSize: 8,
            color: COLOR_SLATE,
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          该维度反映学生对能力可塑性的认知倾向。
        </Text>
        <Text
          style={{
            fontFamily: FONT(),
            fontSize: 8,
            color: COLOR_SLATE,
            marginTop: 1,
            lineHeight: 1.3,
          }}
        >
          成长型思维者相信能力可以通过努力提升，面对挑战更具韧性。
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// 学业压力雷达图
// ============================================================
function RadarChart({
  values,
  size = 160,
}: {
  values: number[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const num = 5;
  const maxValue = 5;

  // 计算数据点
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

  // 4 层网格多边形
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPolys = gridLevels.map((lvl) => {
    return Array.from({ length: num }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
      return `${(cx + radius * lvl * Math.cos(angle)).toFixed(1)},${(
        cy + radius * lvl * Math.sin(angle)
      ).toFixed(1)}`;
    }).join(" ");
  });

  // 辐射线（从中心到5个顶点）
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

  // 维度标签（中文）放在 SVG 外面 - 这里使用 SVG Text 写英文，中文单独渲染
  const labels = ["学业负担", "师生关系", "家庭期望", "同伴竞争", "自我要求"];
  const labelRadius = radius + 16;
  const labelsPos = labels.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / num;
    return {
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
    };
  });

  return (
    <Svg width={size} height={size}>
      {/* 网格多边形 */}
      {gridPolys.map((pts, i) => (
        <Polygon
          key={`g-${i}`}
          points={pts}
          fill="none"
          stroke={COLOR_GRID}
          strokeWidth={0.8}
        />
      ))}
      {/* 辐射线 */}
      {radialLines.map((ln, i) => (
        <Line
          key={`r-${i}`}
          x1={ln.x1}
          y1={ln.y1}
          x2={ln.x2}
          y2={ln.y2}
          stroke={COLOR_GRID}
          strokeWidth={0.8}
        />
      ))}
      {/* 数据填充区 */}
      <Polygon
        points={dataPoints}
        fill={COLOR_TEAL}
        fillOpacity={0.25}
        stroke={COLOR_TEAL}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* 数据点小圆 */}
      {points.map((p, i) => (
        <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2} fill={COLOR_TEAL} />
      ))}
      {/* 维度标签（SVG Text）*/}
      {labelsPos.map((lp, i) => (
        <Text
          key={`lbl-${i}`}
          x={lp.x}
          y={lp.y + 3}
          textAnchor="middle"
          fill={COLOR_SLATE_DARK}
        >
          {labels[i]}
        </Text>
      ))}
    </Svg>
  );
}

// ============================================================
// Section 标题栏
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
  // 竖线与标题文字顶部对齐：alignItems: "flex-start"
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 8,
        marginBottom: 6,
      }}
    >
      <View
        style={{
          width: 3,
          height: 11,
          backgroundColor: color,
          marginRight: 6,
          marginTop: 1,
        }}
      />
      <Text
        style={{
          fontFamily: FONT(),
          fontSize: 11,
          fontWeight: "bold",
          color: COLOR_SLATE_DARK,
          lineHeight: 1.15,
        }}
      >
        {title}
      </Text>
      {hint && (
        <Text
          style={{
            fontFamily: FONT(),
            fontSize: 8,
            color: COLOR_SLATE,
            marginLeft: 8,
            paddingTop: 2,
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

// ============================================================
// 主文档
// ============================================================
interface ReportProps {
  name: string;
  scores: SurveyScores;
  dateStr?: string;
}

export function ReportPdf({ name, scores, dateStr }: ReportProps) {
  const d = new Date();
  const date =
    dateStr ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // 思维模式
  const thinkingAvg = (scores.average10?.[THINKING] as number) ?? 0;
  const thinkingPct = (scores.percent?.[THINKING] as number) ?? 0;
  const mindsetLabel = scores.mindsetLabel ?? "成长型思维";

  // 学业压力值数组
  const pressureValues = PRESSURE_DIMS.map(
    (d) => (scores.pressure?.[d] as number) ?? 0
  );
  const pressureAvg =
    pressureValues.reduce((a, b) => a + b, 0) / pressureValues.length;

  return (
    <Document>
      <Page
        size="A4"
        style={{
          backgroundColor: "#FFFFFF",
          fontFamily: FONT(),
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          color: COLOR_SLATE_DARK,
        }}
      >
        {/* ===== 顶部：标题 + 姓名日期 ===== */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: 6,
            borderBottomWidth: 1.2,
            borderBottomColor: COLOR_AMBER,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: COLOR_AMBER,
            }}
          >
            学习力测评报告
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 9,
                color: COLOR_SLATE,
              }}
            >
              姓名：{name || "—"}
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: COLOR_SLATE,
                marginTop: 2,
              }}
            >
              日期：{date}
            </Text>
          </View>
        </View>

        {/* ===== Section 1：思维模式（大圆环） ===== */}
        <SectionTitle title="思维模式" color={COLOR_AMBER} />
        <ThinkingBigRing
          percent={thinkingPct}
          scoreText={thinkingAvg.toFixed(1)}
          label={mindsetLabel}
          color={COLOR_AMBER}
          avg={thinkingAvg}
        />

        {/* ===== Section 2：内在动力（3 维度） ===== */}
        <SectionTitle title="内在动力" hint="自主性 · 胜任感 · 归属感" color={COLOR_AMBER} />
        <View style={{ flexDirection: "row" }}>
          {INTRINSIC.map((dim, idx) => {
            const avg = (scores.average10?.[dim] as number) ?? 0;
            const pct = (scores.percent?.[dim] as number) ?? 0;
            return (
              <View
                key={dim}
                style={{
                  marginRight: idx < INTRINSIC.length - 1 ? 10 : 0,
                  flex: 1,
                }}
              >
                <RingCell
                  percent={pct}
                  scoreText={avg.toFixed(1)}
                  label={dim}
                  color={COLOR_AMBER}
                  size={50}
                  strokeWidth={4}
                />
              </View>
            );
          })}
        </View>

        {/* ===== Section 3：学习动机与效能（3 维度） ===== */}
        <SectionTitle title="学习动机与效能" hint="深层 · 表层 · 自我效能" color={COLOR_AMBER} />
        <View style={{ flexDirection: "row" }}>
          {MOTIVATION.map((dim, idx) => {
            const avg = (scores.average10?.[dim] as number) ?? 0;
            const pct = (scores.percent?.[dim] as number) ?? 0;
            return (
              <View
                key={dim}
                style={{
                  marginRight: idx < MOTIVATION.length - 1 ? 10 : 0,
                  flex: 1,
                }}
              >
                <RingCell
                  percent={pct}
                  scoreText={avg.toFixed(1)}
                  label={dim}
                  color={COLOR_AMBER}
                  size={50}
                  strokeWidth={4}
                />
              </View>
            );
          })}
        </View>

        {/* ===== Section 4：学习方法与调节（3 维度） ===== */}
        <SectionTitle title="学习方法与调节" hint="深层 · 表层 · 自我调节" color={COLOR_AMBER} />
        <View style={{ flexDirection: "row" }}>
          {METHOD.map((dim, idx) => {
            const avg = (scores.average10?.[dim] as number) ?? 0;
            const pct = (scores.percent?.[dim] as number) ?? 0;
            return (
              <View
                key={dim}
                style={{
                  marginRight: idx < METHOD.length - 1 ? 10 : 0,
                  flex: 1,
                }}
              >
                <RingCell
                  percent={pct}
                  scoreText={avg.toFixed(1)}
                  label={dim}
                  color={COLOR_AMBER}
                  size={50}
                  strokeWidth={4}
                />
              </View>
            );
          })}
        </View>

        {/* ===== Section 5：学业压力（左列表 + 右雷达图） ===== */}
        <SectionTitle title="学业压力分析" hint="（满分 5 分）" color={COLOR_TEAL} />
        <View
          style={{
            flexDirection: "row",
            marginTop: 4,
            alignItems: "flex-start",
          }}
        >
          {/* 左：5 维度分数列表 */}
          <View style={{ flex: 1, marginRight: 10 }}>
            {PRESSURE_DIMS.map((d) => {
              const v = (scores.pressure?.[d] as number) ?? 0;
              return (
                <View
                  key={d}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: COLOR_SLATE_BG,
                    borderRadius: 4,
                    paddingTop: 4,
                    paddingBottom: 4,
                    paddingLeft: 8,
                    paddingRight: 8,
                    marginBottom: 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT(),
                      fontSize: 9,
                      fontWeight: "bold",
                      color: COLOR_SLATE_DARK,
                    }}
                  >
                    {d}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONT(),
                      fontSize: 10,
                      fontWeight: "bold",
                      color: COLOR_TEAL,
                    }}
                  >
                    {v.toFixed(1)} / 5
                  </Text>
                </View>
              );
            })}
            {/* 综合压力水平 */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#CCFBF1",
                borderRadius: 4,
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 8,
                paddingRight: 8,
                marginTop: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT(),
                  fontSize: 9,
                  fontWeight: "bold",
                  color: COLOR_TEAL,
                }}
              >
                综合压力水平
              </Text>
              <Text
                style={{
                  fontFamily: FONT(),
                  fontSize: 10,
                  fontWeight: "bold",
                  color: COLOR_TEAL,
                }}
              >
                {Math.round(pressureAvg * 10) / 10} / 5
              </Text>
            </View>
          </View>

          {/* 右：雷达图 */}
          <View
            style={{
              width: 170,
              alignItems: "center",
            }}
          >
            <RadarChart values={pressureValues} size={170} />
          </View>
        </View>

        {/* ===== 页脚 ===== */}
        <View
          style={{
            marginTop: 10,
            paddingTop: 6,
            borderTopWidth: 0.5,
            borderTopColor: COLOR_GRID,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontFamily: FONT(),
              fontSize: 8,
              color: COLOR_SLATE,
            }}
          >
            学生：{name || "—"} · 测评日期：{date}
          </Text>
          <Text
            style={{
              fontFamily: FONT(),
              fontSize: 8,
              color: COLOR_SLATE,
            }}
          >
            凭远教育 APP-ARK
          </Text>
        </View>
      </Page>
    </Document>
  );
}
