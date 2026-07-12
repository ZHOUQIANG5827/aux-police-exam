# 惠州辅警笔试站 · 部署到 hzfj.rcj9527.dpdns.org

目标：把惠州辅警笔试刷题站（单文件离线版）上线到独立子域名 `hzfj.rcj9527.dpdns.org`，
**复用本仓库（fujing-mianshi），但不影响现有面试站/笔试站的部署**。

## 目录说明
- `huizhou.html`：仓库根目录的惠州站单文件（与 `hzfj/index.html` 内容一致）。
- `hzfj/index.html`：部署用自包含入口（图片/数据/脚本全部内联，双击即开，无外部依赖）。
- 本题库为纯静态单页，**不需要构建步骤**，直接作为静态站点上传即可。

## 方案
新建一个独立的 Cloudflare Pages 项目 `rcj-hzfj`，用 **Direct Upload** 上传本仓库的 `hzfj/` 目录，
再绑定自定义域名 `hzfj.rcj9527.dpdns.org`。
（不动现有的 fujing-mianshi Pages 项目，因此现有面试站/笔试站部署完全不受影响。）

---

## 方式 A：Cloudflare 控制台上传（最简单，推荐）
1. 登录 Cloudflare 控制台 → 左侧 **Workers 和 Pages** → **创建** → 选 **Pages** → **直接上传(Direct Upload)**。
2. 项目名称填 `rcj-hzfj`，把本仓库里的 `hzfj/` 整个文件夹拖进去上传（确保文件夹内有 `index.html`）。
3. 上传完成后会得到 `rcj-hzfj.pages.dev`，先访问确认站点正常。
4. 进入该项目 → **设置 → 自定义域** → 添加 `hzfj.rcj9527.dpdns.org`。
5. Cloudflare 会给出需要的 DNS 记录（通常是 CNAME 指向 `<项目>.pages.dev` 或一个 `*.cfargotunnel.com` 地址）。
6. 到你的 dpdns 解析后台，添加一条 **CNAME** 记录：
   - 主机名：`hzfj`
   - 指向：`rcj-hzfj.pages.dev`（或 CF 提示的目标地址）
7. 回到 CF 等待证书签发（通常几分钟），状态变绿后即可访问 `https://hzfj.rcj9527.dpdns.org`。

## 方式 B：用 Wrangler CLI 上传（一行命令）
```bash
# 需先登录：wrangler login
wrangler pages deploy hzfj --project-name rcj-hzfj --branch main
```
上传完成后，同样到 CF 项目设置里加自定义域名 `hzfj.rcj9527.dpdns.org` 并按提示加 DNS。

---

## DNS 说明（dpdns）
- 若 `rcj9527.dpdns.org` 的解析在 Cloudflare：直接在 CF 里加子域 `hzfj` 即可，CF 自动写 DNS。
- 若 `rcj9527.dpdns.org` 解析在 dpdns 动态域名后台：在 dpdns 后台加一条 CNAME：
  `hzfj → rcj-hzfj.pages.dev`（以 CF 自定义域页面展示的目标为准）。
- Cloudflare 会为 `hzfj.rcj9527.dpdns.org` 自动签发 SSL 证书（即使父域不在 CF 也行，靠 CNAME 指向 CF + HTTP 校验）。

## 验证
```bash
curl -I https://hzfj.rcj9527.dpdns.org
# 期望：HTTP/2 200，且含 content-type: text/html
```

## 后续更新题库
改题后，重新生成根目录 `huizhou.html`（用 `outputs/build_huizhou_offline.py`），
然后把最新内容同步到 `hzfj/index.html`，重新 Direct Upload（或 `wrangler pages deploy hzfj`）即可。
现有面试站/笔试站无需任何改动。
