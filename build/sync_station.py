#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_station.py —— 把「数据源」同步进公共模板，重建站点。

数据源（由 sz/build_data.py 从 JSON 生成，或手工维护）：
  <city>/data-written.js      window.DATA_WRITTEN = [...]
  <city>/data-interview.js    window.DATA_INTERVIEW = [...]
  <city>/config.js            window.SITE_CONFIG = {...}   （可选；缺则复用现有）

产物（公共模板架构）：
  src/<city>/station-data.js  上述三段拼接（唯一事实来源）
  <city>/index.html           由 build/assemble.py 从模板生成

数据优先级：<city>/data-*.js（若存在） > 现有 src/<city>/station-data.js 中的数据
SITE_CONFIG 优先级：<city>/config.js（若存在） > 现有 station-data.js 中的 SITE_CONFIG

用法：
  python build/sync_station.py sz     # 重建深圳（CI 自动构建后调用）
  python build/sync_station.py hz     # 手动重建惠州（需先有 hz/data-written.js 等）
  python build/sync_station.py        # 默认 sz
"""
import os, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------- 字符串感知括号匹配（与 _extract.py 同款，自包含避免互相 import 触发抽取） ----------
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
    """marker 须以 [ 或 { 结尾（如 'window.DATA_WRITTEN = ['）。返回 (rest, stmt)。"""
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


def read_text(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def ensure_semicolon(s):
    s = s.strip()
    return s if s.endswith(";") else s + ";"


def main():
    city = sys.argv[1] if len(sys.argv) > 1 else "sz"
    sd_path = os.path.join(ROOT, "src", city, "station-data.js")
    existing = read_text(sd_path) if os.path.exists(sd_path) else ""

    # --- SITE_CONFIG ---
    cfg_js = os.path.join(ROOT, city, "config.js")
    if os.path.exists(cfg_js):
        cfg = ensure_semicolon(read_text(cfg_js))
    else:
        _, c = extract_assignment(existing, "window.SITE_CONFIG = {")
        cfg = c if c else "window.SITE_CONFIG = {};"

    # --- DATA_WRITTEN ---
    w_js = os.path.join(ROOT, city, "data-written.js")
    if os.path.exists(w_js):
        written = ensure_semicolon(read_text(w_js))
    else:
        _, w = extract_assignment(existing, "window.DATA_WRITTEN = [")
        written = w if w else "window.DATA_WRITTEN = [];"

    # --- DATA_INTERVIEW ---
    i_js = os.path.join(ROOT, city, "data-interview.js")
    if os.path.exists(i_js):
        interview = ensure_semicolon(read_text(i_js))
    else:
        _, iv = extract_assignment(existing, "window.DATA_INTERVIEW = [")
        interview = iv if iv else "window.DATA_INTERVIEW = [];"

    out = cfg + "\n" + written + "\n" + interview + "\n"
    os.makedirs(os.path.dirname(sd_path), exist_ok=True)
    with open(sd_path, "w", encoding="utf-8") as f:
        f.write(out)
    print("[ok] src/%s/station-data.js 已同步 (%d 字节)" % (city, len(out)))

    # --- assemble index.html ---
    subprocess.run([sys.executable, os.path.join(ROOT, "build", "assemble.py"), city], check=True)


if __name__ == "__main__":
    main()
