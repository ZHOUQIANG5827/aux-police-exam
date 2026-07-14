#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
serve.py —— 一键本地预览（仓库根目录即站点根，对应 Cloudflare 部署结构）。

用法：
  python build/serve.py            # 默认 http://127.0.0.1:8000
  python build/serve.py 8080       # 指定端口

预览地址：
  门户首页      http://127.0.0.1:8000/
  深圳站        http://127.0.0.1:8000/sz/
  惠州站        http://127.0.0.1:8000/hz/
  广东站        http://127.0.0.1:8000/gd/

说明：站点为纯静态文件，http.server 即可完整预览；
共享的 shared/app.css|app.js 通过 ../shared/ 引用，根目录起服务时路径正确。
"""
import os, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
HOST = "127.0.0.1"


def main():
    os.chdir(ROOT)
    print("=" * 56)
    print("  RCJ 辅警刷题站 · 本地预览")
    print("  根目录: %s" % ROOT)
    print("  门户:    http://%s:%d/" % (HOST, PORT))
    print("  深圳:    http://%s:%d/sz/" % (HOST, PORT))
    print("  惠州:    http://%s:%d/hz/" % (HOST, PORT))
    print("  广东:    http://%s:%d/gd/" % (HOST, PORT))
    print("  按 Ctrl+C 停止")
    print("=" * 56)
    # 用 python 内置 http.server，零依赖
    subprocess.run([sys.executable, "-m", "http.server", str(PORT),
                    "--bind", HOST], cwd=ROOT)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n已停止预览。")
