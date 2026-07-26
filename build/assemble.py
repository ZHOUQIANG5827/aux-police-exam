#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
assemble.py —— 由公共模板生成各城市 index.html。

源（唯一事实来源）:
  src/template.html          公共骨架（head + body + 占位符 + 引用 ../shared/app.css|app.js）
  src/<city>/station-data.js 每站专属 SITE_CONFIG + DATA_WRITTEN + DATA_INTERVIEW（逐字保留）
  shared/app.css             公共样式
  shared/app.js              公共逻辑（取自 sz，最完整）

产物（提交进仓库、由 Cloudflare 部署）:
  <city>/index.html

用法:
  python build/assemble.py            # 生成全部三站
  python build/assemble.py sz         # 仅生成深圳站
"""
import os, sys, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CITIES = ["sz", "hz", "gd", "ms", "cd"]
TPL = os.path.join(ROOT, "src/template.html")
BRAND_TITLE = "RCJ Exam Template"

VARS = ["SITE_CONFIG", "DATA_WRITTEN", "DATA_INTERVIEW"]

def get_asset_version():
    """取当前 git commit short hash 作为 CSS/JS 版本号，强制浏览器刷新缓存。"""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT, stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
    except Exception:
        return "1"

def compress_station_data(js_text):
    """压缩 station-data.js 中的 JSON 数据块，去掉空白与换行，减小传输体积。"""
    pos = 0
    parts = []
    for var in VARS:
        marker = f"window.{var} = "
        start = js_text.find(marker, pos)
        if start == -1:
            continue
        next_window = js_text.find("window.", start + len(marker))
        end = next_window if next_window != -1 else len(js_text)
        rhs = js_text[start + len(marker):end].strip()
        if rhs.endswith(";"):
            rhs = rhs[:-1].strip()
        try:
            data = json.loads(rhs)
            compressed = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        except Exception as e:
            print(f"  [warn] {var} 压缩失败，保留原样: {e}")
            compressed = rhs
        parts.append(js_text[pos:start] + f"window.{var}={compressed};")
        pos = end
    parts.append(js_text[pos:])
    return "".join(parts)

def main():
    tpl = open(TPL, encoding="utf-8").read()
    ver = get_asset_version()
    # 给公共 CSS/JS 加版本号，避免用户浏览器长期缓存旧资源
    tpl = (tpl
           .replace('href="../shared/app.css"', f'href="../shared/app.css?v={ver}"')
           .replace('src="../shared/app.js"', f'src="../shared/app.js?v={ver}"'))
    targets = sys.argv[1:] or CITIES
    for c in targets:
        data_path = os.path.join(ROOT, "src", c, "station-data.js")
        if not os.path.exists(data_path):
            print(f"[skip] {c}: 缺少 {data_path}")
            continue
        data = open(data_path, encoding="utf-8").read().strip()
        data = compress_station_data(data)
        title = BRAND_TITLE
        # 数据外置：HTML 仅引用 station-data.js，避免 1.5MB 内联拖慢首屏（配合 _headers 长缓存）
        data_out = os.path.join(ROOT, c, "station-data.js")
        open(data_out, "w", encoding="utf-8").write(data)
        out = (tpl
               .replace("<!--SITE_TITLE-->", title)
               .replace("<!--STATION_DATA-->",
                        '<script src="station-data.js"></script>'))
        out_path = os.path.join(ROOT, c, "index.html")
        open(out_path, "w", encoding="utf-8").write(out)
        print(f"[ok] 生成 {c}/index.html  ({len(out)} 字节) + 外置 {c}/station-data.js ({len(data)} 字节)")
    print("[done]")

if __name__ == "__main__":
    main()
