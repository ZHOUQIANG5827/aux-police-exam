# RCJ 辅警题库 · 多城市刷题平台

RCJ9527 辅警考试真题刷题站合集：**城市专属官方真题**，笔试 + 面试，套题模考 + 定向刷题 + 随机抽题点击即判。纯静态站点，Cloudflare Pages 托管，零运行时依赖。

> 线上：<https://fj.rcj9527.dpdns.org>（门户）｜完整版 / 答疑：闲鱼 **RCJ9527**

## 架构（公共模板 + 每站数据）

三站（深圳 / 惠州 / 广东）**复用同一套逻辑与样式**，只差数据。改一处逻辑，三站同时生效。

```
fujing-mianshi/
├── index.html              # 门户首页（城市导航），不改动
├── sz/  hz/  gd/           # 三个城市站（每个目录一个生成的 index.html）
│   └── index.html          # ⚠️ 由模板生成，勿手改；改 src/<city>/station-data.js 后重新 build
├── shared/                 # ★ 三站共用的逻辑与样式（改这里 = 改全部站）
│   ├── app.css             # 全部样式
│   └── app.js              # 全部交互逻辑（笔试判分 / 套题模考 / 面试 / 录音…）
├── src/                    # ★ 每站专属「数据 + 配置」源（你平时只改这里）
│   ├── template.html       # 公共骨架（含占位符，勿手改）
│   └── <city>/
│       └── station-data.js # 该站 SITE_CONFIG + DATA_WRITTEN + DATA_INTERVIEW
├── build/                  # 构建 / 校验脚本
│   ├── assemble.py         # 由 src/template.html + src/<city>/station-data.js 生成 <city>/index.html
│   ├── sync_station.py     # 把数据源(数据JSON→data-*.js + config.js)同步进 src/<city>/station-data.js 并 assemble
│   ├── serve.py            # 一键本地预览
│   ├── test_full.js        # jsdom 三站行为校验（重构后回归用）
│   └── fill_explanations.py# 用 LLM 批量补「解析」(内容工具，可选)
├── _headers  _redirects  wrangler.jsonc   # Cloudflare Pages 配置
└── sz/build_data.py        # 由 JSON 源生成 data-*.js（深圳自动构建用）
```

> 历史迁移脚本 `build/_extract.py` 为**一次性**抽取工具，重构完成后无需再运行（重跑需原始单文件 index.html）。

## 快速开始

**本地预览**（仓库根即站点根，对应线上目录结构）：

```bash
python build/serve.py            # 默认 http://127.0.0.1:8000
python build/serve.py 8080       # 自定义端口
```

打开：门户 `http://127.0.0.1:8000/` ｜ 深圳 `/sz/` ｜ 惠州 `/hz/` ｜ 广东 `/gd/`

## 日常修改（最重要）

### 场景 A：只改某站的题目 / 配置

直接编辑 `src/<city>/station-data.js`（三段赋值：`window.SITE_CONFIG` / `window.DATA_WRITTEN` / `window.DATA_INTERVIEW`），然后重新生成：

```bash
python build/assemble.py sz      # 仅重建深圳
python build/assemble.py         # 重建全部三站
```

### 场景 B：从 JSON 源更新深圳数据（走自动构建同一链路）

编辑 `sz/data-written.json` / `sz/data-interview.json` / `sz/template-config.json` 后：

```bash
python build/sync_station.py sz  # 生成 data-*.js + 重建 src/sz/station-data.js + sz/index.html
```

> 推送到 `main` 会触发 GitHub Actions `auto-build`：自动跑上面同款流程并提交，Cloudflare 重新部署。

### 场景 C：给某站批量补「解析」

```bash
python build/fill_explanations.py --input hz/data-written.json --api-key sk-xxxx \
    --base-url https://api.deepseek.com/v1 --model deepseek-chat
python build/sync_station.py hz   # 补完后再重建
```

## 新增一个城市站

1. 复制 `src/sz/station-data.js` → `src/<city>/station-data.js`，替换为该城市数据。
2. 在 `build/_titles.json` 增加 `"<city>": "标题"`（决定 `<title>`）。
3. `python build/assemble.py <city>` → 生成 `<city>/index.html`。
4. （可选）在根 `index.html` 门户加一个入口卡片。

## 校验（重构 / 大改后）

需要 Node（jsdom 装在 `~/.workbuddy/binaries/node/workspace`）：

```bash
NODE_PATH=<node workspace>/node_modules node build/test_full.js
```

逐站检查：数据载入、`_idx` 补全、笔试卡片渲染、选项高亮、提交后显示答案、套题模考（批次下拉 + 两种出卷方式 + 无 60 分钟计时）、面试模块、无 JS 运行时错误。

## 城市站点

| 城市 | 路径 | 笔试 | 面试 | 状态 |
| --- | --- | --- | --- | --- |
| 深圳 | `/sz/` | 900 题 | 138 题 | ✅ |
| 惠州 | `/hz/` | 2136 题 | —（原站即无，与原始一致） | ✅ |
| 广东 | `/gd/` | 2136 题 | —（同上） | ✅ |

> 定位：**只做有真实官方题库的城市**，各城市考纲不同，不做「省标通用」套壳，杜绝虚假宣传。
> 面试(结构化)跨省通用度远高于笔试，是最适合母库复用的部分；如需给 hz/gd 补面试，直接把深圳的 `DATA_INTERVIEW` 复制进去即可。

## 功能特性

- **套题模考**（最醒目主按钮）：两种出卷方式——① 按套题批次刷整套真题；② 自定义随机卷（按题型数量）。全程**无时间限制**。
- **定向刷题**：按批次 / 题型筛选，点击即判（单选 / 判断点选项即判，多选提交后判），答案用高亮块展示。
- **随机抽题 / 只看未掌握 / 全屏刷题 / 进度**等。
- **面试模块**（深圳）：结构化真题按板块刷 + 录音演练 + 语音转文字预览。
- **判断题**：统一显示为 **A. 正确 / B. 错误**，答案区明确「正确 / 错误」。

## 部署

Cloudflare Pages 连接本仓库，`git push` 到 `main` 自动部署（`assets.directory: "."`，整仓即站点）。
详细 runbook 见 `DEPLOY-STEPS.md`；新城市上线模板见 `DEPLOY-HUIZHOU.md`。
