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
    <div className="w-full">
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#CBD5E1" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#475569", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            axisLine={false}
          />
          {/* 学生得分（紫色） */}
          <Radar
            name="学生得分"
            dataKey="value"
            stroke="#8B5CF6"
            fill="#8B5CF6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {/* 平均水平 3 分（灰色虚线多边形） */}
          {showAverage !== false && (
            <Radar
              name="平均水平 (3 分)"
              dataKey="average"
              stroke="#94A3B8"
              strokeDasharray="4 4"
              fill="#94A3B8"
              fillOpacity={0.08}
              strokeWidth={2}
            />
          )}
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: "#475569" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
