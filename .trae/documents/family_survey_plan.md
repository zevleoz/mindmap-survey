# 家长问卷实现计划（更新版）

## 需求分析

家长问卷是一套**完全独立**的测评系统：
- 30道题，1-6分制（完全不像→非常像）
- 3页，每页10题
- 10个基本价值维度（自主、刺激、享乐、成就、权力、安全、遵从、传统、仁爱、普世主义）
- 4个高阶价值方向（开放变革、保守维持、自我提升、自我超越）
- 中心化相对优先级计分（原始分 - 个人总均分）

## 实现方案

### 1. 数据库 Schema 更新

创建独立的 `FamilyResponse` 模型：

```prisma
model FamilyResponse {
  id              String   @id @default(uuid())
  parentId        String
  parent          Parent   @relation(fields: [parentId], references: [id])
  isDraft         Boolean  @default(false)
  valueScores     String?  // JSON: { "自主": 4.5, "刺激": 3.2, ... }
  higherOrderScores String? // JSON: { "开放变革": 0.8, ... }
  centeredScores  String?  // JSON: 中心化相对优先级
  personalMean    Float?   // 个人总均分
  fq1-fq30        Int?     // 30道题答案
  createdAt       DateTime @default(now())
  updatedAt       DateTime? @updatedAt
}

model Parent {
  id        String          @id @default(uuid())
  name      String
  age       Int?
  childName String?        // 孩子姓名
  school    String?
  gender    String?
  createdAt DateTime        @default(now())
  responses FamilyResponse[]
}
```

### 2. 问卷数据与计分逻辑

在 `lib/survey-data.ts` 添加：
- 30道家长问卷题目定义
- 10个价值维度的题目映射（每维度3题）
- 4个高阶价值方向的构成
- 中心化相对优先级计分函数

### 3. 独立家长问卷页面

创建 `app/family/page.tsx`：
- 复用学生问卷的UI组件和交互模式
- 1-6分制选项按钮
- 3页，每页10题
- 家长版文案（"家庭教育价值选择倾向问卷"）
- 提交后显示"请联系凭远顾问"

### 4. API 层

创建 `app/api/family/route.ts`：
- POST：提交家长问卷答案
- PATCH：自动保存
- GET：获取家长问卷数据

### 5. Middleware

更新 `app/middleware.ts`：
- `family.p4learning-ark.app` → 重写到 `/family` 路由

### 6. 管理后台

更新 `app/admin/page.tsx`：
- 添加学生/家长切换标签
- 家长数据显示10个价值维度和4个高阶方向

## 文件修改清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `prisma/schema.prisma` | 修改 | 添加 Parent 和 FamilyResponse 模型 |
| `lib/survey-data.ts` | 修改 | 添加家长问卷题目和计分逻辑 |
| `app/family/page.tsx` | 新建 | 独立家长问卷页面 |
| `app/api/family/route.ts` | 新建 | 家长问卷API |
| `app/middleware.ts` | 新建 | 子域名重写中间件 |
| `app/admin/page.tsx` | 修改 | 添加家长数据展示 |

## 步骤分解

1. **更新 Prisma Schema**
2. **添加家长问卷题目和计分逻辑**
3. **创建家长问卷API**
4. **创建家长问卷页面**
5. **创建Middleware**
6. **更新管理后台**
7. **运行迁移并验证**