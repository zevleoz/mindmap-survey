import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _mindmapDbUsable?: boolean | null
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * 探测数据库是否可用、并且 schema 与当前 Prisma schema 一致。
 *
 * 常见"看起来可用但其实不可用"的场景：
 *   1) 还没执行 `prisma migrate deploy` 或 `prisma db push`，
 *      Response 表缺少 q1..q90 列；
 *   2) DATABASE_URL 存在但指向空的 Postgres 数据库；
 *   3) 本地 `prisma dev` 重建时没有跑 migration。
 *
 * 我们通过一次 `Response.count()` + 一次 `Student.count()` 来确保
 * 关键表都存在。失败时返回 false，上游 API 会走降级模式——
 *   "不持久化但仍正确返回分数"，避免用户看到 500 错误。
 */
export async function isDatabaseUsable(): Promise<boolean> {
  if (typeof globalForPrisma._mindmapDbUsable === "boolean") {
    return globalForPrisma._mindmapDbUsable;
  }

  // 保护 1：没有 DATABASE_URL 时直接返回 false
  if (!process.env.DATABASE_URL) {
    console.warn('[lib/prisma] DATABASE_URL 未配置，进入降级模式。')
    globalForPrisma._mindmapDbUsable = false;
    return false;
  }

  // 保护 2：用 Promise.race 做 5 秒超时，避免数据库连接卡住整页提交
  try {
    const timeoutMs = 5000;
    const timeoutP = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error(`连接数据库超时 (${timeoutMs}ms)`)), timeoutMs);
    });
    const checkP = (async () => {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.student.count();
      await prisma.response.count();
      return true;
    })();
    await Promise.race([checkP, timeoutP]);
    globalForPrisma._mindmapDbUsable = true;
  } catch (err) {
    console.warn('[lib/prisma] 数据库不可用，进入降级模式：', err instanceof Error ? err.message : err);
    globalForPrisma._mindmapDbUsable = false;
  }
  return globalForPrisma._mindmapDbUsable;
}
