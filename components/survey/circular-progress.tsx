"use client";

import { cn } from "@/lib/utils";

interface CircularProgressProps {
  /** 百分比 0-100 */
  value: number;
  /** 画布大小 (px) */
  size?: number;
  /** 圆环线宽 (px) */
  strokeWidth?: number;
  /** 主色：铜金色 / 青绿色 */
  color?: "amber" | "teal";
  /** 圆环中心是否显示分数数字 */
  showNumber?: boolean;
  /** 数字单位（显示在中心数字下，如 "9.0"）*/
  displayNumber?: string;
  /** 字体大小额外 class */
  numberClassName?: string;
  /** 文字颜色 class */
  textColor?: string;
}

export function CircularProgress({
  value,
  size = 88,
  strokeWidth = 3,
  color = "amber",
  showNumber = false,
  displayNumber,
  numberClassName,
  textColor,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  const strokeColor = color === "teal" ? "#0D9488" : "#B87333";
  const numberColorClass =
    textColor ?? (color === "teal" ? "text-teal-700" : "text-amber-700");

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        className="shrink-0"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color === "teal" ? "#E6FFFA" : "#FEF3C7"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference - offset} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      {showNumber && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-bold tabular-nums leading-none",
              numberColorClass,
              numberClassName ?? "text-2xl"
            )}
          >
            {displayNumber ?? Math.round(clampedValue)}
          </span>
        </div>
      )}
    </div>
  );
}
