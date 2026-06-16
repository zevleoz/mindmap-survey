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
  "师生关系",
  "家庭期望",
  "同伴竞争",
  "自我要求",
] as const;

export type PressureDimension = (typeof PRESSURE_DIMENSIONS)[number];

export interface QuestionDef {
  id: number;
  text: string;
  en?: string;
}

export interface SurveyGroup {
  id: number;
  title: string;
  questionIds: number[];
}

/** 60 道唯一学习力题目（Q1-Q60） */
export const LEARNING_QUESTION_BANK: Record<number, QuestionDef> = {
  1: { id: 1, text: "我的能力是固定的，基本不会变。", en: "My abilities are largely fixed and do not change much." },
  2: { id: 2, text: "我不擅长某些事，即使努力也不会有变化。", en: "There are some things I am not good at, and effort will not make much difference." },
  3: { id: 3, text: "只要努力，我就可以变得更聪明。", en: "If I put in enough effort, I can become more intelligent." },
  4: { id: 4, text: "通过练习，会提高我的能力。", en: "Practice can improve my abilities." },
  5: { id: 5, text: "通常我很乐意表达自己的想法和观点。", en: "I generally feel comfortable expressing my ideas and opinions." },
  6: { id: 6, text: "在日常生活中，我经常不得不做一些别人让我做的事情。", en: "In daily life, I often have to do things because others expect me to." },
  7: { id: 7, text: "在日常生活中，我经常感到我可以按自己的意愿做事。", en: "In daily life, I often feel free to act according to my own choices." },
  8: { id: 8, text: "在生活中，我没有太多机会去决定自己的事情。", en: "In my life, I do not have many opportunities to make my own decisions." },
  9: { id: 9, text: "我经常觉得自己没有能力。", en: "I often feel incapable." },
  10: { id: 10, text: "了解我的人说，我会把事情完成得很好。", en: "People who know me say that I do things well." },
  11: { id: 11, text: "最近，我有能力去学习有趣的新技能。", en: "Recently, I have felt capable of learning interesting new skills." },
  12: { id: 12, text: "很多时候，我能从自己做的事情中感受到成就感。", en: "I often feel a sense of accomplishment from what I do." },
  13: { id: 13, text: "在日常生活中，我没有太多展示自己能力的机会。", en: "In daily life, I do not have many opportunities to demonstrate my abilities." },
  14: { id: 14, text: "我经常感到自己能力不足。", en: "I often feel that my abilities are inadequate." },
  15: { id: 15, text: "我非常喜欢和我打交道的人。", en: "I really like the people I interact with." },
  16: { id: 16, text: "我与接触过的人都会相处融洽。", en: "I get along well with the people I come into contact with." },
  17: { id: 17, text: "我常常一个人独处，没有太多社交活动。", en: "I often spend time alone and have few social activities." },
  18: { id: 18, text: "我身边的人很关心我。", en: "The people around me care about me." },
  19: { id: 19, text: "在日常生活中，与我交往的人常常会考虑我的感受。", en: "In daily life, the people I interact with often consider my feelings." },
  20: { id: 20, text: "我没有太多亲近的人。", en: "I do not have many people I feel close to." },
  21: { id: 21, text: "我周围的人一般不太喜欢我。", en: "People around me generally do not like me very much." },
  22: { id: 22, text: "人们对我都很友好。", en: "People are generally friendly toward me." },
  23: { id: 23, text: "我发现学习常常给我带来个人满足感。", en: "Studying often gives me a sense of personal satisfaction." },
  24: { id: 24, text: "我会一直研究一个问题，直到找到让自己满意的答案。", en: "I continue exploring a problem until I reach an answer that satisfies me." },
  25: { id: 25, text: "我的目标是花最少的力气通过考试。", en: "My goal is to pass exams while putting in as little effort as possible." },
  26: { id: 26, text: "我只认真学习老师告诉我们必须记住的内容。", en: "I only study seriously the material that teachers tell us we must remember." },
  27: { id: 27, text: "一旦接触到新的课题，我就会变得特别好奇，想了解更多。", en: "When I encounter a new topic, I become curious and want to learn more about it." },
  28: { id: 28, text: "我觉得大多数学科都很有趣，会在课外时间继续探索和研究。", en: "I find most subjects interesting and often explore them further outside class." },
  29: { id: 29, text: "我对所学学科不太感兴趣，所以成绩通常不高。", en: "I am not very interested in what I study, so my academic performance is usually not very strong." },
  30: { id: 30, text: "学习时，我会一遍遍重复，直到记住内容，即使我并不完全理解。", en: "When studying, I repeatedly review material until I can remember it, even if I do not fully understand it." },
  31: { id: 31, text: "研究问题时，就像看一本好书或一部有趣的电影一样，让我感到兴奋。", en: "Exploring a topic can be as exciting to me as reading a good book or watching an engaging film." },
  32: { id: 32, text: "对于重要的内容，我会进行自我测试，直到完全理解为止。", en: "I test myself on important material until I understand it completely." },
  33: { id: 33, text: "我觉得不需要完全理解，只要记住一些关键点，就能通过大多数考试。", en: "I believe that memorizing a few key points is enough to pass most exams without fully understanding the material." },
  34: { id: 34, text: "我通常只学习老师要求的内容，不会额外查阅其他资料。", en: "I usually study only what is assigned and do not seek additional resources." },
  35: { id: 35, text: "我很用心学习，因为觉得课本内容很有趣。", en: "I study hard because I find the learning material genuinely interesting." },
  36: { id: 36, text: "我会在课下花很多时间研究课堂上讨论的有趣问题。", en: "I spend a great deal of time outside class exploring interesting issues discussed in class." },
  37: { id: 37, text: "我觉得没有必要深入研究问题，那样太浪费时间，稍微了解就可以了。", en: "I do not think it is necessary to study topics in depth; a basic understanding is sufficient." },
  38: { id: 38, text: "我觉得老师并不希望我们花太多时间学习考试不会考的内容。", en: "I believe teachers do not expect students to spend much time on material that will not be tested." },
  39: { id: 39, text: "我常常带着问题或疑问去上课。", en: "I often come to class with questions I want answered." },
  40: { id: 40, text: "我会阅读与课堂内容相关的其他书籍或资料，以了解更多。", en: "I read additional books or materials related to class topics to deepen my understanding." },
  41: { id: 41, text: "我只复习考试可能会考的内容。", en: "I only review material that is likely to appear on the exam." },
  42: { id: 42, text: "我觉得通过考试最好的办法就是把可能考的题目答案背下来。", en: "I believe the best way to pass exams is to memorize answers to likely questions." },
  43: { id: 43, text: "与班里其他同学相比，我希望自己学得更好。", en: "Compared with my classmates, I want to learn better." },
  44: { id: 44, text: "我相信自己能够理解这堂课上的内容。", en: "I believe I can understand the content taught in this class." },
  45: { id: 45, text: "我期望自己在班里的学习表现非常好。", en: "I expect to perform very well academically in my class." },
  46: { id: 46, text: "与班里其他同学相比，我相信自己是一名好学生。", en: "Compared with other students in my class, I believe I am a good student." },
  47: { id: 47, text: "我敢肯定我能够出色完成老师布置的作业和任务。", en: "I am confident that I can successfully complete the assignments and tasks given by my teacher." },
  48: { id: 48, text: "我想在班里我能够得到一个好的等级分数。", en: "I believe I can achieve good grades in class." },
  49: { id: 49, text: "与班里其他同学相比，我的学习能力是优秀的。", en: "Compared with my classmates, I believe my learning ability is strong." },
  50: { id: 50, text: "与班里其他同学相比，我对某一学科的知识掌握得更多。", en: "Compared with my classmates, I have a stronger grasp of knowledge in certain subjects." },
  51: { id: 51, text: "我知道自己能够掌握课堂上呈现的学习材料。", en: "I know I can master the material presented in class." },
  52: { id: 52, text: "为了确保自己真正理解所学内容，我会提问自己。", en: "To ensure I truly understand what I have learned, I ask myself questions." },
  53: { id: 53, text: "遇到有难度的学习任务时，我要么放弃，要么只做容易的部分。", en: "When faced with difficult learning tasks, I either give up or focus only on the easier parts." },
  54: { id: 54, text: "即使没有要求，我也会练习和完成每章后面的习题。", en: "Even when it is not required, I complete the practice exercises at the end of each chapter." },
  55: { id: 55, text: "即使学习内容枯燥乏味，我也会把它完成。", en: "Even when the material is boring, I still complete it." },
  56: { id: 56, text: "在开始学习前，我会思考自己需要完成哪些任务。", en: "Before I begin studying, I think about the tasks I need to accomplish." },
  57: { id: 57, text: "我经常发现自己对正在阅读的内容不太理解。", en: "I often realize that I do not fully understand what I am reading." },
  58: { id: 58, text: "老师讲课时，我常常走神，没有认真听讲。", en: "I often lose focus and do not listen carefully during lessons." },
  59: { id: 59, text: "阅读时，我会停下来回顾前面读过的内容。", en: "When reading, I pause to review what I have already read." },
  60: { id: 60, text: "即使有些课程内容不是我喜欢的，为了取得好成绩，我也会努力学习。", en: "Even when I do not enjoy certain course content, I work hard to achieve good grades." },
};

