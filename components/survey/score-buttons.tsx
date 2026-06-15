"use client";

import { cn } from "@/lib/utils";

interface ScoreButtonsProps {
  value?: number;
  onChange: (value: number) => void;
  scale?: 10 | 5;
  color?: "amber" | "teal";
}

export function ScoreButtons({
  value,
  onChange,
  scale = 10,
  color = "amber",
}: ScoreButtonsProps) {
  const values =
    scale === 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="flex w-full items-stretch justify-between gap-1">
      {values.map((n) => (
        <button
          key={n}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(n);
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center rounded-xl text-base font-semibold tabular-nums transition-colors active:scale-95 sm:text-lg",
            scale === 5 ? "h-14" : "h-12",
            value === n
              ? color === "teal"
                ? "bg-teal-600 text-white"
                : "bg-amber-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
