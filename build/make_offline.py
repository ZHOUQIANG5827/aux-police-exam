#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把某个城市站生成【完全自包含】的单文件离线 HTML（CSS/JS/数据全部内联），
不依赖 shared/ 目录，双击即可在浏览器打开，方便发给别人或随身 U 盘携带。

用法：
  python build/make_offline.py sz
  python build/make_offline.py hz "D:/out/惠州辅警刷题-离线版.html"

参数：
  city   : 城市代码，默认 sz（可选 sz/hz/gd）
  out    : 输出文件路径，默认当前目录下 <city>-offline.html
"""
import sys
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    city = sys.argv[1] if len(sys.argv) > 1 else "sz"
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.getcwd(), f"{city}-offline.html")

    html_path = os.path.join(ROOT, city, "index.html")
    css_path = os.path.join(ROOT, "shared", "app.css")
    js_path = os.path.join(ROOT, "shared", "app.js")

    for p in (html_path, css_path, js_path):
        if not os.path.exists(p):
            sys.exit(f"❌ 找不到文件: {p}")

    html = open(html_path, encoding="utf-8").read()
    css = open(css_path, encoding="utf-8").read()
    js = open(js_path, encoding="utf-8").read()

    # 0) 内联城市数据脚本 station-data.js（含 SITE_CONFIG / DATA_WRITTEN / DATA_INTERVIEW）。
    #    离线版必须把数据打进单文件，否则 file:// 打开时加载不到、变成空题壳。
    station_data_path = os.path.join(ROOT, city, "station-data.js")
    if os.path.exists(station_data_path):
        station_data_js = open(station_data_path, encoding="utf-8").read()
    else:
        station_data_js = None
        print(f"⚠️ 警告：找不到 {city}/station-data.js，题库数据将缺失，离线版会是空壳！")

    # 1) 内联 CSS（替换外链 link 标签）
    html = html.replace(
        '<link rel="stylesheet" href="../shared/app.css">',
        f"<style>\n{css}\n</style>",
    )

    # 2) 内联 JS（正则替换 script src 标签，内容本身是安全的：不含 </script 字面量）
    html = re.sub(
        r'<script src="\.\./shared/app\.js"></script>',
        lambda m: f"<script>\n{js}\n</script>",
        html,
    )

    # 2.5) 内联 lamejs（MP3 录音编码器，仅当模板引用时）
    lame_path = os.path.join(ROOT, "shared", "lame.min.js")
    if os.path.exists(lame_path):
        lame_js = open(lame_path, encoding="utf-8").read()
        html = re.sub(
            r'<script src="\.\./shared/lame\.min\.js"></script>',
            lambda m: f"<script>\n{lame_js}\n</script>",
            html,
        )
    else:
        print("⚠️ 警告：找不到 shared/lame.min.js，MP3 录音将不可用。")

    # 2.5b) 内联城市数据脚本 station-data.js（必须放在 app.js 之前执行）
    if station_data_js is not None:
        # 防御：题库文本理论上不含 </script，仍做转义避免提前闭合 script 标签
        station_data_js_safe = (
            station_data_js.replace("</script", "<\\/script")
                           .replace("</SCRIPT", "<\\/SCRIPT")
        )
        html = re.sub(
            r'<script src="station-data\.js"></script>',
            lambda m: f"<script>\n{station_data_js_safe}\n</script>",
            html,
        )
    else:
        print("⚠️ 警告：未内联 station-data.js，离线版将无题库数据。")

    # 3) 健全性检查：不应再残留 external 引用
    leftover = ("../shared/" in html) or ('src="station-data.js"' in html)
    if leftover:
        print("⚠️ 警告：生成的文件里仍有外链未完全内联，请检查。")

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)

    print(f"✅ 已生成离线版: {out}")
    print(f"   大小: {os.path.getsize(out):,} 字节")
    print(f"   内联校验: 含DATA_WRITTEN={'window.DATA_WRITTEN' in html}  "
          f"含SITE_CONFIG={'window.SITE_CONFIG' in html}  "
          f"含app.js={'render(' in html}  "
          f"仍含外链={leftover}")


if __name__ == "__main__":
    main()
