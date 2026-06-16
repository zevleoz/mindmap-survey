import openpyxl
import re
import json

# 1) 从 xlsx 中读取
wb = openpyxl.load_workbook('Survey_Translation.xlsx')
ws = wb.active
xlsx_rows = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        continue
    xlsx_rows.append({
        'idx': i,
        'zh': (row[0] or '').strip(),
        'en': (row[1] or '').strip(),
    })

# 2) 从 survey-data.ts 中提取
with open('lib/survey-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# LEARNING_QUESTION_BANK: Record<number, QuestionDef> = {
#   1: { id: 1, text: "xxx" },
#   ...
# };
code_learning = {}
# 用更简单的方式：查找 "NUMBER: { id: NUMBER, text: "XXX" }" 的片段
for id_, text in re.findall(r'(\d+)\s*:\s*\{\s*id\s*:\s*\d+\s*,\s*text\s*:\s*"([^"]+)"', content):
    code_learning[int(id_)] = text

# PRESSURE_QUESTIONS: QuestionDef[] = [ ... ]
# 用 { id: NUMBER, text: "XXX" } 片段
code_pressure = []
# 在压力题数组的区域内找
pressure_start = content.find('PRESSURE_QUESTIONS')
pressure_end = content.find('];', pressure_start)
pressure_section = content[pressure_start:pressure_end]
for id_, text in re.findall(r'\{\s*id\s*:\s*(\d+)\s*,\s*text\s*:\s*"([^"]+)"', pressure_section):
    code_pressure.append({'id': int(id_), 'text': text})

print(f"survey-data.ts: {len(code_learning)} learning, {len(code_pressure)} pressure")
print(f"xlsx: {len(xlsx_rows)} rows")

# === 学习力：完全匹配统计 ===
learning_exact = 0
learning_mismatch = []
for qid in range(1, 61):
    code_text = code_learning.get(qid, "")
    # xlsx 中第 qid 题（xlsx 前 60 题是学习力）
    xlsx_text = xlsx_rows[qid - 1]['zh']
    if code_text == xlsx_text:
        learning_exact += 1
    else:
        learning_mismatch.append((qid, code_text, xlsx_text))

print(f"\n=== 学习力：完全匹配 {learning_exact}/60 ===")
if learning_mismatch:
    print("不匹配的题目：")
    for qid, c, x in learning_mismatch:
        print(f"  Q{qid}: code='{c}'")
        print(f"         xlsx='{x}'")

# === 压力题：完全匹配统计 ===
pressure_exact = 0
pressure_mismatch = []
for i, pq in enumerate(code_pressure):
    # xlsx 中第 61+i 题是压力题
    xlsx_idx = 60 + i
    xlsx_text = xlsx_rows[xlsx_idx]['zh'] if xlsx_idx < len(xlsx_rows) else ""
    if pq['text'] == xlsx_text:
        pressure_exact += 1
    else:
        pressure_mismatch.append((pq['id'], pq['text'], xlsx_text))

print(f"\n=== 压力题：完全匹配 {pressure_exact}/30 ===")
if pressure_mismatch:
    print("不匹配的题目：")
    for pid, c, x in pressure_mismatch:
        print(f"  P{pid}: code='{c}'")
        print(f"         xlsx='{x}'")

# === 语义相似度匹配 ===
# 如果不是完全按题号对应，看 survey-data.ts 的每道题，在整个 xlsx 中找最相似的
print("\n=== 模糊匹配：学习力每题在 xlsx 中找最相似的中文 ===")
import difflib
all_xlsx_zhs = [r['zh'] for r in xlsx_rows]
xlsx_zh_to_en = {r['zh']: r['en'] for r in xlsx_rows}

for qid in range(1, 61):
    code_text = code_learning.get(qid, "")
    matches = difflib.get_close_matches(code_text, all_xlsx_zhs, n=3, cutoff=0.6)
    if matches:
        best = matches[0]
        en = xlsx_zh_to_en.get(best, "")
        print(f"  Q{qid}: code='{code_text}'")
        print(f"        best='{best}' (en='{en}')")
    else:
        print(f"  Q{qid}: code='{code_text}' -> 无匹配")

print("\n=== 模糊匹配：压力题在 xlsx 中找最相似的中文 ===")
for pq in code_pressure:
    matches = difflib.get_close_matches(pq['text'], all_xlsx_zhs, n=3, cutoff=0.6)
    if matches:
        best = matches[0]
        en = xlsx_zh_to_en.get(best, "")
        print(f"  P{pq['id']}: code='{pq['text']}'")
        print(f"           best='{best}' (en='{en}')")
    else:
        print(f"  P{pq['id']}: code='{pq['text']}' -> 无匹配")
