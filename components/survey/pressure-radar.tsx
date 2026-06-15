"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { PRESSURE_DIMENSIONS, type PressureDimension } from "@/lib/survey-data";

interface PressureRadarProps {
  pressure: Record<PressureDimension, number>;
  showAverage?: boolean;
}

export function PressureRadar({ pressure, showAverage }: PressureRadarProps) {
  const data = PRESSURE_DIMENSIONS.map((dim) => ({
    dimension: dim,
    value: pressure[dim] ?? 0,
    average: 3,
    fullMark: 5,
  }));

  return (
    <div className="h-full w-full overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="58%"
          margin={{ top: 30, right: 60, bottom: 40, left: 60 }}
          data={data}
        >
          <PolarGrid stroke="#CBD5E1" strokeWidth={1} />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#334155", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={false}
            axisLine={false}
          />
          {/* 学生得分（青绿色 teal-600）：线条加粗、填充加深 */}
          <Radar
            name="学生得分"
            dataKey="value"
            stroke="#0D9488"
            fill="#0D9488"
            fillOpacity={0.32}
            strokeWidth={2.5}
          />
          {/* 平均水平 3 分（灰色虚线多边形） */}
          {showAverage !== false && (
            <Radar
              name="平均水平 (3 分)"
              dataKey="average"
              stroke="#64748B"
              strokeDasharray="5 5"
              fill="#64748B"
              fillOpacity={0.08}
              strokeWidth={2}
            />
          )}
          <Legend
            iconType="circle"
            wrapperStyle={{
              display: "flex",
              justifyContent: "center",
              gap: "1.5rem",
              fontSize: "13px",
              color: "#334155",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
