"use client";

import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: "amber";
  showLabel?: boolean;
  labelClassName?: string;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 88,
  strokeWidth = 7,
  color = "amber",
  showLabel = true,
  labelClassName,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  // 铜金色
  const track = "#F3E8D7";
  const stroke = color === "amber" ? "#B87333" : "#B87333";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            "absolute text-sm font-bold tabular-nums text-amber-800",
            labelClassName
          )}
        >
          {max === 100 ? `${Math.round(value)}%` : value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
