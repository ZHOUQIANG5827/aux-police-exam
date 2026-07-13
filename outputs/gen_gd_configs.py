import os, json
base = r"C:\Users\小样儿\Desktop\产品交付\fujing-mianshi"
cities = [
    ("dg", "东莞辅警真题卡组", "🚓"),
    ("fs", "佛山辅警真题卡组", "🚔"),
    ("zh", "珠海辅警真题卡组", "⚓"),
]
shared = {
    "logo": "", "cover": "", "themeColor": "#1e3a5f", "contact": "",
    "xianyuCode": "RCJ9527", "promoTitle": "", "promoText": "",
    "rewardImage": "", "rewardTitle": "打赏作者 · 支持开源",
    "rewardDesc": "如果这个开源题库对你有帮助，请作者喝杯奶茶 ☕",
    "footerText": "© 辅警真题卡组 · 开源离线版",
    "timerSeconds": 180,
    "enabledModules": {"promo": False, "xianyu": False, "reward": False, "progress": True, "themeToggle": True, "record": False},
    "defaultPage": "written",
    "examType": "paper",
    "examYear": "2024-2026",
    "realQuestions": True,
    "realQuestionsNote": "广东省公安机关警务辅助人员招聘考试通用真题（与惠州等广东城市同源省标），适用于东莞/佛山/珠海等广东多城，无拼凑与洗白。",
    "modules": {"mockExam": False, "targeted": True, "random": True, "written": True, "interview": False},
}
for code, title, emoji in cities:
    cfg = dict(shared)
    cfg["siteTitle"] = title
    cfg["siteEmoji"] = emoji
    cfg["subtitle"] = "笔试 2136 题 · 广东省标通用真题"
    d = os.path.join(base, code)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "config.js"), "w", encoding="utf-8") as f:
        f.write("window.SITE_CONFIG = ")
        json.dump(cfg, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print("wrote", os.path.join(d, "config.js"))
