// Cloudflare Pages Functions 中间件：每日访问限额（防白嫖党无限刷免费站）
// 部署后由 Cloudflare 自动对每个请求执行。
//
// 计数方案：默认用「浏览器 Cookie」记录当日已浏览页数（零配置，push 即生效）。
//   - 优点：无需建 KV，立即生效。
//   - 缺点：访客清 Cookie / 开无痕可重置（软限制，足够拦住大部分白嫖党）。
//   - 升级为真·按 IP 限制（更硬）：见文件底部「KV 升级说明」，建好命名空间后取消注释即可。
//
// 作者本人永不被限（二选一）：
//   1) VIP 密钥：访问一次 https://你的域名/sz/?vip=VIP_SECRET 即种下免限制 Cookie(rcj_vip=1)，全站永不被限。
//   2) ALLOW_IPS：在 wrangler.jsonc 的 vars.ALLOW_IPS 填你自己的 IP（逗号分隔），该 IP 直接放行。
//
// 计数范围：仅统计「HTML 页面导航(GET)」，静态资源(js/css/png/json/...)不计数，省开销且不影响加载。

const LIMIT_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>今日免费体验已达上限</title>
<style>
  body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#eef2f7;color:#1e3a5f;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .box{max-width:440px;background:#fff;padding:34px 30px;border-radius:18px;box-shadow:0 10px 36px rgba(30,58,95,.12);text-align:center}
  .emoji{font-size:44px;line-height:1}
  .t{font-size:21px;font-weight:800;margin:14px 0 10px}
  .d{font-size:14px;color:#4a5568;line-height:1.8}
  .d b{color:#1e3a5f}
  .b{display:inline-block;margin-top:20px;background:#1e3a5f;color:#fff;padding:11px 20px;border-radius:11px;text-decoration:none;font-size:14px;font-weight:600}
  .b:hover{opacity:.92}
</style></head><body><div class="box">
  <div class="emoji">🚧</div>
  <h1 class="t">今日免费体验已达上限</h1>
  <p class="d">本开源题库为<b>引流体验版</b>，每位访客每日可免费浏览若干次。<br><br>
  需要<b>全量真题 + AI 智能点评（录音即出分）+ 离线无广告版</b>，请去闲鱼搜 <b>RCJ9527</b> 获取完整版。</p>
  <a class="b" href="https://www.goofish.com/" target="_blank" rel="noopener">去闲鱼搜 RCJ9527 →</a>
</div></body></html>`;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie") || "";

  // —— 1) 作者豁免：VIP 密钥一次性种 Cookie ——
  const VIP_SECRET = env.VIP_SECRET || "";
  if (VIP_SECRET && url.searchParams.get("vip") === VIP_SECRET) {
    const res = await next();
    res.headers.append(
      "Set-Cookie",
      "rcj_vip=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure"
    );
    return res;
  }
  if (cookie.includes("rcj_vip=1")) return next();

  // —— 2) 作者 IP 白名单 ——
  const allowIps = (env.ALLOW_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (ip && allowIps.includes(ip)) return next();

  // —— 3) 仅统计 HTML 页面导航，跳过静态资源与子请求 ——
  const isStatic = /\.(js|css|png|jpe?g|gif|svg|json|webp|mp3|mp4|woff2?|ttf|map|ico)$/i.test(
    url.pathname
  );
  if (isStatic || request.method !== "GET") return next();

  // —— 4) 每日访问计数（Cookie 方案）——
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const limit = parseInt(env.DAILY_LIMIT || "30", 10);

  let visits = 0;
  try {
    const m = cookie.match(/rcj_visits=([^;]+)/);
    if (m) {
      const o = JSON.parse(decodeURIComponent(m[1]));
      if (o && o.d === today) visits = o.n || 0;
    }
  } catch (e) {
    visits = 0;
  }

  if (visits >= limit) {
    return new Response(LIMIT_HTML, {
      status: 429,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "86400",
        "cache-control": "no-store",
      },
    });
  }

  const res = await next();
  const nextVal = encodeURIComponent(JSON.stringify({ d: today, n: visits + 1 }));
  res.headers.append(
    "Set-Cookie",
    `rcj_visits=${nextVal}; Path=/; Max-Age=86400; SameSite=Lax; Secure`
  );
  return res;
}

/* ============================================================
 * KV 升级说明（如需真·按 IP 限制，比 Cookie 更硬）：
 *   1) 本机装好 wrangler 并登录：npm i -g wrangler && wrangler login
 *   2) 建命名空间：  wrangler kv namespace create VISIT_KV
 *      记下返回的 id（形如 3a1b...）
 *   3) 在 wrangler.jsonc 里取消注释并填入 id：
 *        "kv_namespaces": [ { "binding": "VISIT_KV", "id": "上面的id" } ]
 *   4) 把上面「4) 每日访问计数」整段替换为 KV 版本（伪代码）：
 *        const key = `v:${ip}:${today}`;
 *        let n = parseInt(await env.VISIT_KV.get(key) || "0", 10) || 0;
 *        if (n >= limit) return new Response(LIMIT_HTML, {status:429,...});
 *        await env.VISIT_KV.put(key, String(n+1), { expirationTtl: 172800 });
 *   5) git add -A && git commit && git push  → 自动部署生效
 * ============================================================ */
