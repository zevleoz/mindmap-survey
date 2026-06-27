import { NextResponse } from "next/server";

import {
  FAMILY_QUESTION_IDS,
  FAMILY_VALUES,
  FAMILY_HIGHER_ORDER,
  calculateFamilyScores,
} from "@/lib/survey-data";
import { prisma, isDatabaseUsable } from "@/lib/prisma";

function answersToColumns(answers: Record<string, number>): Record<string, number | undefined> {
  const cols: Record<string, number | undefined> = {};
  for (const id of FAMILY_QUESTION_IDS) {
    cols[`fq${id}`] = answers[String(id)];
  }
  return cols;
}

function partialAnswersToColumns(
  answers: Record<string, number> | undefined | null
): Record<string, number> {
  const cols: Record<string, number> = {};
  if (answers) {
    for (const id of FAMILY_QUESTION_IDS) {
      const v = answers[String(id)];
      if (typeof v === "number") cols[`fq${id}`] = v;
    }
  }
  return cols;
}

function safeParseJSON<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json(
        {
          records: [],
          _dbFallback: true,
          _message: "数据库尚未配置。",
        },
        { status: 200 }
      );
    }

    let responses: any[];
    try {
      responses = await prisma.familyResponse.findMany({
        include: { parent: true },
        orderBy: { createdAt: "desc" },
      }) as any[];
    } catch {
      responses = await prisma.$queryRaw`SELECT r.id, r.parentId, r.createdAt, r.isDraft, r.personalMean, r.fq1, r.fq2, r.fq3, r.fq4, r.fq5, r.fq6, r.fq7, r.fq8, r.fq9, r.fq10, r.fq11, r.fq12, r.fq13, r.fq14, r.fq15, r.fq16, r.fq17, r.fq18, r.fq19, r.fq20, r.fq21, r.fq22, r.fq23, r.fq24, r.fq25, r.fq26, r.fq27, r.fq28, r.fq29, r.fq30, p.name, p.childName, p.school, p.grade FROM "FamilyResponse" r JOIN "Parent" p ON r."parentId" = p.id ORDER BY r."createdAt" DESC` as any[];
    }

    const records = responses.map((r: any) => {
      const raw: Record<string, number | undefined> = {};
      for (let i = 1; i <= 30; i++) {
        const key = `fq${i}`;
        const v = r[key];
        if (typeof v === "number") raw[key] = v;
      }

      let valueScores: Record<string, number> = {};
      let higherOrderScores: Record<string, number> = {};
      let higherOrderRawScores: Record<string, number> = {};
      let centeredScores: Record<string, number> = {};
      let personalMean = r.personalMean ?? 0;

      const parsedValues = safeParseJSON<Record<string, number>>(r.valueScores);
      const parsedHigher = safeParseJSON<Record<string, number>>(r.higherOrderScores);
      const parsedCentered = safeParseJSON<Record<string, number>>(r.centeredScores);

      if (parsedValues && Object.keys(parsedValues).length > 0 && parsedHigher && Object.keys(parsedHigher).length > 0 && parsedCentered && Object.keys(parsedCentered).length > 0) {
        valueScores = parsedValues;
        higherOrderScores = parsedHigher;
        centeredScores = parsedCentered;
      } 

      const answers: Record<string, number> = {};
      for (let i = 1; i <= 30; i++) {
        const key = `fq${i}`;
        const v = raw[key];
        if (typeof v === "number") answers[String(i)] = v;
      }
      const scores = calculateFamilyScores(answers);
      higherOrderRawScores = scores.higherOrderRawScores as Record<string, number>;
      if (!parsedValues || Object.keys(parsedValues).length === 0) {
        valueScores = scores.valueScores as Record<string, number>;
        higherOrderScores = scores.higherOrderScores as Record<string, number>;
        centeredScores = scores.centeredScores as Record<string, number>;
        personalMean = scores.personalMean;
      }

      const parent = r.parent ?? r;
      const createdAt = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);

      return {
        id: r.id,
        name: parent.name,
        childName: parent.childName,
        school: parent.school,
        grade: parent.grade,
        createdAt,
        answers: raw,
        valueScores,
        higherOrderScores,
        higherOrderRawScores,
        centeredScores,
        personalMean,
      };
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Failed to fetch family responses:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      parentId,
      name,
      childName,
      school,
      grade,
      answers,
    } = body as {
      parentId?: string | null;
      name?: string;
      childName?: string;
      school?: string;
      grade?: string;
      answers?: Record<string, number>;
    };

    if (!name?.trim() && !parentId) {
      return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
    }
    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json({ error: "请完成问卷" }, { status: 400 });
    }

    const missing = FAMILY_QUESTION_IDS.filter((id) => answers[String(id)] === undefined);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `还有 ${missing.length} 道题目未作答`,
          missingIds: missing,
        },
        { status: 400 }
      );
    }

    const scores = calculateFamilyScores(answers);
    const usable = await isDatabaseUsable();

    if (!usable) {
      console.warn("[api/family] 数据库未配置，以降级模式响应");
      return NextResponse.json({
        id: "temp-" + Date.now().toString(36),
        scores,
        _dbFallback: true,
        _message: "测评成功，但数据库未配置，数据未持久化。",
      });
    }

    const columns = answersToColumns(answers);

    let finalParentId: string;
    if (parentId && !parentId.startsWith("temp-")) {
      finalParentId = parentId;
      const existing = await prisma.parent.findUnique({
        where: { id: parentId },
        select: { id: true },
      });
      if (!existing) {
        const created = await prisma.parent.create({
          data: {
            id: parentId,
            name: name?.trim() || "未填写",
            childName: childName?.trim() || null,
            school: school?.trim() || null,
            grade: grade?.trim() || null,
          },
        });
        finalParentId = created.id;
      } else {
        await prisma.parent.update({
          where: { id: parentId },
          data: {
            name: name?.trim() || undefined,
            childName: childName?.trim() || undefined,
            school: school?.trim() || undefined,
            grade: grade?.trim() || undefined,
          },
        });
      }
    } else {
      const created = await prisma.parent.create({
        data: {
          name: name?.trim() || "未填写",
          childName: childName?.trim() || null,
          school: school?.trim() || null,
          grade: grade?.trim() || null,
        },
      });
      finalParentId = created.id;
    }

    const existingResponse = await prisma.familyResponse.findFirst({
      where: { parentId: finalParentId },
      select: { id: true },
    });

    let responseId: string;
    if (existingResponse) {
      await prisma.familyResponse.update({
        where: { id: existingResponse.id },
        data: {
          isDraft: false,
          valueScores: JSON.stringify(scores.valueScores),
          higherOrderScores: JSON.stringify(scores.higherOrderScores),
          centeredScores: JSON.stringify(scores.centeredScores),
          personalMean: scores.personalMean,
          ...columns,
        },
      });
      responseId = existingResponse.id;
    } else {
      const created = await prisma.familyResponse.create({
        data: {
          parentId: finalParentId,
          isDraft: false,
          valueScores: JSON.stringify(scores.valueScores),
          higherOrderScores: JSON.stringify(scores.higherOrderScores),
          centeredScores: JSON.stringify(scores.centeredScores),
          personalMean: scores.personalMean,
          ...columns,
        },
      });
      responseId = created.id;
    }

    return NextResponse.json({ id: responseId, parentId: finalParentId, scores });
  } catch (error) {
    console.error("Failed to save family response:", error);
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      parentId,
      parentInfo,
      answers,
      pageIndex,
    } = body as {
      parentId?: string | null;
      parentInfo?: { name?: string; childName?: string; school?: string; grade?: string } | null;
      answers?: Record<string, number> | null;
      pageIndex?: number | null;
    };

    if (!parentId) {
      return NextResponse.json(
        { error: "缺少 parentId" },
        { status: 400 }
      );
    }

    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json(
        { ok: true, _dbFallback: true, note: "数据库未配置，已忽略服务端自动保存" },
        { status: 200 }
      );
    }

    const columns = partialAnswersToColumns(answers);
    const hasColumns = Object.keys(columns).length > 0;

    let finalParentId: string;
    if (parentId.startsWith("temp-")) {
      const parent = await prisma.parent.create({
        data: {
          name: parentInfo?.name?.trim() || "未填写",
          childName: parentInfo?.childName?.trim() || null,
          school: parentInfo?.school?.trim() || null,
          grade: parentInfo?.grade?.trim() || null,
        },
      });
      finalParentId = parent.id;
    } else {
      const existing = await prisma.parent.findUnique({
        where: { id: parentId },
        select: { id: true },
      });
      if (existing) {
        finalParentId = parentId;
        if (parentInfo) {
          await prisma.parent.update({
            where: { id: parentId },
            data: {
              name: parentInfo.name?.trim() || undefined,
              childName: parentInfo.childName?.trim() || undefined,
              school: parentInfo.school?.trim() || undefined,
              grade: parentInfo.grade?.trim() || undefined,
            },
          });
        }
      } else {
        const parent = await prisma.parent.create({
          data: {
            id: parentId,
            name: parentInfo?.name?.trim() || "未填写",
            childName: parentInfo?.childName?.trim() || null,
            school: parentInfo?.school?.trim() || null,
            grade: parentInfo?.grade?.trim() || null,
          },
        });
        finalParentId = parent.id;
      }
    }

    const existingResponse = await prisma.familyResponse.findFirst({
      where: { parentId: finalParentId },
      select: { id: true },
    });

    if (existingResponse) {
      if (hasColumns) {
        await prisma.familyResponse.update({
          where: { id: existingResponse.id },
          data: { ...columns },
        });
      }
      return NextResponse.json({
        ok: true,
        id: existingResponse.id,
        parentId: finalParentId,
        pageIndex,
      });
    }

    const created = await prisma.familyResponse.create({
      data: {
        parentId: finalParentId,
        isDraft: true,
        ...columns,
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      parentId: finalParentId,
      isNewDraft: true,
      pageIndex,
    });
  } catch (error) {
    console.error("Failed to auto-save family:", error);
    return NextResponse.json(
      { error: "自动保存失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const usable = await isDatabaseUsable();
    if (!usable) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 500 });
    }

    await prisma.familyResponse.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete family response:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}