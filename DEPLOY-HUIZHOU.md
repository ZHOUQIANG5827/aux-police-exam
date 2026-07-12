# 辅警刷题站 · 多城市部署通用指南（一仓库 · 多站点）

本仓库 `fujing-mianshi` 统一存放所有辅警系列刷题站。**一个 GitHub 仓库 + 每个城市一个子目录 + 每个城市一个独立 Cloudflare Pages 项目 + 一个独立子域名**，互不影响、可自动部署。

## 已规划城市

| 城市 | 子目录 | Pages 项目名 | 子域名 | 状态 |
|---|---|---|---|---|
| 深圳（根） | 仓库根目录 `.` | `fujing-mianshi` | （现有面试/笔试站） | 已上线 |
| 惠州 | `hzfj/` | `rcj-hzfj` | `hzfj.rcj9527.dpdns.org` | 已建目录，待部署 |
| 武汉 | `whfj/` | `rcj-whfj` | `whfj.rcj9527.dpdns.org` | 待建 |
| 成都 | `cdfj/` | `rcj-cdfj` | `cdfj.rcj9527.dpdns.org` | 待建 |

> 子目录命名约定：城市拼音首字母 + `fj`（辅警），如 `hzfj`=惠州、`whfj`=武汉、`cdfj`=成都。
> Pages 项目命名约定：`rcj-` + 子目录名。域名：`子目录名.rcj9527.dpdns.org`。

---

## 站点目录规范（每个城市子目录里放这些）

```
<hzfj等城市代码>/
├── index.html   # 自包含单文件：数据/配置/图片全部内联，0 外部 script/src 引用
└── _headers     # HTML 5 分钟缓存 + 安全头（见下方模板）
```

`_headers` 模板（每个子目录放一份，文件名 `_headers`）：
```
/*
  Cache-Control: public, max-age=300
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
```

---

## 推荐部署方式：连接同一个 GitHub 仓库（push 自动上线）

**核心思路**：深圳站项目已连仓库、输出目录为根目录 `.`；每个新城市**也连同一个仓库**，但**构建输出目录设为该子目录**（如 `hzfj`），从而 push 自动重新部署、且互不干扰。

### 在 Cloudflare 控制台新建城市的 Pages 项目
1. **Workers 和 Pages → 创建 → Pages → 连接到 Git**。
2. 选择同一个仓库 **`ZHOUQIANG5827/fujing-mianshi`**。
3. 项目名填 `rcj-<城市代码>`（如 `rcj-hzfj`）。
4. 生产分支：`main`。
5. **构建命令：留空**（纯静态，无需构建）。
6. **构建输出目录：填该城市的子目录名**（如 `hzfj`）。← 与深圳站隔离的关键。
7. 创建完成后 → **设置 → 自定义域** → 添加 `子目录名.rcj9527.dpdns.org`。
8. Cloudflare 会给出目标 DNS；到 dpdns 后台加一条 **CNAME**：
   - 主机名：`hzfj`（即子目录名）
   - 指向：CF 提示的 `rcj-hzfj.pages.dev`（或 `*.cfargotunnel.com` 地址）
9. 等证书签发（几分钟），状态变绿即可访问。

### 之后怎么更新
直接改对应子目录的 `index.html` → `git push` → Cloudflare 自动重新部署，网页立刻更新。
> 每次 push 会触发仓库里所有关联项目重建，但各自只发布自己的子目录，深圳站内容不受影响。

---

## 备选方式：Direct Upload（不连 Git，手动上传）

若不想连 Git，可对每个城市用 **Direct Upload** 单独上传子目录文件夹（同样新建独立项目、绑独立域名）：
```bash
# 方式 A：控制台把 hzfj/ 文件夹拖进「直接上传」项目 rcj-hzfj
# 方式 B：命令行
npx wrangler pages deploy hzfj --project-name rcj-hzfj --branch main
```
缺点：每次更新需手动重新上传一次子目录，不会随 push 自动变。

---

## DNS 说明（dpdns）
- 若 `rcj9527.dpdns.org` 父域解析在 Cloudflare：直接在 CF 里加子域即可，自动写 DNS。
- 若在 dpdns 动态域名后台：加一条 CNAME `子目录名 → <项目>.pages.dev`（以 CF 自定义域页面展示的目标为准）。
- Cloudflare 会为目标子域名自动签发 SSL 证书。

## 验证
```bash
curl -I https://hzfj.rcj9527.dpdns.org
# 期望：HTTP/2 200，content-type: text/html
```

---

## 新增一个城市站 · 操作清单
1. 在 `fujing-mianshi/` 下新建 `<城市代码>/` 目录，放入自包含 `index.html` + `_headers`。
2. （本地）`git add <城市代码> && git commit && git push`。
3. Cloudflare 新建 Pages 项目 `rcj-<城市代码>`，连同一个仓库，输出目录填 `<城市代码>`。
4. 绑自定义域 `<城市代码>.rcj9527.dpdns.org`，加 CNAME。
5. 访问验证。
