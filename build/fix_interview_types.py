# -*- coding: utf-8 -*-
"""
一次性修正面试题型错配（2026-07-26 用户反馈）。
按 sz 数据的题目下标定位 → 转成"题干→新题型"映射 → 同步应用到 sz/ms 及 src/ 源目录。
framework 的【题型】模板也随之替换。可重复运行（幂等）。
"""
import re, json, sys

# ---- 新题型的 framework 模板（现场模拟为新增；其余沿用库内既有模板）----
FRAMEWORKS = {
    "综合分析": "【题型】综合分析\n【结构化思路】破题表态 → 多维分析(意义/问题/原因) → 提出对策 → 总结升华\n【核心要点】① 亮明观点 ② 辩证分析 ③ 落地举措",
    "应急应变": "【题型】应急应变\n【结构化思路】快速响应控场 → 分级分类处置 → 根源化解/安抚 → 复盘防范\n【核心要点】① 稳局面 ② 解诉求 ③ 防反弹",
    "组织管理": "【题型】组织管理\n【结构化思路】明确目标 → 制定方案 → 组织实施 → 总结反馈\n【核心要点】① 定方案 ② 抓执行 ③ 留台账",
    "自我认知与职位匹配": "【题型】自我认知与职位匹配\n【结构化思路】自我画像 → 岗位匹配 → 短板改进 → 职业承诺\n【核心要点】① 我是谁 ② 为何适配 ③ 如何成长",
    "人际沟通": "【题型】人际沟通\n【结构化思路】换位思考 → 主动沟通 → 求同解异 → 长效机制\n【核心要点】① 换立场 ② 主动沟通 ③ 求共赢",
    "现场模拟": "【题型】现场模拟\n【结构化思路】进入角色亮身份 → 先共情稳情绪 → 释理说服给方案 → 收尾确认促行动\n【核心要点】① 入角色说人话 ② 先共情后讲理 ③ 给出可行出路",
}

# ---- 按 sz/station-data.js 中 DATA_INTERVIEW 的下标指定新题型 ----
RECLASS = {
    # 题干明确要求"现场模拟"→ 现场模拟（原标应急应变）
    8: "现场模拟", 68: "现场模拟", 90: "现场模拟", 94: "现场模拟",
    114: "现场模拟", 132: "现场模拟",
    # "领导安排你组织/筹办/策划活动" → 组织管理（原标人际沟通）
    41: "组织管理", 43: "组织管理", 46: "组织管理", 74: "组织管理", 92: "组织管理",
    # "对此你怎么看"态度评价题 → 综合分析（原标组织管理）
    7: "综合分析", 17: "综合分析", 19: "综合分析", 29: "综合分析", 31: "综合分析",
    45: "综合分析", 51: "综合分析", 55: "综合分析", 57: "综合分析", 89: "综合分析",
    122: "综合分析",
    # 态度评价题 → 综合分析（原标应急应变/自我认知/人际沟通）
    4: "综合分析", 69: "综合分析", 96: "综合分析", 1: "综合分析",
    # 现场突发处置 → 应急应变（原标综合分析）
    11: "应急应变", 110: "应急应变",
    # 开导情绪低落同事 → 人际沟通（原标自我认知）
    135: "人际沟通",
}

BASE = "C:/Users/小样儿/Desktop/产品交付/辅警GITHUB"

def load_interview(path):
    s = open(path, encoding="utf-8").read()
    m = re.search(r"window\.DATA_INTERVIEW\s*=\s*(\[.*?\]);", s, re.S)
    if not m:
        return s, None, None
    return s, m, json.loads(m.group(1))

# 1) 从 sz 建立 题干→新题型 映射
s_sz, m_sz, data_sz = load_interview(f"{BASE}/sz/station-data.js")
title_map = {}
for idx, newtype in RECLASS.items():
    title_map[data_sz[idx]["title"]] = newtype

# 2) 应用到 4 份文件
targets = [f"{BASE}/{p}/station-data.js" for p in ("sz", "ms", "src/sz", "src/ms")]
for path in targets:
    try:
        s, m, data = load_interview(path)
    except FileNotFoundError:
        print(f"跳过（不存在）: {path}"); continue
    if data is None:
        print(f"跳过（无DATA_INTERVIEW）: {path}"); continue
    changed = 0
    for q in data:
        nt = title_map.get(q.get("title"))
        if nt and q.get("type") != nt:
            q["type"] = nt
            q["framework"] = FRAMEWORKS[nt]
            changed += 1
    new_arr = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    s2 = s[:m.start(1)] + new_arr + s[m.end(1):]
    open(path, "w", encoding="utf-8").write(s2)
    from collections import Counter
    c = Counter(q["type"] for q in data)
    print(f"{path}: 修正{changed}题 | 分布: " + ", ".join(f"{k}{v}" for k, v in c.most_common()))

print("done")
