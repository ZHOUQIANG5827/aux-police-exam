// Cloudflare Pages Functions 中间件：每日访问限额（防白嫖党无限刷免费站）
// 部署后由 Cloudflare 自动对每个请求执行。
//
// 计数方案（两档自动切换）：
//   ★ 真·按 IP 硬限制（KV）：在 Cloudflare 后台把 KV 命名空间绑定到本函数(绑定名 VISIT_KV)后，
//     自动按访客 IP 记当日浏览页数。优点：清 Cookie / 开无痕 / 换浏览器都绕不过，最硬。
//   ★ 回退·Cookie 软限制：未绑定 KV 时，用浏览器 Cookie 记当日页数（零配置，push 即生效）。
//     缺点：访客清 Cookie 可重置（足够拦住大部分白嫖党）。
//
// 作者本人永不被限（优先级从高到低）：
//   1) ALLOW_IPS：在 Cloudflare 后台 Settings→Functions 环境变量设 ALLOW_IPS=你的IP(逗号分隔)，
//      该 IP 直接放行——【私密、最安全、推荐】。
//   2) VIP 密钥：访问一次 https://你的域名/sz/?vip=VIP_SECRET 即种下免限制 Cookie(rcj_vip=1)，全站永不被限。
//      ⚠️ 此密钥写在公开仓库里属「软豁免」，懂行的人也能 ?vip= 自豁免；故优先用 ALLOW_IPS。
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

// ============ 定时下线（到点自动锁站，逼白嫖党转离线付费版）============
// 下线时间（毫秒时间戳）。
//   ★ 0 = 功能关闭（不挂横幅、不锁站）。
//   ★ 当前状态：已启用，2026-07-25 13:39 GMT+8 起立即停服（用户确认"现在就下线"）。
//   ★ 想复活：改回 0 再 push，或在 Cloudflare 后台设环境变量 OFFLINE_AT=0 覆盖（无需改代码）。
const OFFLINE_AT_DEFAULT = 1784957946000;

