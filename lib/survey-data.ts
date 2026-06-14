export const DIMENSIONS = [
  "思维模式",
  "自主性",
  "胜任感",
  "归属感",
  "深层动机",
  "表层动机",
  "深层方法",
  "表层方法",
  "自我效能感",
  "学习自我调节",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const PRESSURE_DIMENSIONS = [
  "学业负担",
  "家庭期望",
  "师生关系",
  "同伴竞争",
  "自我要求",
] as const;

export type PressureDimension = (typeof PRESSURE_DIMENSIONS)[number];

export interface QuestionDef {
  id: number;
  text: string;
}

export interface SurveyGroup {
  id: number;
  title: string;
  questionIds: number[];
}

/** 60 道唯一学习力题目（Q1-Q60） */
export const LEARNING_QUESTION_BANK: Record<number, QuestionDef> = {
  // 思维模式 (Q1-Q6)
  1: { id: 1, text: "我相信自己的能力可以通过努力得到提升。" },
  2: { id: 2, text: "我认为聪明才智是天生的，很难通过后天改变。" },
  3: { id: 3, text: "我愿意接受具有挑战性的学习任务。" },
  4: { id: 4, text: "失败是学习过程中正常且有价值的一部分。" },
  5: { id: 5, text: "遇到困难时，我会想办法解决而不是放弃。" },
  6: { id: 6, text: "我认为自己在学习上的潜力是可以不断开发的。" },

  // 自主性 (Q7-Q12)
  7: { id: 7, text: "我会主动制定并执行自己的学习计划。" },
  8: { id: 8, text: "学习时我需要他人不断督促才能坚持。" },
  9: { id: 9, text: "我会根据自己的节奏和兴趣安排学习。" },
  10: { id: 10, text: "我习惯依赖他人帮我做学习方面的决定。" },
  11: { id: 11, text: "我能主动安排课后学习时间，不需要老师提醒。" },
  12: { id: 12, text: "如果没有人监督，我很难自觉完成学习任务。" },

  // 胜任感 (Q13-Q18)
  13: { id: 13, text: "我相信自己能够胜任大多数学习任务。" },
  14: { id: 14, text: "面对新学科时，我常常感到无从下手。" },
  15: { id: 15, text: "与同龄人相比，我经常觉得自己能力不足。" },
  16: { id: 16, text: "在学习上遇到困难时，我相信自己最终能克服。" },
  17: { id: 17, text: "我常常怀疑自己是否足够聪明来学好当前的课程。" },
  18: { id: 18, text: "完成一项挑战性的学习任务后，我会感到很有成就感。" },

  // 归属感 (Q19-Q24)
  19: { id: 19, text: "我在班级中感到被同学和老师接纳。" },
  20: { id: 20, text: "我在学校时常感到被孤立或排斥。" },
  21: { id: 21, text: "我愿意与同学分享学习经验和方法。" },
  22: { id: 22, text: "我在学习小组中感到自己是重要的一员。" },
  23: { id: 23, text: "我觉得老师不太关心我的学习状况。" },
  24: { id: 24, text: "我不太融入班级集体，缺少归属感。" },

  // 深层动机 (Q25-Q30)
  25: { id: 25, text: "我学习是因为对知识本身有浓厚的兴趣。" },
  26: { id: 26, text: "我喜欢深入理解一个主题，而不只是记住表面内容。" },
  27: { id: 27, text: "学习新事物让我感到兴奋和满足。" },
  28: { id: 28, text: "我会为了理解一个复杂概念花额外的时间钻研。" },
  29: { id: 29, text: "我关心的是真正学到东西，而不只是应付考试。" },
  30: { id: 30, text: "在课堂上遇到让我好奇的问题，我会课后继续探索。" },

  // 表层动机 (Q31-Q36)
  31: { id: 31, text: "获得好成绩和排名是我学习的主要目标。" },
  32: { id: 32, text: "我学习主要是为了不被老师或家长批评。" },
  33: { id: 33, text: "如果没有考试和作业，我可能不会主动学习。" },
  34: { id: 34, text: "我学习是为了获得别人的认可和表扬。" },
  35: { id: 35, text: "拿到好成绩比真正理解内容对我更重要。" },
  36: { id: 36, text: "我学习只是为了完成任务和避免麻烦。" },

  // 深层方法 (Q37-Q42)
  37: { id: 37, text: "我会尝试用自己的话重新解释课本中的概念。" },
  38: { id: 38, text: "我会把新知识与自己已有经验联系起来理解。" },
  39: { id: 39, text: "学习时我会思考不同知识点之间的联系。" },
  40: { id: 40, text: "在理解一个主题时，我会寻找多种信息来源。" },
  41: { id: 41, text: "我会在学习后反思自己的理解是否深入。" },
  42: { id: 42, text: "我尝试从不同角度思考同一个问题。" },

  // 表层方法 (Q43-Q48)
  43: { id: 43, text: "我倾向于通过反复刷题和背诵来备考。" },
  44: { id: 44, text: "我学习时主要关注考试可能考到的内容。" },
  45: { id: 45, text: "做笔记时我主要抄录老师或课本的原话。" },
  46: { id: 46, text: "我觉得只要记住课本内容就能学好。" },
  47: { id: 47, text: "我用死记硬背的方式学习效果反而更好。" },
  48: { id: 48, text: "复习时我会反复阅读课本或笔记，直到记住为止。" },

  // 自我效能感 (Q49-Q54)
  49: { id: 49, text: "我相信自己有能力学好当前的课程。" },
  50: { id: 50, text: "遇到难题时，我相信自己最终能找到解决方案。" },
  51: { id: 51, text: "即使学习材料很难，我也有信心能够掌握它。" },
  52: { id: 52, text: "我常常觉得自己的学习能力不如别人。" },
  53: { id: 53, text: "我对自己在学业上的表现感到满意。" },
  54: { id: 54, text: "当任务变难时，我常常怀疑自己能否做好。" },

  // 学习自我调节 (Q55-Q60)
  55: { id: 55, text: "当我发现某种学习方法无效时，会尝试换一种方法。" },
  56: { id: 56, text: "我会定期检查自己对学习内容的理解程度。" },
  57: { id: 57, text: "我会为重要考试提前制定复习时间表并执行。" },
  58: { id: 58, text: "当我学习状态不好时，我会主动调整。" },
  59: { id: 59, text: "我常常在学习中分心，很难专注太久。" },
  60: { id: 60, text: "我会根据考试或作业反馈调整自己的学习策略。" },
};

/** 30 道学业压力题目（Q1-Q30） */
export const PRESSURE_QUESTIONS: QuestionDef[] = [
  // 学业负担 (Q1-Q6)
  { id: 1, text: "我经常因为作业太多而睡得很晚。" },
  { id: 2, text: "有些课程进度太快，我很难完全理解。" },
  { id: 3, text: "考试安排得太密集，我常感到疲惫。" },
  { id: 4, text: "我觉得老师布置的任务超出了我能承受的范围。" },
  { id: 5, text: "有时候我做题只是为了赶进度，而不是理解知识。" },
  { id: 6, text: "学校活动、作业和补课堆在一起，让我透不过气。" },

  // 师生关系 (Q7-Q12)
  { id: 7, text: "我害怕因为成绩不好而被老师当众批评。" },
  { id: 8, text: "我觉得有些老师对成绩差的学生不够耐心。" },
  { id: 9, text: "老师更多关注分数，而不是学生的努力过程。" },
  { id: 10, text: "当我有问题想问老师时，有时不敢开口。" },
  { id: 11, text: "老师的严格要求让我很担心自己出错。" },
  { id: 12, text: "我觉得老师布置任务时很少考虑学生的压力。" },

  // 家庭期望 (Q13-Q18)
  { id: 13, text: "父母经常提醒我要考上好学校。" },
  { id: 14, text: "成绩不好时，父母的反应让我更焦虑。" },
  { id: 15, text: "父母会拿我的成绩和亲戚或同学比较。" },
  { id: 16, text: "父母经常在家里谈论我的学习成绩。" },
  { id: 17, text: "父母更关心分数，而不是我的兴趣或感受。" },
  { id: 18, text: "我担心如果成绩不好，会让父母失望。" },

  // 同伴竞争 (Q19-Q24)
  { id: 19, text: "班上总有很多同学学习很好，我会感到压力。" },
  { id: 20, text: "每次成绩公布时，我都会担心排名。" },
  { id: 21, text: "同学之间经常讨论成绩，让我有压力。" },
  { id: 22, text: "当别人成绩比我好时，我会感到沮丧。" },
  { id: 23, text: "看到别人努力学习时，我会觉得自己不够好。" },
  { id: 24, text: "我害怕在集体活动中表现不好，被同学看不起。" },

  // 自我要求 (Q25-Q30)
  { id: 25, text: "我对自己学习的要求比别人更严格。" },
  { id: 26, text: "没有达到目标时，我会非常自责。" },
  { id: 27, text: "我担心自己的表现会让别人失望。" },
  { id: 28, text: "我常觉得必须做到最好才能安心。" },
  { id: 29, text: "成绩一旦下降，我会反复责怪自己。" },
  { id: 30, text: "即使考得很好，我也觉得自己还不够好。" },
];

/** 10 个学习力展示分组（共 60 个展示位） */
export const SURVEY_GROUPS: SurveyGroup[] = [
  { id: 1, title: "思维模式", questionIds: [1, 2, 3, 4, 5, 6] },
  { id: 2, title: "自主性", questionIds: [7, 8, 9, 10, 11, 12] },
  { id: 3, title: "胜任感", questionIds: [13, 14, 15, 16, 17, 18] },
  { id: 4, title: "归属感", questionIds: [19, 20, 21, 22, 23, 24] },
  { id: 5, title: "深层动机", questionIds: [25, 26, 27, 28, 29, 30] },
  { id: 6, title: "表层动机", questionIds: [31, 32, 33, 34, 35, 36] },
  { id: 7, title: "深层方法", questionIds: [37, 38, 39, 40, 41, 42] },
  { id: 8, title: "表层方法", questionIds: [43, 44, 45, 46, 47, 48] },
  { id: 9, title: "自我效能感", questionIds: [49, 50, 51, 52, 53, 54] },
  { id: 10, title: "学习自我调节", questionIds: [55, 56, 57, 58, 59, 60] },
];

/** 5 个学业压力展示分组 */
export const PRESSURE_GROUPS: SurveyGroup[] = [
  { id: 1, title: "学业负担", questionIds: [1, 2, 3, 4, 5, 6] },
  { id: 2, title: "师生关系", questionIds: [7, 8, 9, 10, 11, 12] },
  { id: 3, title: "家庭期望", questionIds: [13, 14, 15, 16, 17, 18] },
  { id: 4, title: "同伴竞争", questionIds: [19, 20, 21, 22, 23, 24] },
  { id: 5, title: "自我要求", questionIds: [25, 26, 27, 28, 29, 30] },
];

export const LEARNING_QUESTION_IDS = Array.from({ length: 60 }, (_, i) => i + 1);
export const PRESSURE_QUESTION_IDS = Array.from({ length: 30 }, (_, i) => i + 1);

export const TOTAL_LEARNING_QUESTIONS = 60;
export const TOTAL_PRESSURE_QUESTIONS = 30;

export interface SurveyScores {
  percent: Record<Dimension, number>;
  average10: Record<Dimension, number>;
  pressure: Record<PressureDimension, number>;
  mindsetLabel: "成长型思维" | "固定型思维";
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getShuffledGroupQuestions(groupIndex: number): number[] {
  const group = SURVEY_GROUPS[groupIndex];
  if (!group) return [];
  return shuffleArray(group.questionIds);
}

export function getShuffledPressureQuestions(groupIndex: number): number[] {
  const group = PRESSURE_GROUPS[groupIndex];
  if (!group) return [];
  return shuffleArray(group.questionIds);
}

function raw(answers: Record<string, number>, q: number): number {
  return answers[String(q)] ?? 0;
}

/** 1-10 分制计分：reverse=true 时反转 */
function score10(
  answers: Record<string, number>,
  q: number,
  reverse = false
): number {
  const value = raw(answers, q);
  if (value === 0) return 0;
  return reverse ? 11 - value : value;
}

/** 1-5 分制计分（学业压力）：reverse=true 时反转 */
function score5(
  answers: Record<string, number>,
  q: number,
  reverse = false
): number {
  const value = raw(answers, q);
  if (value === 0) return 0;
  return reverse ? 6 - value : value;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  const valid = values.filter((v) => v !== 0);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

function toPercent(average10: number): number {
  return Math.round(average10 * 10 * 10) / 10;
}

/**
 * 计算学习力 10 个维度的得分。
 * 为了让量表平衡，每个维度内部分题目做反向计分。
 */
export function calculateScores(
  learningAnswers: Record<string, number>,
  pressureAnswers: Record<string, number>
): SurveyScores {
  // 思维模式 (Q1,Q3,Q4,Q5,Q6 正向；Q2 反向)
  const thinkingAvg = avg([
    score10(learningAnswers, 1),
    score10(learningAnswers, 2, true),
    score10(learningAnswers, 3),
    score10(learningAnswers, 4),
    score10(learningAnswers, 5),
    score10(learningAnswers, 6),
  ]);

  // 自主性 (Q7,Q9,Q11 正向；Q8,Q10,Q12 反向)
  const autonomyAvg = avg([
    score10(learningAnswers, 7),
    score10(learningAnswers, 8, true),
    score10(learningAnswers, 9),
    score10(learningAnswers, 10, true),
    score10(learningAnswers, 11),
    score10(learningAnswers, 12, true),
  ]);

  // 胜任感 (Q13,Q16,Q18 正向；Q14,Q15,Q17 反向)
  const competenceAvg = avg([
    score10(learningAnswers, 13),
    score10(learningAnswers, 14, true),
    score10(learningAnswers, 15, true),
    score10(learningAnswers, 16),
    score10(learningAnswers, 17, true),
    score10(learningAnswers, 18),
  ]);

  // 归属感 (Q19,Q21,Q22 正向；Q20,Q23,Q24 反向)
  const belongingAvg = avg([
    score10(learningAnswers, 19),
    score10(learningAnswers, 20, true),
    score10(learningAnswers, 21),
    score10(learningAnswers, 22),
    score10(learningAnswers, 23, true),
    score10(learningAnswers, 24, true),
  ]);

  // 深层动机 (Q25-Q30 均正向)
  const deepMotivationAvg = avg([
    score10(learningAnswers, 25),
    score10(learningAnswers, 26),
    score10(learningAnswers, 27),
    score10(learningAnswers, 28),
    score10(learningAnswers, 29),
    score10(learningAnswers, 30),
  ]);

  // 表层动机 (Q31-Q36 均作为"表层"量表，越高表示越表层)
  // 在"得分"解释中，表层分高表示学习动机越偏向外部，所以反向计分以匹配"越正面越好"
  const surfaceMotivationAvg = avg([
    score10(learningAnswers, 31, true),
    score10(learningAnswers, 32, true),
    score10(learningAnswers, 33, true),
    score10(learningAnswers, 34, true),
    score10(learningAnswers, 35, true),
    score10(learningAnswers, 36, true),
  ]);

  // 深层方法 (Q37-Q42 均正向)
  const deepMethodAvg = avg([
    score10(learningAnswers, 37),
    score10(learningAnswers, 38),
    score10(learningAnswers, 39),
    score10(learningAnswers, 40),
    score10(learningAnswers, 41),
    score10(learningAnswers, 42),
  ]);

  // 表层方法 (Q43-Q48 越高表示越依赖表层，反向计分)
  const surfaceMethodAvg = avg([
    score10(learningAnswers, 43, true),
    score10(learningAnswers, 44, true),
    score10(learningAnswers, 45, true),
    score10(learningAnswers, 46, true),
    score10(learningAnswers, 47, true),
    score10(learningAnswers, 48, true),
  ]);

  // 自我效能感 (Q49,Q50,Q51,Q53 正向；Q52,Q54 反向)
  const selfEfficacyAvg = avg([
    score10(learningAnswers, 49),
    score10(learningAnswers, 50),
    score10(learningAnswers, 51),
    score10(learningAnswers, 52, true),
    score10(learningAnswers, 53),
    score10(learningAnswers, 54, true),
  ]);

  // 学习自我调节 (Q55,Q56,Q57,Q58,Q60 正向；Q59 反向)
  const selfRegulationAvg = avg([
    score10(learningAnswers, 55),
    score10(learningAnswers, 56),
    score10(learningAnswers, 57),
    score10(learningAnswers, 58),
    score10(learningAnswers, 59, true),
    score10(learningAnswers, 60),
  ]);

  const average10: Record<Dimension, number> = {
    思维模式: Math.round(thinkingAvg * 10) / 10,
    自主性: Math.round(autonomyAvg * 10) / 10,
    胜任感: Math.round(competenceAvg * 10) / 10,
    归属感: Math.round(belongingAvg * 10) / 10,
    深层动机: Math.round(deepMotivationAvg * 10) / 10,
    表层动机: Math.round(surfaceMotivationAvg * 10) / 10,
    深层方法: Math.round(deepMethodAvg * 10) / 10,
    表层方法: Math.round(surfaceMethodAvg * 10) / 10,
    自我效能感: Math.round(selfEfficacyAvg * 10) / 10,
    学习自我调节: Math.round(selfRegulationAvg * 10) / 10,
  };

  const percent = {} as Record<Dimension, number>;
  for (const dim of DIMENSIONS) {
    percent[dim] = toPercent(average10[dim]);
  }

  // 学业压力 5 个维度（1-5 分制，直接平均，分数越高压力越大）
  const pressure: Record<PressureDimension, number> = {
    学业负担: Math.round(
      (avg([
        score5(pressureAnswers, 1),
        score5(pressureAnswers, 2),
        score5(pressureAnswers, 3),
        score5(pressureAnswers, 4),
        score5(pressureAnswers, 5),
        score5(pressureAnswers, 6),
      ]) || 0) * 10
    ) / 10,
    师生关系: Math.round(
      (avg([
        score5(pressureAnswers, 7),
        score5(pressureAnswers, 8),
        score5(pressureAnswers, 9),
        score5(pressureAnswers, 10),
        score5(pressureAnswers, 11),
        score5(pressureAnswers, 12),
      ]) || 0) * 10
    ) / 10,
    家庭期望: Math.round(
      (avg([
        score5(pressureAnswers, 13),
        score5(pressureAnswers, 14),
        score5(pressureAnswers, 15),
        score5(pressureAnswers, 16),
        score5(pressureAnswers, 17),
        score5(pressureAnswers, 18),
      ]) || 0) * 10
    ) / 10,
    同伴竞争: Math.round(
      (avg([
        score5(pressureAnswers, 19),
        score5(pressureAnswers, 20),
        score5(pressureAnswers, 21),
        score5(pressureAnswers, 22),
        score5(pressureAnswers, 23),
        score5(pressureAnswers, 24),
      ]) || 0) * 10
    ) / 10,
    自我要求: Math.round(
      (avg([
        score5(pressureAnswers, 25),
        score5(pressureAnswers, 26),
        score5(pressureAnswers, 27),
        score5(pressureAnswers, 28),
        score5(pressureAnswers, 29),
        score5(pressureAnswers, 30),
      ]) || 0) * 10
    ) / 10,
  };

  const thinkingPercent = percent.思维模式;
  return {
    percent,
    average10,
    pressure,
    mindsetLabel: thinkingPercent >= 50 ? "成长型思维" : "固定型思维",
  };
}

/** 扁平化存储用：percent + pressure + mindsetLabel */
export function scoresToFlat(
  scores: SurveyScores
): Record<string, number | string> {
  return {
    ...scores.percent,
    ...Object.fromEntries(
      PRESSURE_DIMENSIONS.map((d) => [`学业压力_${d}`, scores.pressure[d]])
    ),
    mindsetLabel: scores.mindsetLabel,
  };
}

export function flatToScores(
  flat: Record<string, unknown>
): SurveyScores | null {
  try {
    const percent = {} as Record<Dimension, number>;
    const average10 = {} as Record<Dimension, number>;
    for (const dim of DIMENSIONS) {
      const p = flat[dim];
      if (typeof p === "number") {
        percent[dim] = p;
        average10[dim] = Math.round((p / 10) * 10) / 10;
      }
    }
    const pressure = {} as Record<PressureDimension, number>;
    for (const d of PRESSURE_DIMENSIONS) {
      const v = flat[`学业压力_${d}`];
      if (typeof v === "number") pressure[d] = v;
    }
    const label = flat.mindsetLabel;
    return {
      percent,
      average10,
      pressure,
      mindsetLabel:
        label === "成长型思维" || label === "固定型思维"
          ? label
          : (percent.思维模式 ?? 0) >= 50
            ? "成长型思维"
            : "固定型思维",
    };
  } catch {
    return null;
  }
}

export const RESULT_GROUPS = [
  {
    title: "内在动力",
    color: "amber" as const,
    items: [
      { key: "自主性" as Dimension, label: "自主性" },
      { key: "胜任感" as Dimension, label: "胜任感" },
      { key: "归属感" as Dimension, label: "归属感" },
    ],
  },
  {
    title: "学习动机与效能",
    color: "amber" as const,
    items: [
      { key: "深层动机" as Dimension, label: "深层动机" },
      { key: "表层动机" as Dimension, label: "表层动机" },
      { key: "自我效能感" as Dimension, label: "自我效能感" },
    ],
  },
  {
    title: "学习方法与调节",
    color: "amber" as const,
    items: [
      { key: "深层方法" as Dimension, label: "深层方法" },
      { key: "表层方法" as Dimension, label: "表层方法" },
      { key: "学习自我调节" as Dimension, label: "学习自我调节" },
    ],
  },
];
