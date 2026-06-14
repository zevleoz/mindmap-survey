"use client";

import { cn } from "@/lib/utils";

interface ScoreButtonsProps {
  value?: number;
  onChange: (value: number) => void;
  /** 1-10 (学习力) 或 1-5 (学业压力) */
  scale?: 10 | 5;
  size?: "sm" | "md";
}

function ButtonRow({
  values,
  value,
  onChange,
  className,
}: {
  values: number[];
  value?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 grid-cols-5", className)}>
      {values.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95",
              // 手机端：h-12 text-lg
              "h-12 text-lg font-semibold",
              // 桌面端：更紧凑
              "sm:h-11 sm:text-base",
              selected
                ? "bg-amber-700 text-white shadow-sm shadow-amber-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export function ScoreButtons({
  value,
  onChange,
  scale = 10,
  size = "md",
}: ScoreButtonsProps) {
  const count = scale;
  if (count <= 5) {
    const values = Array.from({ length: count }, (_, i) => i + 1);
    return (
      <div className="space-y-2">
        <ButtonRow values={values} value={value} onChange={onChange} />
        <div className="flex justify-between text-xs text-slate-400">
          <span>完全没有</span>
          <span>几乎总是</span>
        </div>
      </div>
    );
  }
  // 1-10 分：手机端拆 5+5 两行
  const firstRow = [1, 2, 3, 4, 5];
  const secondRow = [6, 7, 8, 9, 10];
  return (
    <div className="space-y-2">
      {/* 手机端：5+5 两行 */}
      <div className="sm:hidden space-y-2">
        <ButtonRow values={firstRow} value={value} onChange={onChange} />
        <ButtonRow values={secondRow} value={value} onChange={onChange} />
      </div>
      {/* 桌面端：10 列一行 */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: count }, (_, i) => {
            const n = i + 1;
            const selected = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                  "h-11 flex items-center justify-center rounded-xl text-base font-semibold transition-all duration-150 active:scale-95",
                  selected
                    ? "bg-amber-700 text-white shadow-sm shadow-amber-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>完全不像我</span>
        <span>完全像我</span>
      </div>
    </div>
  );
}
