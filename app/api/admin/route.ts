import { NextResponse } from "next/server";

import {
  calculateScores,
  CRITICAL_QUESTIONS,
} from "@/lib/survey-data";
import { prisma, isDatabaseUsable } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 压力题题干（与前端 admin/page.tsx 保持一致）
const PRESSURE_QUESTION_TEXTS: Record<number, string> = {
  1: "我感觉学校作业负担很重",
  2: "每天的作业让我做到很晚",
  3: "学习任务太多，无法完成",
  4: "总是在赶作业/ deadline",
  5: "学业占用了我大部分时间",
  6: "一想到作业就觉得累",
  7: "考试前我会非常紧张",
  8: "考试时会心跳加速、手心出汗",
  9: "考试成绩出来前睡不着",
  10: "大考前一天我会特别焦虑",
  11: "一听到『考试』两个字就紧张",
  12: "考场里脑子会一片空白",
  13: "我对自己的成绩要求很高",
  14: "排名下降我会特别在意",
  15: "我不能容忍自己考不好",
  16: "我常拿自己和同学比较",
  17: "我觉得自己『应该』更优秀",
  18: "目标没有达成会让我很沮丧",
  19: "父母对我的成绩期待很高",
  20: "我害怕让父母失望",
  21: "家长会因为分数批评我",
  22: "老师的期待让我有压力",
  23: "别人都在努力，我也不能停",
  24: "我不想比别人差",
  25: "因为学习我常失眠/睡不好",
  26: "学习让我情绪低落或烦躁",
  27: "因为学习我身体常有不适",
  28: "我对学习提不起兴趣",
  29: "我觉得自己不是学习的料",
  30: "压力大时我会想哭/崩溃",
};

function safeParseJSON<T extends object>(
  text: string | null | undefined,
  fallback: T
): T {
  if (!text) return fallback;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") return obj as T;
    return fallback;
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json({
        records: [],
        _dbFallback: true,
        _message:
          "数据库不可用（DATABASE_URL 未配置或 schema 未迁移）。请在 Vercel 中配置 DATABASE_URL 并执行 `npx prisma migrate deploy`。",
      });
    }

    const responses = await prisma.response.findMany({
      include: { student: true },
      orderBy: { createdAt: "desc" },
    });

    const records = responses.map((r) => {
      // 1) 提取 q1..q90 原始分
      const raw: Record<string, number | undefined> = {};
      for (let i = 1; i <= 90; i++) {
        const key = `q${i}` as keyof typeof r;
        const v = r[key];
        if (typeof v === "number") raw[key] = v;
      }

      // 1b) 简单的完成度计数（用于 admin 可视化）
      let learningAnswered = 0;
      for (let i = 1; i <= 60; i++) if (typeof raw[`q${i}`] === "number") learningAnswered++;
      let pressureAnswered = 0;
      for (let i = 61; i <= 90; i++) if (typeof raw[`q${i}`] === "number") pressureAnswered++;
      const totalAnswered = learningAnswered + pressureAnswered;
      const isDraft =
        (r as unknown as { isDraft?: boolean | null }).isDraft === true ||
        learningAnswered < 60 ||
        pressureAnswered < 30;

      // 2) 维度得分：优先使用存储的 JSON；若缺失则基于 q1..q90 重算
      let percent = safeParseJSON<Record<string, number>>(
        (r as unknown as { dimensionScores?: string | null }).dimensionScores,
        {}
      );
      let pressure = safeParseJSON<Record<string, number>>(
        (r as unknown as { pressureScores?: string | null }).pressureScores,
        {}
      );
      let mindsetLabel: string | null = r.mindsetLabel ?? null;

      if (Object.keys(percent).length === 0) {
        const learningAnswers: Record<string, number> = {};
        const pressureAnswers: Record<string, number> = {};
        for (let i = 1; i <= 60; i++) {
          const v = raw[`q${i}`];
          if (typeof v === "number") learningAnswers[String(i)] = v;
        }
        for (let i = 61; i <= 90; i++) {
          const v = raw[`q${i}`];
          if (typeof v === "number") pressureAnswers[String(i - 60)] = v;
        }
        const scores = calculateScores(learningAnswers, pressureAnswers);
        percent = scores.percent as Record<string, number>;
        pressure = scores.pressure as Record<string, number>;
        mindsetLabel = scores.mindsetLabel;
      }

      // average10 = 10分制（percent/10，因为 toPercent(x) = x * 10
      const average10: Record<string, number> = {};
      for (const [k, v] of Object.entries(percent)) {
        average10[k] = Math.round((v / 10) * 10) / 10;
      }

      // 3) 10 道关键题（压力维度的题号 1..30）—— 附带题干与 domain
      const criticalQuestions = CRITICAL_QUESTIONS.map((q) => {
        const dbKey = `q${60 + q.id}`;
        const v = raw[dbKey];
        return {
          id: q.id,
          dbKey,
          domain: q.domain ?? "",
          text: PRESSURE_QUESTION_TEXTS[q.id] ?? `压力题 ${q.id}`,
          value: typeof v === "number" ? v : null,
        };
      });

      return {
        id: r.id,
        name: r.student.name,
        age: r.student.age,
        school: r.student.school,
        gender: r.student.gender,
        createdAt: r.createdAt.toISOString(),
        isDraft,
        totalAnswered,
        learningAnswered,
        pressureAnswered,
        answers: raw,
        average10,
        percent,
        pressure,
        mindsetLabel,
        criticalQuestions,
      };
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Failed to fetch admin data:", error);
    return NextResponse.json(
      { error: "获取数据失败，请稍后重试" },
      { status: 500 }
    );
  }
}
