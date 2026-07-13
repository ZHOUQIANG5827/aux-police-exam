#!/usr/bin/env python3
# build_city.py — 通用模板构建器（真题优先 · 机考/非机考通用）
#
# 把 skill 模板 viewer.html + 城市 config.js + 真题数据(json)
# 生成一个【自包含、可双击离线】的 index.html。
#
# 用法:
#   python build_city.py <viewer.html> <config.js> <written.json> <interview.json> <out.html> [year]
#
# 设计原则（铁律）:
#   1. 数据即真题: written/interview json 必须全部为真实考试真题。
#   2. 模板通用: 城市差异只通过 config.js 表达（cityName/examType/examYear/modules）。
#   3. 自包含: 数据与配置内联进单文件，双击即用，无需服务器。
import json, sys, os, re

MANAGE = "C:/Users/小样儿/.workbuddy/binaries/python/envs/default"
if os.path.isdir(MANAGE):
    os.environ["VIRTUAL_ENV"] = MANAGE

def load_config(cfg_path):
    with open(cfg_path, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"window\.SITE_CONFIG\s*=\s*(\{.*\})\s*;?\s*$", src, re.S)
    if not m:
        m = re.search(r"window\.SITE_CONFIG\s*=\s*(\{.*\})", src, re.S)
    if not m:
        raise SystemExit("无法从 config 解析 SITE_CONFIG: " + cfg_path)
    return json.loads(m.group(1))

def main():
    if len(sys.argv) < 6:
        raise SystemExit("用法: build_city.py <viewer.html> <config.js> <written.json> <interview.json> <out.html> [year]")
    tpl, cfg_js, written_json, interview_json, out_html = sys.argv[1:6]
    year_arg = sys.argv[6] if len(sys.argv) > 6 else ""

    with open(tpl, encoding="utf-8") as f:
        tpl_text = f.read()

    cfg = load_config(cfg_js)
    # 注入新字段（铁律 + 机考/非机考通用）
    cfg.setdefault("examType", "paper")
    cfg.setdefault("realQuestions", True)
    cfg.setdefault("realQuestionsNote", "本站题目全部为真实考试真题，无拼凑与洗白内容。")
    cfg.setdefault("modules", {"mockExam": True, "targeted": True, "random": True, "written": True, "interview": True})
    if year_arg:
        cfg["examYear"] = year_arg

    def load_data(p):
        if p and os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        return []

    written = load_data(written_json)
    interview = load_data(interview_json)

    # 安全转义：把会触发 HTML 标签解析的 < > 转成 \u003c \u003e，
    # 避免真题文本里的 <script>/<b> 等提前闭合脚本块。保持合法 JSON/JS。
    def esc(s):
        return s.replace("<", "\\u003c").replace(">", "\\u003e")

    cfg_js_str = esc(json.dumps(cfg, ensure_ascii=False))
    written_js_str = esc(json.dumps(written, ensure_ascii=False))
    interview_js_str = esc(json.dumps(interview, ensure_ascii=False))

    # 注意：注入点 marker 位于引擎 <script> 内部，因此这里只放纯 JS 赋值语句，
    # 不能套 <script> 标签（否则内层 </script> 会提前闭合引擎脚本）。
    inject = (
        'window.SITE_CONFIG = ' + cfg_js_str + ';\n'
        'window.DATA_WRITTEN = ' + written_js_str + ';\n'
        'window.DATA_INTERVIEW = ' + interview_js_str + ';\n'
    )

    marker = "var CONFIG = window.SITE_CONFIG"
    idx = tpl_text.find(marker)
    if idx == -1:
        raise SystemExit("模板中找不到注入点: " + marker)
    html = tpl_text[:idx] + inject + tpl_text[idx:]

    title = cfg.get("siteTitle") or "辅警真题卡组"
    html = re.sub(r"<title>.*?</title>", "<title>" + title + "</title>", html, count=1)

    os.makedirs(os.path.dirname(out_html) or ".", exist_ok=True)
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html)

    size_mb = os.path.getsize(out_html) / 1024 / 1024
    print("✅ 生成完成: %s" % out_html)
    print("   笔试真题 %d 道 | 面试真题 %d 道 | 文件 %.2f MB" % (len(written), len(interview), size_mb))

if __name__ == "__main__":
    main()
