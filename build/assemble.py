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
import os, sys, json, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CITIES = ["sz", "hz", "gd", "ms", "cd"]
TPL = os.path.join(ROOT, "src/template.html")
BRAND_TITLE = "RCJ Exam Template"

def main():
    tpl = open(TPL, encoding="utf-8").read()
    targets = sys.argv[1:] or CITIES
    for c in targets:
        data_path = os.path.join(ROOT, "src", c, "station-data.js")
        if not os.path.exists(data_path):
            print(f"[skip] {c}: 缺少 {data_path}")
            continue
        data = open(data_path, encoding="utf-8").read().strip()
        title = BRAND_TITLE
        out = (tpl
               .replace("<!--SITE_TITLE-->", title)
               .replace("<!--STATION_DATA-->",
                        "<script>\n" + data + "\n</script>"))
        out_path = os.path.join(ROOT, c, "index.html")
        open(out_path, "w", encoding="utf-8").write(out)
        print(f"[ok] 生成 {c}/index.html  ({len(out)} 字节)")
    print("[done]")

if __name__ == "__main__":
    main()
