"use client";

import { Brain, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon = Brain,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-700 shadow-lg shadow-amber-200">
        <Icon className="size-8 text-white" strokeWidth={1.75} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-sm text-base leading-relaxed text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
