import openpyxl

wb = openpyxl.load_workbook('Survey_Translation.xlsx')
ws = wb.active
rows = list(ws.iter_rows(values_only=True))

def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')

# Build learning question bank
learning_lines = []
for i in range(1, 61):
    zh = rows[i][0].strip()
    en = rows[i][1].strip() if len(rows[i]) > 1 and rows[i][1] else ""
    learning_lines.append(f'  {i}: {{ id: {i}, text: "{esc(zh)}", en: "{esc(en)}" }},')
learning_body = "\n".join(learning_lines)

# Build pressure question array
pressure_lines = []
for idx, i in enumerate(range(61, 91), start=1):
    zh = rows[i][0].strip()
    en = rows[i][1].strip() if len(rows[i]) > 1 and rows[i][1] else ""
    pressure_lines.append(f'  {{ id: {idx}, text: "{esc(zh)}", en: "{esc(en)}" }},')
pressure_body = "\n".join(pressure_lines)

with open('lib/survey-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1) QuestionDef - add en field
old_qdef = 'export interface QuestionDef {\n  id: number;\n  text: string;\n}'
new_qdef = 'export interface QuestionDef {\n  id: number;\n  text: string;\n  en?: string;\n}'
assert old_qdef in content, "QuestionDef not found"
content = content.replace(old_qdef, new_qdef)

# 2) Replace LEARNING_QUESTION_BANK body
bank_open = 'export const LEARNING_QUESTION_BANK: Record<number, QuestionDef> = {\n'
bank_close = '\n};\n\n/** 30 道学业压力题目'
assert bank_open in content, "bank_open not found"
assert bank_close in content, "bank_close not found"
bs = content.index(bank_open)
be = content.index(bank_close, bs)
content = content[:bs + len(bank_open)] + learning_body + content[be:]

# 3) Replace PRESSURE_QUESTIONS body
press_open = 'export const PRESSURE_QUESTIONS: QuestionDef[] = [\n'
press_close = '\n];\n\n/** 10 个学习力展示分组'
assert press_open in content, "press_open not found"
assert press_close in content, "press_close not found"
ps = content.index(press_open)
pe = content.index(press_close, ps)
content = content[:ps + len(press_open)] + pressure_body + content[pe:]

# 4) PRESSURE_DIMENSIONS: reorder 师生关系 before 家庭期望
old_pdim = 'export const PRESSURE_DIMENSIONS = [\n  "学业负担",\n  "家庭期望",\n  "师生关系",\n  "同伴竞争",\n  "自我要求",\n] as const;'
new_pdim = 'export const PRESSURE_DIMENSIONS = [\n  "学业负担",\n  "师生关系",\n  "家庭期望",\n  "同伴竞争",\n  "自我要求",\n] as const;'
assert old_pdim in content, "PRESSURE_DIMENSIONS not found"
content = content.replace(old_pdim, new_pdim)

# 5) Replace learning scoring block
start_marker = '  // 思维模式 (Q1,Q3,Q4,Q5,Q6 正向；Q2 反向)\n'
end_marker = '  const average10: Record<Dimension, number> = {'
assert start_marker in content, "start_marker not found"
assert end_marker in content, "end_marker not found"
ss = content.index(start_marker)
ee = content.index(end_marker, ss)

new_learning_block = (
    '  // 思维模式 (a[1], a[2] 反向；a[3], a[4] 正向)\n'
    '  const thinkingAvg = avg([\n'
    '    score10(learningAnswers, 1, true),\n'
    '    score10(learningAnswers, 2, true),\n'
    '    score10(learningAnswers, 3),\n'
    '    score10(learningAnswers, 4),\n'
    '  ]);\n'
    '\n'
    '  // 自主性 (a[5] 正向；a[6] 反向；a[7] 正向；a[8] 反向)\n'
    '  const autonomyAvg = avg([\n'
    '    score10(learningAnswers, 5),\n'
    '    score10(learningAnswers, 6, true),\n'
    '    score10(learningAnswers, 7),\n'
    '    score10(learningAnswers, 8, true),\n'
    '  ]);\n'
    '\n'
    '  // 胜任感 (a[9] 反向；a[10], a[11], a[12] 正向；a[13], a[14] 反向)\n'
    '  const competenceAvg = avg([\n'
    '    score10(learningAnswers, 9, true),\n'
    '    score10(learningAnswers, 10),\n'
    '    score10(learningAnswers, 11),\n'
    '    score10(learningAnswers, 12),\n'
    '    score10(learningAnswers, 13, true),\n'
    '    score10(learningAnswers, 14, true),\n'
    '  ]);\n'
    '\n'
    '  // 归属感 (a[15], a[16] 正向；a[17] 反向；a[18], a[19] 正向；a[20], a[21] 反向；a[22] 正向)\n'
    '  const belongingAvg = avg([\n'
    '    score10(learningAnswers, 15),\n'
    '    score10(learningAnswers, 16),\n'
    '    score10(learningAnswers, 17, true),\n'
    '    score10(learningAnswers, 18),\n'
    '    score10(learningAnswers, 19),\n'
    '    score10(learningAnswers, 20, true),\n'
    '    score10(learningAnswers, 21, true),\n'
    '    score10(learningAnswers, 22),\n'
    '  ]);\n'
    '\n'
    '  // 深层动机 (a[23], a[27], a[31], a[35], a[39])\n'
    '  const deepMotivationAvg = avg([\n'
    '    score10(learningAnswers, 23),\n'
    '    score10(learningAnswers, 27),\n'
    '    score10(learningAnswers, 31),\n'
    '    score10(learningAnswers, 35),\n'
    '    score10(learningAnswers, 39),\n'
    '  ]);\n'
    '\n'
    '  // 表层动机 (a[24], a[28], a[32], a[36], a[40])\n'
    '  const surfaceMotivationAvg = avg([\n'
    '    score10(learningAnswers, 24),\n'
    '    score10(learningAnswers, 28),\n'
    '    score10(learningAnswers, 32),\n'
    '    score10(learningAnswers, 36),\n'
    '    score10(learningAnswers, 40),\n'
    '  ]);\n'
    '\n'
    '  // 深层方法 (a[25], a[29], a[33], a[37], a[41] — 全部反向)\n'
    '  const deepMethodAvg = avg([\n'
    '    score10(learningAnswers, 25, true),\n'
    '    score10(learningAnswers, 29, true),\n'
    '    score10(learningAnswers, 33, true),\n'
    '    score10(learningAnswers, 37, true),\n'
    '    score10(learningAnswers, 41, true),\n'
    '  ]);\n'
    '\n'
    '  // 表层方法 (a[26], a[30], a[34], a[38], a[42])\n'
    '  const surfaceMethodAvg = avg([\n'
    '    score10(learningAnswers, 26),\n'
    '    score10(learningAnswers, 30),\n'
    '    score10(learningAnswers, 34),\n'
    '    score10(learningAnswers, 38),\n'
    '    score10(learningAnswers, 42),\n'
    '  ]);\n'
    '\n'
    '  // 自我效能感 (a[43]..a[51]，共 9 题)\n'
    '  const selfEfficacyAvg = avg([\n'
    '    score10(learningAnswers, 43),\n'
    '    score10(learningAnswers, 44),\n'
    '    score10(learningAnswers, 45),\n'
    '    score10(learningAnswers, 46),\n'
    '    score10(learningAnswers, 47),\n'
    '    score10(learningAnswers, 48),\n'
    '    score10(learningAnswers, 49),\n'
    '    score10(learningAnswers, 50),\n'
    '    score10(learningAnswers, 51),\n'
    '  ]);\n'
    '\n'
    '  // 学习自我调节 (a[52] 正向；a[53] 反向；a[54], a[55], a[56] 正向；a[57], a[58] 反向；a[59], a[60] 正向)\n'
    '  const selfRegulationAvg = avg([\n'
    '    score10(learningAnswers, 52),\n'
    '    score10(learningAnswers, 53, true),\n'
    '    score10(learningAnswers, 54),\n'
    '    score10(learningAnswers, 55),\n'
    '    score10(learningAnswers, 56),\n'
    '    score10(learningAnswers, 57, true),\n'
    '    score10(learningAnswers, 58, true),\n'
    '    score10(learningAnswers, 59),\n'
    '    score10(learningAnswers, 60),\n'
    '  ]);\n'
    '\n'
)

content = content[:ss] + new_learning_block + content[ee:]

# 6) Replace pressure scoring block — need to reorder dimension order for the scores
#    New order in PRESSURE_DIMENSIONS: 学业负担/师生关系/家庭期望/同伴竞争/自我要求
#    The pressure scoring block was left as 学业负担/Q1-6, 师生关系/Q7-12, 家庭期望/Q13-18, etc.
#    which is already fine. Let me just make sure the pressure scoring is replaced with
#    the same question-to-dimension mapping.
# Find old pressure scoring
pressure_section_start = '  // 学业压力 5 个维度（1-5 分制，直接平均，分数越高压力越大）\n'
pressure_section_end = '  const thinkingPercent = percent.思维模式;'
assert pressure_section_start in content, "pressure_section_start not found"
assert pressure_section_end in content, "pressure_section_end not found"
pps = content.index(pressure_section_start)
ppe = content.index(pressure_section_end, pps)

new_pressure = (
    '  // 学业压力 5 个维度（1-5 分制，直接平均，分数越高压力越大）\n'
    '  const pressure: Record<PressureDimension, number> = {\n'
    '    学业负担: Math.round(\n'
    '      (avg([\n'
    '        score5(pressureAnswers, 1),\n'
    '        score5(pressureAnswers, 2),\n'
    '        score5(pressureAnswers, 3),\n'
    '        score5(pressureAnswers, 4),\n'
    '        score5(pressureAnswers, 5),\n'
    '        score5(pressureAnswers, 6),\n'
    '      ]) || 0) * 10\n'
    '    ) / 10,\n'
    '    师生关系: Math.round(\n'
    '      (avg([\n'
    '        score5(pressureAnswers, 7),\n'
    '        score5(pressureAnswers, 8),\n'
    '        score5(pressureAnswers, 9),\n'
    '        score5(pressureAnswers, 10),\n'
    '        score5(pressureAnswers, 11),\n'
    '        score5(pressureAnswers, 12),\n'
    '      ]) || 0) * 10\n'
    '    ) / 10,\n'
    '    家庭期望: Math.round(\n'
    '      (avg([\n'
    '        score5(pressureAnswers, 13),\n'
    '        score5(pressureAnswers, 14),\n'
    '        score5(pressureAnswers, 15),\n'
    '        score5(pressureAnswers, 16),\n'
    '        score5(pressureAnswers, 17),\n'
    '        score5(pressureAnswers, 18),\n'
    '      ]) || 0) * 10\n'
    '    ) / 10,\n'
    '    同伴竞争: Math.round(\n'
    '      (avg([\n'
    '        score5(pressureAnswers, 19),\n'
    '        score5(pressureAnswers, 20),\n'
    '        score5(pressureAnswers, 21),\n'
    '        score5(pressureAnswers, 22),\n'
    '        score5(pressureAnswers, 23),\n'
    '        score5(pressureAnswers, 24),\n'
    '      ]) || 0) * 10\n'
    '    ) / 10,\n'
    '    自我要求: Math.round(\n'
    '      (avg([\n'
    '        score5(pressureAnswers, 25),\n'
    '        score5(pressureAnswers, 26),\n'
    '        score5(pressureAnswers, 27),\n'
    '        score5(pressureAnswers, 28),\n'
    '        score5(pressureAnswers, 29),\n'
    '        score5(pressureAnswers, 30),\n'
    '      ]) || 0) * 10\n'
    '    ) / 10,\n'
    '  };\n'
    '\n'
)

content = content[:pps] + new_pressure + content[ppe:]

with open('lib/survey-data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Verification
import re
with open('lib/survey-data.ts', 'r', encoding='utf-8') as f:
    c = f.read()
en_count = len(re.findall(r'en:\s*"', c))
print(f"Questions with en field: {en_count} (expect 90)")
print("Done.")
