#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一次性抽取脚本：把三站重复的 CSS / JS 逻辑抽成公共模板。
源（只读，取自 git HEAD，稳定且不会被 assemble 覆盖）：
  sz/index.html   规范来源（最完整：含 _idx 修复、批次模考、无 60 分钟计时）
产物：
  shared/app.css         合并 sz 的全部 <style> 块
  shared/app.js          sz 的 <script> 逻辑部分（剔除 config+data 赋值）
  src/template.html      公共骨架（head+body+占位符 + 引用 ../shared/app.css|app.js）
  src/<city>/station-data.js  每站 SITE_CONFIG + DATA_WRITTEN + DATA_INTERVIEW（逐字保留）
  build/_titles.json     每站 <title>
之后由 assemble.py 生成各站 index.html。
"""
import re, os, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CITIES = ["sz", "hz", "gd"]

def git_show(path):
    return subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT).decode("utf-8")

# ---------- 字符串感知括号匹配 ----------
def _find_matching(block, open_idx):
    assert block[open_idx] in "[{"
    depth = 0; in_str = False; esc = False; i = open_idx
    while i < len(block):
        ch = block[i]
        if in_str:
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == '"': in_str = False
        else:
            if ch == '"': in_str = True
            elif ch in "[{": depth += 1
            elif ch in "]}":
                depth -= 1
                if depth == 0: return i
        i += 1
    return -1

def extract_assignment(block, marker):
    """marker 须以 [ 或 { 结尾（如 'window.DATA_WRITTEN = ['），避免误匹配 normBool 行。"""
    start = block.find(marker)
    if start == -1:
        return block, None
    open_idx = start + len(marker) - 1
    close_idx = _find_matching(block, open_idx)
    if close_idx == -1:
        return block, None
    semi = block.index(";", close_idx)
    stmt = block[start:semi + 1]
    rest = block[:start].rstrip() + "\n" + block[semi + 1:].lstrip()
    return rest, stmt

# ---------- 1. 合并全部 <style> -> shared/app.css ----------
sz_html = git_show("sz/index.html")
styles = re.findall(r"<style>(.*?)</style>", sz_html, re.DOTALL)
app_css = "\n\n/* ===== merged from %d <style> blocks (extracted from sz) ===== */\n\n" % len(styles)
app_css = app_css.join(styles)
open(os.path.join(ROOT, "shared/app.css"), "w", encoding="utf-8").write(app_css.strip() + "\n")
print("[ok] shared/app.css  (合并 %d 个 style 块, %d 字符)" % (len(styles), len(app_css)))
app_css = None  # free

# ---------- 2. 提取共享 JS 逻辑（sz） ----------
scripts = re.findall(r"<script>(.*?)</script>", sz_html, re.DOTALL)
big = max(scripts, key=len)
logic, _ = extract_assignment(big, "window.SITE_CONFIG = {")
logic, written = extract_assignment(logic, "window.DATA_WRITTEN = [")
logic, interview = extract_assignment(logic, "window.DATA_INTERVIEW = [")
logic = logic.strip() + "\n"
open(os.path.join(ROOT, "shared/app.js"), "w", encoding="utf-8").write(logic)
print("[ok] shared/app.js  (逻辑 %d 行)" % len(logic.splitlines()))

# ---------- 3. 构建公共模板 ----------
tpl = sz_html
# 3a. 删除全部 <style> 块
tpl = re.sub(r"<style>.*?</style>", "", tpl, flags=re.DOTALL)
# 3b. 在 </head> 前插入唯一 link
tpl = tpl.replace("</head>", '  <link rel="stylesheet" href="../shared/app.css">\n</head>', 1)
# 3c. 删除无效的外部 <script src="data-written.js"> 等（sz 有但 hz/gd 没有，且被内联覆盖）
tpl = re.sub(r'\s*<script src="data-written\.js"></script>', "", tpl)
tpl = re.sub(r'\s*<script src="data-interview\.js"></script>', "", tpl)
tpl = re.sub(r'\s*<script src="config\.js"></script>', "", tpl)
# 3d. 大内联 <script> 块 -> 占位符 + 共享 app.js
tpl = re.sub(r"<script>\n.*?\n</script>", "<!--STATION_DATA-->\n  <script src=\"../shared/app.js\"></script>", tpl, flags=re.DOTALL)
# 3e. <title> -> 占位符
tpl = re.sub(r"<title>.*?</title>", "<title><!--SITE_TITLE--></title>", tpl, flags=re.DOTALL)
open(os.path.join(ROOT, "src/template.html"), "w", encoding="utf-8").write(tpl)
print("[ok] src/template.html")

# ---------- 4. 每站抽取 station-data.js（逐字保留） ----------
meta = {}
for c in CITIES:
    html = git_show(f"{c}/index.html")
    blocks = re.findall(r"<script>(.*?)</script>", html, re.DOTALL)
    b = max(blocks, key=len)
    b, cfg = extract_assignment(b, "window.SITE_CONFIG = {")
    b, w = extract_assignment(b, "window.DATA_WRITTEN = [")
    b, iv = extract_assignment(b, "window.DATA_INTERVIEW = [")
    parts = [p for p in [cfg, w, iv] if p]
    out = "\n".join(parts) + "\n"
    open(os.path.join(ROOT, "src", c, "station-data.js"), "w", encoding="utf-8").write(out)
    tm = re.search(r"<title>(.*?)</title>", html, re.DOTALL)
    meta[c] = tm.group(1).strip() if tm else "辅警真题卡组"
    print("[ok] src/%s/station-data.js  (行数 %d, title=%r)" % (c, len(out.splitlines()), meta[c]))

with open(os.path.join(ROOT, "build/_titles.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)
print("[done] 抽取完成")