/** 30 道学业压力题目（Q1-Q30） */
export const PRESSURE_QUESTIONS: QuestionDef[] = [
  { id: 1, text: "我经常因为作业太多而睡得很晚。", en: "I often stay up late because I have too much homework." },
  { id: 2, text: "有些课程进度太快，我很难完全理解。", en: "Some courses move so quickly that I struggle to fully understand the content." },
  { id: 3, text: "考试安排得太密集，我常感到疲惫。", en: "The exam schedule is so intensive that I often feel exhausted." },
  { id: 4, text: "我觉得老师布置的任务超出了我能承受的范围。", en: "I feel that the tasks assigned by teachers exceed what I can reasonably handle." },
  { id: 5, text: "有时候我做题只是为了赶进度，而不是理解知识。", en: "Sometimes I complete work just to keep up with the pace rather than to understand the material." },
  { id: 6, text: "学校活动、作业和补课堆在一起，让我透不过气。", en: "School activities, homework, and extra classes often leave me feeling overwhelmed." },
  { id: 7, text: "我害怕因为成绩不好而被老师当众批评。", en: "I worry about being criticized by teachers in front of others because of poor grades." },
  { id: 8, text: "我觉得有些老师对成绩差的学生不够耐心。", en: "I feel that some teachers are not patient with students who perform poorly." },
  { id: 9, text: "老师更多关注分数，而不是学生的努力过程。", en: "Teachers seem to focus more on grades than on students’ effort and learning process." },
  { id: 10, text: "当我有问题想问老师时，有时不敢开口。", en: "Sometimes I am hesitant to ask teachers questions even when I need help." },
  { id: 11, text: "老师的严格要求让我很担心自己出错。", en: "Teachers’ high expectations make me worry about making mistakes." },
  { id: 12, text: "我觉得老师布置任务时很少考虑学生的压力。", en: "I feel that teachers rarely consider students’ stress when assigning work." },
  { id: 13, text: "父母经常提醒我要考上好学校。", en: "My parents often remind me that I should get into a good school." },
  { id: 14, text: "成绩不好时，父母的反应让我更焦虑。", en: "When my grades are poor, my parents’ reactions make me feel even more anxious." },
  { id: 15, text: "父母会拿我的成绩和亲戚或同学比较。", en: "My parents compare my academic performance with that of relatives or classmates." },
  { id: 16, text: "父母经常在家里谈论我的学习成绩。", en: "My parents frequently discuss my academic performance at home." },
  { id: 17, text: "父母更关心分数，而不是我的兴趣或感受。", en: "My parents care more about my grades than about my interests or feelings." },
  { id: 18, text: "我担心如果成绩不好，会让父母失望。", en: "I worry that poor academic performance will disappoint my parents." },
  { id: 19, text: "班上总有很多同学学习很好，我会感到压力。", en: "I feel pressure because many students in my class perform very well academically." },
  { id: 20, text: "每次成绩公布时，我都会担心排名。", en: "Whenever grades are released, I worry about my ranking." },
  { id: 21, text: "同学之间经常讨论成绩，让我有压力。", en: "Frequent discussions about grades among classmates make me feel pressured." },
  { id: 22, text: "当别人成绩比我好时，我会感到沮丧。", en: "I feel discouraged when others achieve better grades than I do." },
  { id: 23, text: "看到别人努力学习时，我会觉得自己不够好。", en: "When I see others studying hard, I sometimes feel that I am not good enough." },
  { id: 24, text: "我害怕在集体活动中表现不好，被同学看不起。", en: "I worry that performing poorly in group activities will cause my classmates to look down on me." },
  { id: 25, text: "我对自己学习的要求比别人更严格。", en: "I hold myself to higher academic standards than most people do." },
  { id: 26, text: "没有达到目标时，我会非常自责。", en: "When I fail to reach my goals, I blame myself harshly." },
  { id: 27, text: "我担心自己的表现会让别人失望。", en: "I worry that my performance will disappoint others." },
  { id: 28, text: "我常觉得必须做到最好才能安心。", en: "I often feel that I must do my very best in order to feel at ease." },
  { id: 29, text: "成绩一旦下降，我会反复责怪自己。", en: "When my grades decline, I repeatedly blame myself." },
  { id: 30, text: "即使考得很好，我也觉得自己还不够好。", en: "Even when I perform well, I still feel that I am not good enough." },
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

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 学习力全部 60 道题目随机打乱（整池），不分维度 */
export function getShuffledAllLearning(): number[] {
  return shuffleArray(LEARNING_QUESTION_IDS);
}

/** 学业压力全部 30 道题目随机打乱（整池），不分维度 */
export function getShuffledAllPressure(): number[] {
  return shuffleArray(PRESSURE_QUESTION_IDS);
}

/** 学习力分页面：把 60 道打乱后的题目按 pageSize 切页，学生看不到维度 */
export function splitIntoPages(
  ids: number[],
  pageSize = 10
): number[][] {
  const pages: number[][] = [];
  for (let i = 0; i < ids.length; i += pageSize) {
    pages.push(ids.slice(i, i + pageSize));
  }
  return pages;
}

/** 整池打乱学习力 60 题 + 学业压力 30 题，两个数组独立打乱，返回 { learning, pressure } */
export function shuffleQuestionIds(): { learning: number[]; pressure: number[] } {
  return {
    learning: shuffleArray(LEARNING_QUESTION_IDS),
    pressure: shuffleArray(PRESSURE_QUESTION_IDS),
  };
}

export interface SurveyScores {
  percent: Record<Dimension, number>;
  average10: Record<Dimension, number>;
  pressure: Record<PressureDimension, number>;
  mindsetLabel: "成长型思维" | "固定型思维";
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
  // 思维模式 (a[1], a[2] 反向；a[3], a[4] 正向)
  const thinkingAvg = avg([
    score10(learningAnswers, 1, true),
    score10(learningAnswers, 2, true),
    score10(learningAnswers, 3),
    score10(learningAnswers, 4),
  ]);

  // 自主性 (a[5] 正向；a[6] 反向；a[7] 正向；a[8] 反向)
  const autonomyAvg = avg([
    score10(learningAnswers, 5),
    score10(learningAnswers, 6, true),
    score10(learningAnswers, 7),
    score10(learningAnswers, 8, true),
  ]);

  // 胜任感 (a[9] 反向；a[10], a[11], a[12] 正向；a[13], a[14] 反向)
  const competenceAvg = avg([
    score10(learningAnswers, 9, true),
    score10(learningAnswers, 10),
    score10(learningAnswers, 11),
    score10(learningAnswers, 12),
    score10(learningAnswers, 13, true),
    score10(learningAnswers, 14, true),
  ]);

  // 归属感 (a[15], a[16] 正向；a[17] 反向；a[18], a[19] 正向；a[20], a[21] 反向；a[22] 正向)
  const belongingAvg = avg([
    score10(learningAnswers, 15),
    score10(learningAnswers, 16),
    score10(learningAnswers, 17, true),
    score10(learningAnswers, 18),
    score10(learningAnswers, 19),
    score10(learningAnswers, 20, true),
    score10(learningAnswers, 21, true),
    score10(learningAnswers, 22),
  ]);

  // 深层动机 (a[23], a[27], a[31], a[35], a[39])
  const deepMotivationAvg = avg([
    score10(learningAnswers, 23),
    score10(learningAnswers, 27),
    score10(learningAnswers, 31),
    score10(learningAnswers, 35),
    score10(learningAnswers, 39),
  ]);

  // 表层动机 (a[24], a[28], a[32], a[36], a[40])
  const surfaceMotivationAvg = avg([
    score10(learningAnswers, 24),
    score10(learningAnswers, 28),
    score10(learningAnswers, 32),
    score10(learningAnswers, 36),
    score10(learningAnswers, 40),
  ]);

  // 深层方法 (a[25], a[29], a[33], a[37], a[41] — 全部反向)
  const deepMethodAvg = avg([
    score10(learningAnswers, 25, true),
    score10(learningAnswers, 29, true),
    score10(learningAnswers, 33, true),
    score10(learningAnswers, 37, true),
    score10(learningAnswers, 41, true),
  ]);

  // 表层方法 (a[26], a[30], a[34], a[38], a[42])
  const surfaceMethodAvg = avg([
    score10(learningAnswers, 26),
    score10(learningAnswers, 30),
    score10(learningAnswers, 34),
    score10(learningAnswers, 38),
    score10(learningAnswers, 42),
  ]);

  // 自我效能感 (a[43]..a[51]，共 9 题)
  const selfEfficacyAvg = avg([
    score10(learningAnswers, 43),
    score10(learningAnswers, 44),
    score10(learningAnswers, 45),
    score10(learningAnswers, 46),
    score10(learningAnswers, 47),
    score10(learningAnswers, 48),
    score10(learningAnswers, 49),
    score10(learningAnswers, 50),
    score10(learningAnswers, 51),
  ]);

  // 学习自我调节 (a[52] 正向；a[53] 反向；a[54], a[55], a[56] 正向；a[57], a[58] 反向；a[59], a[60] 正向)
  const selfRegulationAvg = avg([
    score10(learningAnswers, 52),
    score10(learningAnswers, 53, true),
    score10(learningAnswers, 54),
    score10(learningAnswers, 55),
    score10(learningAnswers, 56),
    score10(learningAnswers, 57, true),
    score10(learningAnswers, 58, true),
    score10(learningAnswers, 59),
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

// ========== Admin 面板：10 道关键题
// 规则：学业压力题得分 > 3（5 分制）视为"高风险"需要特别关注
// 这里挑出的题目覆盖了学业压力的 5 个维度，以便快速扫描
export const CRITICAL_QUESTIONS = [
  // 学业负担（前 6 题）
  { id: 2, domain: "学业负担", score: 5 },
  { id: 4, domain: "学业负担", score: 5 },
  // 师生关系（接下来 6 题）
  { id: 8, domain: "师生关系", score: 5 },
  { id: 9, domain: "师生关系", score: 5 },
  { id: 10, domain: "师生关系", score: 5 },
  // 家庭期望（接下来 6 题）
  { id: 14, domain: "家庭期望", score: 5 },
  { id: 17, domain: "家庭期望", score: 5 },
  // 同伴竞争（接下来 6 题）
  { id: 23, domain: "同伴竞争", score: 5 },
  // 自我要求（最后 6 题）
  { id: 26, domain: "自我要求", score: 5 },
  { id: 30, domain: "自我要求", score: 5 },
];

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
