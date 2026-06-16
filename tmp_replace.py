import openpyxl, re

wb = openpyxl.load_workbook('Survey_Translation.xlsx')
ws = wb.active
rows = list(ws.iter_rows(values_only=True))

def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')

# Learning question bank
learning_lines = []
for i in range(1, 61):
    zh = rows[i][0].strip()
    en = rows[i][1].strip() if len(rows[i]) > 1 and rows[i][1] else ""
    learning_lines.append(f'  {i}: {{ id: {i}, text: "{esc(zh)}", en: "{esc(en)}" }},')
learning_body = "\n".join(learning_lines)

# Pressure questions array
pressure_lines = []
for idx, i in enumerate(range(61, 91), start=1):
    zh = rows[i][0].strip()
    en = rows[i][1].strip() if len(rows[i]) > 1 and rows[i][1] else ""
    pressure_lines.append(f'  {{ id: {idx}, text: "{esc(zh)}", en: "{esc(en)}" }},')
pressure_body = "\n".join(pressure_lines)

with open('lib/survey-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1) LEARNING_QUESTION_BANK body
bank_open = 'export const LEARNING_QUESTION_BANK: Record<number, QuestionDef> = {\n'
bank_close = '\n};\n\n/** 30 道学业压力题目'
assert bank_open in content, "bank_open not found"
assert bank_close in content, "bank_close not found"
bs = content.index(bank_open)
be = content.index(bank_close, bs)
content = content[:bs + len(bank_open)] + learning_body + content[be:]

# 2) PRESSURE_QUESTIONS body
press_open = 'export const PRESSURE_QUESTIONS: QuestionDef[] = [\n'
press_close = '\n];\n\n/** 10 个学习力展示分组'
assert press_open in content, "press_open not found"
assert press_close in content, "press_close not found"
ps = content.index(press_open)
pe = content.index(press_close, ps)
content = content[:ps + len(press_open)] + pressure_body + content[pe:]

# 3) PRESSURE_DIMENSIONS order (only if still old)
old_pdim = 'export const PRESSURE_DIMENSIONS = [\n  "学业负担",\n  "家庭期望",\n  "师生关系",\n  "同伴竞争",\n  "自我要求",\n] as const;'
new_pdim = 'export const PRESSURE_DIMENSIONS = [\n  "学业负担",\n  "师生关系",\n  "家庭期望",\n  "同伴竞争",\n  "自我要求",\n] as const;'
if old_pdim in content:
    content = content.replace(old_pdim, new_pdim)

# 4) Pressure scoring block — confirm it's using the old form
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
with open('lib/survey-data.ts', 'r', encoding='utf-8') as f:
    c = f.read()
en_count = len(re.findall(r'en:\s*"', c))
print(f"Questions with en field: {en_count} (expect 90)")
print("Done.")
