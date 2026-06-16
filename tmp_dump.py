import openpyxl

wb = openpyxl.load_workbook('Survey_Translation.xlsx')
ws = wb.active
rows = list(ws.iter_rows(values_only=True))

print("// LEARNING_QUESTION_BANK (a[1]..a[60])")
for i in range(1, 61):
    zh = rows[i][0].strip() if rows[i][0] else ""
    en = rows[i][1].strip() if len(rows[i]) > 1 and rows[i][1] else ""
    # escape backslashes & double quotes
    zh_esc = zh.replace('\\', '\\\\').replace('"', '\\"')
    en_esc = en.replace('\\', '\\\\').replace('"', '\\"')
    print(f'  {i}: {{ id: {i}, text: "{zh_esc}", en: "{en_esc}" }},')

print()
print("// PRESSURE_QUESTIONS (a[61]..a[90]) — items 1..30 in the pool")
for idx, i in enumerate(range(61, 91), start=1):
    zh = rows[i][0].strip() if rows[i][0] else ""
    en = rows[i][1].strip() if len(rows[i]) > 1 and rows[i][1] else ""
    zh_esc = zh.replace('\\', '\\\\').replace('"', '\\"')
    en_esc = en.replace('\\', '\\\\').replace('"', '\\"')
    print(f'  {{ id: {idx}, text: "{zh_esc}", en: "{en_esc}" }},')
