import openpyxl

wb = openpyxl.load_workbook('Survey_Translation.xlsx')
ws = wb.active

rows = list(ws.iter_rows(values_only=True))
# rows[0] = header (Chinese master, Suggested English Revision)
# rows[1..90] = questions

print("=== 验证 Excel 问题顺序 a[1]..a[90] 与计分表维度边界 ===")
print()

# 打印 a[1]..a[10] 的中文
print("学习力前 10 题 (a[1]..a[10]):")
for i in range(1, 11):
    zh = rows[i][0] if len(rows[i]) > 0 else ""
    en = rows[i][1] if len(rows[i]) > 1 else ""
    print(f"  a[{i}] (Chinese): {zh}")
    print(f"          (English): {en}")

print()
print("维度边界处的问题 (a[22]..a[28] 深层/表层动机边界):")
for i in range(22, 29):
    zh = rows[i][0] if len(rows[i]) > 0 else ""
    print(f"  a[{i}]: {zh}")

print()
print("维度边界处的问题 (a[41]..a[52] 自我效能感边界):")
for i in range(41, 53):
    zh = rows[i][0] if len(rows[i]) > 0 else ""
    print(f"  a[{i}]: {zh}")

print()
print("学业压力开始 (a[61]..a[66] 学业负担):")
for i in range(61, 67):
    zh = rows[i][0] if len(rows[i]) > 0 else ""
    print(f"  a[{i}]: {zh}")

print()
print("学业压力结尾 (a[85]..a[90] 自我要求):")
for i in range(85, 91):
    zh = rows[i][0] if len(rows[i]) > 0 else ""
    print(f"  a[{i}]: {zh}")

# 同时打印所有 90 道题的中英对照，供后面编程用
print()
print("=== 完整 90 道题（中英文对照，含反向标记）===")
# 每个学习力维度的题目编号与方向
# 思维模式 1,2R,3,4 / 自主性 5,6R,7,8R / 胜任感 9R,10,11,12,13R,14R /
# 归属感 15,16,17R,18,19,20R,21R,22 / 深层动机 23,27,31,35,39 /
# 表层动机 24,28,32,36,40 / 深层方法 25R,29R,33R,37R,41R /
# 表层方法 26,30,34,38,42 / 自我效能感 43..51 /
# 学习自我调节 52,53R,54,55,56,57R,58R,59,60
learning_dims = {
    1: "思维模式", 2: "思维模式", 3: "思维模式", 4: "思维模式",
    5: "自主性", 6: "自主性", 7: "自主性", 8: "自主性",
    9: "胜任感", 10: "胜任感", 11: "胜任感", 12: "胜任感",
    13: "胜任感", 14: "胜任感",
    15: "归属感", 16: "归属感", 17: "归属感", 18: "归属感",
    19: "归属感", 20: "归属感", 21: "归属感", 22: "归属感",
    23: "深层动机", 27: "深层动机", 31: "深层动机", 35: "深层动机", 39: "深层动机",
    24: "表层动机", 28: "表层动机", 32: "表层动机", 36: "表层动机", 40: "表层动机",
    25: "深层方法", 29: "深层方法", 33: "深层方法", 37: "深层方法", 41: "深层方法",
    26: "表层方法", 30: "表层方法", 34: "表层方法", 38: "表层方法", 42: "表层方法",
}
# 自我效能感 43..51 (9题)
for i in range(43, 52):
    learning_dims[i] = "自我效能感"
# 学习自我调节 52..60 (9题)
for i in range(52, 61):
    learning_dims[i] = "学习自我调节"

reversed_set = {2, 6, 8, 9, 13, 14, 17, 20, 21, 25, 29, 33, 37, 41, 53, 57, 58}

pressure_dims = {
    61: "学业负担", 62: "学业负担", 63: "学业负担", 64: "学业负担", 65: "学业负担", 66: "学业负担",
    67: "师生关系", 68: "师生关系", 69: "师生关系", 70: "师生关系", 71: "师生关系", 72: "师生关系",
    73: "家庭期望", 74: "家庭期望", 75: "家庭期望", 76: "家庭期望", 77: "家庭期望", 78: "家庭期望",
    79: "同伴竞争", 80: "同伴竞争", 81: "同伴竞争", 82: "同伴竞争", 83: "同伴竞争", 84: "同伴竞争",
    85: "自我要求", 86: "自我要求", 87: "自我要求", 88: "自我要求", 89: "自我要求", 90: "自我要求",
}

print("学习力 60 题 (a[1]..a[60]，1-10 分):")
for i in range(1, 61):
    zh = rows[i][0]
    en = rows[i][1] if len(rows[i]) > 1 else ""
    dim = learning_dims.get(i, "???")
    flag = " [REVERSE]" if i in reversed_set else ""
    print(f"  a[{i}] ({dim}{flag}): {zh}")
    print(f"      EN: {en}")

print()
print("学业压力 30 题 (a[61]..a[90]，1-5 分，无反向):")
for i in range(61, 91):
    zh = rows[i][0]
    en = rows[i][1] if len(rows[i]) > 1 else ""
    dim = pressure_dims.get(i, "???")
    print(f"  a[{i}] ({dim}): {zh}")
    print(f"      EN: {en}")
