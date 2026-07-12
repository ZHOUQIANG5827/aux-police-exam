# 部署步骤清单（辅警刷题站 · 单仓库 fj.rcj9527.dpdns.org）

> 本仓库 = 一个 GitHub 仓库 + 一个 Cloudflare Pages 项目 + 一个主域名。
> 各城市用**子路径**区分（`/sz` `/hz` …），不新建多个 Pages / Workers。
> push 后 Cloudflare **连 Git 自动部署**，无需手动上传。

---

## ✅ 上线前检查（每次 push 前过一遍）
- [ ] 工作区干净：`git status` 无未提交改动
- [ ] 只含真实城市站（无"母库套壳""筹备中占位"等虚内容）
- [ ] 门户标题/文案无"全国/省统考"等过度宣称
- [ ] 无 `.bak` 等备份文件被误加（`git status` 里看不到它们 = 已被 .gitignore 拦住）

---

## 第一步：push
```bash
cd "C:\Users\小样儿\Desktop\产品交付\fujing-mianshi"
git push origin main
```

> ⚠️ 若报证书吊销错误 `CRYPT_E_REVOCATION_OFFLINE`，先执行再重试：
> ```bash
> git config --global http.schannelCheckRevoke best-effort
> ```

---

## 第二步：等 Cloudflare 自动部署
- 控制台 → **Workers 和 Pages → rcj-fj**（或 fujing-mianshi）
- 看 **Deployments** 列表，最新一条状态变 ✅（连 Git 会自动用 `main` 分支重建）
- 临时确认：打开控制台里的 `*.pages.dev` 地址，看内容已是新版门户

---

## 第三步：加自定义域 `fj.rcj9527.dpdns.org`
- 项目内 → **Settings → Custom domains → Add custom domain**
- 填 `fj.rcj9527.dpdns.org` → 继续
- Cloudflare 会给一个 **CNAME 目标值**（形如 `rcj-fj.pages.dev` 或 `fujing-mianshi.pages.dev`，**以控制台实际显示为准**）→ 记下来

---

## 第四步：dpdns 加 CNAME
登录 dpdns 控制台 → 域名 `rcj9527.dpdns.org` → 添加记录：
- 类型：**CNAME**
- 主机名 / 名称：**`fj`**
- 指向 / 值：**第三步 Cloudflare 给的目标**
- TTL：默认 → 保存

---

## 第五步：等证书签发
- 回 Cloudflare 自定义域页面，状态 `Pending` → `Active`（SSL 证书自动签发，几分钟到半小时）
- 变绿后访问：
  - 门户：https://fj.rcj9527.dpdns.org/
  - 深圳：https://fj.rcj9527.dpdns.org/sz/
  - 惠州：https://fj.rcj9527.dpdns.org/hz/

---

## 验证（push + 域名生效后）
```bash
curl -I https://fj.rcj9527.dpdns.org/
curl -I https://fj.rcj9527.dpdns.org/sz/
curl -I https://fj.rcj9527.dpdns.org/hz/
```
三个都应返回 `200 text/html`。

---

## 可选：保留旧域名 `szfj.rcj9527.dpdns.org`
- 想让闲鱼老链接不失效 → 在 Cloudflare 自定义域**再加** `szfj.rcj9527.dpdns.org`，并在 dpdns 给 `szfj` 也加一条 CNAME（指向同目标）
- 仓库根 `_redirects` 会自动把 `szfj/*` → `fj.rcj9527.dpdns.org/sz/:splat`（301）
- 不想要了就忽略

---

## 加新城市（唯一推荐：官方题库）
1. 拿到该城**官方 Excel / 文档** → 发我
2. 我按惠州方式解析生成 `<code>/index.html`（自包含单文件），如 `gz/`（广州）
3. 门户首页 `index.html` 加一张卡片指向 `/<code>/`
4. `git push` → 自动部署上线
> ⚠️ 不要用惠州母库改品牌冒充其他城市（各城考情不同，套用构成虚假宣传）
