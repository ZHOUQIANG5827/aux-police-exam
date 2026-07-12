# 辅警刷题站 · 部署指南（单仓库 · 单 Pages 项目 · 门户 + 城市子路径）

> 本仓库统一存放**所有辅警系列**刷题站。一个 GitHub 仓库 + 一个 Cloudflare Pages 项目 + 一个主域名 `fj.rcj9527.dpdns.org`，
> 各城市用**子路径**区分（`/sz` `/hz` `/dg` `/fs` `/zh`）。**不新建多个 Pages 项目、不新建多个 Workers**，深圳篇章也完全不受影响。

## 线上结构（最终形态）

| 路径 | 城市 | 内容 | 状态 |
|---|---|---|---|
| `fj.rcj9527.dpdns.org/` | 门户 | 根目录 `index.html` 城市导航首页 | 已上线 |
| `fj.rcj9527.dpdns.org/sz/` | 深圳 | 面试 + 笔试真题卡组 | 已上线（原根目录迁入） |
| `fj.rcj9527.dpdns.org/hz/` | 惠州 | 笔试 2136 题广东省标真题 | 已上线（原 `hzfj/` 改名） |
| `fj.rcj9527.dpdns.org/dg/` | 东莞 | 笔试 2136 题广东省标真题（母库复用） | 已上线 |
| `fj.rcj9527.dpdns.org/fs/` | 佛山 | 笔试 2136 题广东省标真题（母库复用） | 已上线 |
| `fj.rcj9527.dpdns.org/zh/` | 珠海 | 笔试 2136 题广东省标真题（母库复用） | 已上线 |

> **命名约定**：城市代码 = 城市拼音首字母（`sz` 深圳 / `hz` 惠州 / `dg` 东莞 / `fs` 佛山 / `zh` 珠海）。
> 消防系列走**另一个仓库**，同样结构 → `xf.rcj9527.dpdns.org/sz`（本文档只管辅警）。

---

## 仓库目录结构

```
fujing-mianshi/                ← 仓库根（= 门户 + 整个静态站）
├── index.html                 ← 门户导航首页（列出各城市）
├── _redirects                 ← 旧 szfj 域名 301 到 /sz（保留旧链接）
├── _headers                   ← 全站统一缓存/安全头（Cloudflare 只认根 _headers）
├── wrangler.jsonc             ← Pages 项目配置（name: rcj-fj, assets.directory: "."）
├── .github/workflows/auto-build.yml  ← 仅深圳(sz)改 JSON 源时自动重建 .js
├── sz/                        ← 深圳站（自含 config.js / data-*.js / *.png）
│   ├── index.html  written.html  config.js
│   ├── data-written.js  data-written.json
│   ├── data-interview.js  data-interview.json
│   ├── cover.png  wechat-reward.png
│   ├── VERSION.json  template-config.json  build_data.py
│   └── README.md  CHANGELOG.md
├── hz/                        ← 惠州站（自包含单文件，0 外部引用，= 广东省标母库）
│   └── index.html
├── dg/  fs/  zh/              ← 东莞/佛山/珠海站（均由 hz 母库"去惠州化+改品牌"生成，自包含单文件）
│   └── index.html
└── （新城市待建时按母库复用或官方题库方式新增子目录）
```
> ⚠️ Cloudflare Pages **只读取根目录的 `_headers` 和 `_redirects`**，子目录里的同名文件不生效，所以缓存/跳转统一在根配置。

---

## 部署步骤（一次性，在 Cloudflare 控制台）

1. **Workers 和 Pages → 创建 → Pages → 连接到 Git**。
2. 选择仓库（若你已把仓库改名为 `rcj-fj`，则选 `ZHOUQIANG5827/rcj-fj`；否则仍是 `ZHOUQIANG5827/fujing-mianshi`）。
3. 项目名：`rcj-fj`。
4. 生产分支：`main`。
5. **构建命令：留空**；**构建输出目录：填 `.`（点，发布整个仓库根）**。← 子路径分城市靠目录结构，不是靠输出目录。
6. 创建后 → **设置 → 自定义域** → 添加 `fj.rcj9527.dpdns.org`。
7. CF 给目标 DNS；到 **dpdns 后台**加一条 **CNAME**：
   - 主机名：`fj`
   - 指向：CF 提示的 `rcj-fj.pages.dev`（或 `*.cfargotunnel.com`）。
8. 等证书签发（几分钟）变绿 → 访问 `https://fj.rcj9527.dpdns.org/` 看到门户首页。

### 旧域名处理（可选，防闲鱼旧链接失效）
- 若保留 `szfj.rcj9527.dpdns.org`：在 Pages 自定义域再加它，仓库根 `_redirects` 会把 `szfj/*` → `fj.rcj9527.dpdns.org/sz/:splat`（301）。
- 若不保留：直接删掉 `_redirects` 里那一行，或改用 CF 控制台 Bulk Redirects。

---

## 之后怎么更新（核心优势）

- **改惠州**：编辑 `hz/index.html` → `git push` → 自动重新部署，整站（含门户、深圳）一起更新，但内容各自独立，**深圳篇章不受影响**。
- **改深圳**：改 `sz/data-*.json` 或 `sz/template-config.json` → `git push` → GitHub Actions 自动重建 `sz/*.js` 并 commit，再触发部署。
- **加新城市（母库复用）**：以 `hz/index.html`（广东省标母库·自包含）为模板，做"去惠州化 + 改品牌"生成 `<code>/index.html`（`code`=城市拼音首字母，如 `dg` 东莞），数据与功能不变；`git push` → 在门户首页 `index.html` 加一张卡片指向 `/<code>/` 即可。生成脚本见 `outputs/gen_city.py`（每次可批量跑多个城市）。
- **加新城市（官方题库）**：若要某城用真实官方题，把官方 Excel/文档给我，我按惠州方式解析生成该城 `index.html`，替换母库打底内容。

---

## 仓库改名（建议：不改）

> **建议保留 GitHub 仓库名 `fujing-mianshi`**：Cloudflare Pages 是用 Git 连接连的 `ZHOUQIANG5827/fujing-mianshi`，改名会**直接断开连接**，得重新授权连一遍（重选分支 main + 输出目录 `.`），且访问地址 `fj.rcj9527.dpdns.org/sz` 来自自定义域名，**与仓库名无关**。
> 目前仅把 Cloudflare 里的 **Pages 项目显示名**改成了 `rcj-fj`（在 `wrangler.jsonc` 的 `name` 字段），不影响部署。

若你坚持改名：
1. GitHub 仓库 Settings → 改名（如 `rcj-fj`）。
2. 改名后，**到 Cloudflare Pages 项目断开旧仓库连接、重新连接到新仓库名**（或更新项目源），否则 push 不再触发部署。
3. 本地 clone 的 remote URL 会失效，重连时更新：
   ```bash
   git remote set-url origin https://github.com/ZHOUQIANG5827/rcj-fj.git
   ```

---

## 验证
```bash
curl -I https://fj.rcj9527.dpdns.org/        # 门户 200 text/html
curl -I https://fj.rcj9527.dpdns.org/sz/      # 深圳 200
curl -I https://fj.rcj9527.dpdns.org/hz/      # 惠州 200
curl -I https://fj.rcj9527.dpdns.org/dg/      # 东莞 200
curl -I https://fj.rcj9527.dpdns.org/fs/      # 佛山 200
curl -I https://fj.rcj9527.dpdns.org/zh/      # 珠海 200
```