// —— 到期后的「已停服」页面（全内联，不依赖任何外部资源；仍带闲鱼引流位）——
const OFFLINE_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>免费在线版已停止服务</title>
<style>
  body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#eef2f7;color:#1e3a5f;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .box{max-width:460px;background:#fff;padding:36px 30px;border-radius:18px;box-shadow:0 10px 36px rgba(30,58,95,.12);text-align:center}
  .emoji{font-size:46px;line-height:1}
  .t{font-size:22px;font-weight:800;margin:14px 0 12px}
  .d{font-size:14px;color:#4a5568;line-height:1.85}
  .d b{color:#1e3a5f}
  .b{display:inline-block;margin-top:22px;background:#1e3a5f;color:#fff;padding:12px 22px;border-radius:11px;text-decoration:none;font-size:14px;font-weight:600}
  .b:hover{opacity:.92}
  .tip{margin-top:14px;font-size:12px;color:#94a3b8}
</style></head><body><div class="box">
  <div class="emoji">🙏</div>
  <h1 class="t">免费在线版已停止服务</h1>
  <p class="d">本<b>免费在线体验版</b>的开放体验期已结束，在线服务已停止，感谢一路以来的支持。<br><br>
  需要<b>全量真题 + AI 智能点评（录音即出分）+ 离线无广告永久版</b>（一次获取、断网可用、无每日次数限制），请去闲鱼搜 <b>RCJ9527</b> 获取完整版。</p>
  <a class="b" href="https://www.goofish.com/" target="_blank" rel="noopener">去闲鱼搜 RCJ9527 获取完整版 →</a>
  <div class="tip">已购买离线版的同学不受影响，双击本地 HTML 即可继续刷题。</div>
</div></body></html>`;

// —— 到期前注入到每个在线页面顶部的「倒计时横幅」（红色，实时倒计时，促转化）——
function bannerHtml(offlineAt) {
  return '<style>'
    + '#rcjOfflineBar{position:fixed;top:0;left:0;right:0;z-index:2147483600;'
    + 'background:linear-gradient(90deg,#e11d48,#b91c1c);color:#fff;'
    + 'font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;'
    + 'font-size:13px;line-height:1.5;padding:8px 12px;text-align:center;'
    + 'box-shadow:0 2px 10px rgba(0,0,0,.18)}'
    + '#rcjOfflineBar b{font-weight:800}'
    + '#rcjOfflineBar #rcjOfflineCd{font-variant-numeric:tabular-nums;'
    + 'background:rgba(255,255,255,.18);padding:1px 7px;border-radius:6px;margin:0 2px}'
    + '#rcjOfflineBar a{color:#fff;text-decoration:underline;font-weight:700;white-space:nowrap}'
    + '@media(max-width:520px){#rcjOfflineBar{font-size:12px;padding:7px 10px}}'
    + '</style>'
    + '<div id="rcjOfflineBar">⏰ 本站免费开放体验期即将结束 · 剩余 '
    + '<b id="rcjOfflineCd">--:--:--</b> · 需长期使用请获取离线完整版（闲鱼搜 '
    + '<a href="https://www.goofish.com/" target="_blank" rel="noopener">RCJ9527</a>）</div>'
    + '<script>(function(){var T=' + offlineAt + ';'
    + 'function p(n){return n<10?"0"+n:""+n;}'
    + 'function tick(){var d=T-Date.now();'
    + 'if(d<=0){location.reload();return;}'
    + 'var h=Math.floor(d/3600000),m=Math.floor(d%3600000/60000),s=Math.floor(d%60000/1000);'
    + 'var el=document.getElementById("rcjOfflineCd");if(el)el.textContent=p(h)+":"+p(m)+":"+p(s);}'
    + 'function boot(){var bar=document.getElementById("rcjOfflineBar");if(!bar)return;'
    + 'tick();setInterval(tick,1000);'
    + 'try{document.body.style.paddingTop=((bar.offsetHeight||40))+"px";}catch(e){}}'
    + 'if(document.body){boot();}else{document.addEventListener("DOMContentLoaded",boot);}'
    + '})();</script>';
}

// 用 HTMLRewriter 把横幅注入 HTML 响应（保留原响应头，含 Set-Cookie）
function injectBanner(res, offlineAt) {
  if (!offlineAt || offlineAt <= 0) return res; // 功能关闭时不注入横幅
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;
  return new HTMLRewriter()
    .on("body", { element(el) { el.append(bannerHtml(offlineAt), { html: true }); } })
    .transform(res);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie") || "";

  // 配置（硬编码默认值，确保部署即生效；若 Cloudflare 后台设了同名环境变量则优先覆盖）
  // ⚠️ VIP_SECRET 写在公开仓库里，属「软豁免」；真正私有豁免请用 ALLOW_IPS。
  const VIP_SECRET = (env && env.VIP_SECRET) || "rcj9527-vip-KZ9qu6kWkSH1uujsbn_3_QL6";
  const DAILY_LIMIT = parseInt((env && env.DAILY_LIMIT) || "30", 10);
  const allowIps = (env && env.ALLOW_IPS)
    ? (env.ALLOW_IPS).split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const limit = DAILY_LIMIT;

  // —— 1) 作者豁免：VIP 密钥一次性种 Cookie ——
  if (VIP_SECRET && url.searchParams.get("vip") === VIP_SECRET) {
    const res = await next();
    res.headers.append(
      "Set-Cookie",
      "rcj_vip=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure"
    );
    return res;
  }
  if (cookie.includes("rcj_vip=1")) return next();

  // —— 2) 作者 IP 白名单（私密豁免，优先级最高）——
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (ip && allowIps.includes(ip)) return next();

  const isStatic = /\.(js|css|png|jpe?g|gif|svg|json|webp|mp3|mp4|woff2?|ttf|map|ico)$/i.test(
    url.pathname
  );

  // —— ★ 定时下线：到点后，非作者的 HTML 页面导航一律返回「已停服」页；
  //    静态资源放行（停服页全内联、不依赖它们，放行也无妨）。作者(VIP/ALLOW_IPS)上面已放行，不受影响。——
  const OFFLINE_AT = parseInt((env && env.OFFLINE_AT) || String(OFFLINE_AT_DEFAULT), 10) || 0;
  if (OFFLINE_AT > 0 && Date.now() >= OFFLINE_AT) {
    if (!isStatic && request.method === "GET") {
      return new Response(OFFLINE_HTML, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return next();
  }

  // —— 3) 仅统计 HTML 页面导航，跳过静态资源与子请求 ——
  if (isStatic || request.method !== "GET") return next();

  // —— 4) 每日访问计数 ——
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const kv = env && env.VISIT_KV; // 后台绑定 KV(绑定名 VISIT_KV)后存在 → 按 IP 硬限制

  if (kv) {
    // ===== 真·按 IP 硬限制（KV）=====
    const key = `v:${ip || "unknown"}:${today}`;
    let n = 0;
    try {
      n = parseInt((await kv.get(key)) || "0", 10) || 0;
    } catch (e) {
      n = 0; // 读失败不挡用户（fail-open）
    }
    if (n >= limit) {
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
    try {
      await kv.put(key, String(n + 1), { expirationTtl: 172800 }); // 48h 覆盖次日 UTC 翻转
    } catch (e) {
      /* 写失败不挡用户 */
    }
    return injectBanner(res, OFFLINE_AT);
  }

  // ===== 回退：Cookie 软限制（未绑 KV 时）=====
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
  return injectBanner(res, OFFLINE_AT);
}
