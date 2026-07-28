/* 陪练留言墙 / 约练 API（Cloudflare Pages Functions）
 * GET  /api/wall?city=sz        -> 返回该城市留言墙列表（最新在前）
 * POST /api/wall                -> 发帖 / 响应约练
 *   body.action 缺省或 "post"   -> 追加一条（留言 msg 或 约练 meet）
 *   body.action = "respond"     -> 对某条约练帖响应「我想一起」（按匿名 uid 去重计数）
 * DELETE /api/wall              -> 删除（管理员口令）
 * 存储：env.VISIT_KV（与访问计数共用同一命名空间），key = pod_wall_<city>
 * 未绑定 KV 时返回 503 {ok:false,error:"KV_NOT_BOUND"}，前端展示降级提示。
 */
const MAX_ITEMS = 100;              // 单城市保留条数上限（FIFO 裁剪，KV 空间恒定）
const CITIES = ["sz", "hz", "gd", "ms", "cd", "wh"];
const RATE_LIMIT_SEC = 60;          // 同一 IP 发帖间隔限制
const DAILY_IP_LIMIT = 20;         // 同一 IP 单日发帖次数上限（跨城市共享，防刷屏/防 KV 读写额度被耗尽）
const SENSITIVE = ["赌博", "色情", "代考", "炸药", "炸弹", "毒品", "诈骗", "办证", "招嫖", "代刷", "枪"];

// 当天剩余秒数（用于日配额 key 的 TTL，自然过期不占永久空间）
function dayLeftSec() {
  var end = new Date(new Date().toISOString().slice(0, 10) + "T23:59:59Z").getTime();
  return Math.max(Math.ceil((end - Date.now()) / 1000), 60);
}
function dayKeyOf(ip) {
  return "wall_day_" + new Date().toISOString().slice(0, 10) + "_" + ip;
}

function sanitize(s, max) {
  s = (s || "").toString().trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
function cityOf(raw) {
  var c = sanitize(raw, 10).toLowerCase();
  return CITIES.indexOf(c) >= 0 ? c : "sz";
}
async function readList(kv, city) {
  try {
    var raw = await kv.get("pod_wall_" + city);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}
function hasSensitive(s) {
  s = (s || "").toLowerCase();
  for (var i = 0; i < SENSITIVE.length; i++) {
    if (s.indexOf(SENSITIVE[i]) >= 0) return SENSITIVE[i];
  }
  return null;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const city = cityOf(url.searchParams.get("city"));
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND", items: [] }, 503);
  const items = (await readList(kv, city)).slice().reverse();
  return json({ ok: true, city: city, items: items });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ ok: false, error: "BAD_JSON" }, 400);
  }
  if (body && body.action === "respond") return doRespond(context, body);
  return doPost(context, body);
}

async function doPost(context, body) {
  const city = cityOf(body.city);
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);

  // 频率限制（按客户端 IP）
  const ip = context.request.headers.get("cf-connecting-ip") || "unknown";
  const dayKey = dayKeyOf(ip);
  try {
    const rlKey = "wall_rl_" + ip;
    const last = await kv.get(rlKey);
    const now = Date.now();
    if (last && now - Number(last) < RATE_LIMIT_SEC * 1000) {
      const left = Math.ceil((RATE_LIMIT_SEC * 1000 - (now - Number(last))) / 1000);
      return json({ ok: false, error: "RATE_LIMIT", left: left }, 429);
    }
    await kv.put(rlKey, String(now), { expirationTtl: RATE_LIMIT_SEC });
  } catch (e) { /* 限速失败不阻断发帖 */ }

  // 单日/IP 配额（防刷屏 + 防 KV 读写额度被耗尽；KV 最终一致，允许少量超量但量级可控）
  try {
    const dayCount = Number(await kv.get(dayKey) || "0");
    if (dayCount >= DAILY_IP_LIMIT) {
      return json({ ok: false, error: "DAILY_LIMIT", left: dayLeftSec() }, 429);
    }
  } catch (e) { /* 计数失败不阻断发帖 */ }

  const name = sanitize(body.name, 20) || "匿名考生";
  const type = body.type === "meet" ? "meet" : "msg";
  const text = sanitize(body.text, 300);
  if (!text) return json({ ok: false, error: "EMPTY_TEXT" }, 400);

  const hit = hasSensitive(text) || hasSensitive(name);
  if (hit) return json({ ok: false, error: "BAD_WORD", word: hit }, 400);

  // 去重：最近 5 条内同昵称+同内容视为重复
  let items = await readList(kv, city);
  const tail = items.slice(-5);
  for (var i = 0; i < tail.length; i++) {
    if (tail[i].name === name && tail[i].text === text &&
        Date.now() - (tail[i].createdAt || 0) < 5 * 60 * 1000) {
      return json({ ok: false, error: "DUP" }, 400);
    }
  }

  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    type: type,
    text: text,
    meetAt: sanitize(body.meetAt, 30),
    meetAtISO: sanitize(body.meetAtISO, 30),
    direction: sanitize(body.direction, 20),
    contact: sanitize(body.contact, 40),
    resp: 0,
    respUsers: [],
    createdAt: Date.now(),
  };
  items.push(item);
  if (items.length > MAX_ITEMS) items = items.slice(items.length - MAX_ITEMS);
  try {
    await kv.put("pod_wall_" + city, JSON.stringify(items), { expirationTtl: 2592000 });
  } catch (e) {
    return json({ ok: false, error: "WRITE_FAIL" }, 500);
  }
  // 日配额 +1（TTL 到当天结束，自然过期）
  try {
    const dayCount = Number(await kv.get(dayKey) || "0");
    await kv.put(dayKey, String(dayCount + 1), { expirationTtl: dayLeftSec() });
  } catch (e) { /* 计数失败不影响已发帖 */ }
  return json({ ok: true, item: item });
}

async function doRespond(context, body) {
  const city = cityOf(body.city);
  const id = sanitize(body.id, 40);
  const uid = sanitize(body.uid, 40) || "anon";
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);
  let items = await readList(kv, city);
  let found = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) { found = items[i]; break; }
  }
  if (!found) return json({ ok: false, error: "NOT_FOUND" }, 404);
  found.respUsers = found.respUsers || [];
  if (found.respUsers.indexOf(uid) >= 0) {
    return json({ ok: true, already: true, resp: found.resp || 0, item: found });
  }
  found.respUsers.push(uid);
  found.resp = (found.resp || 0) + 1;
  try {
    await kv.put("pod_wall_" + city, JSON.stringify(items), { expirationTtl: 2592000 });
  } catch (e) {
    return json({ ok: false, error: "WRITE_FAIL" }, 500);
  }
  return json({ ok: true, resp: found.resp, item: found });
}

export async function onRequestDelete(context) {
  const url = new URL(context.request.url);
  const city = cityOf(url.searchParams.get("city"));
  const id = sanitize(url.searchParams.get("id"), 40);
  const admin = url.searchParams.get("admin") || "";
  const secret = (context.env && context.env.WALL_ADMIN) || "rcj9527";
  if (admin !== secret) return json({ ok: false, error: "BAD_ADMIN" }, 403);
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);
  let items = await readList(kv, city);
  const before = items.length;
  items = items.filter(function (x) { return x.id !== id; });
  if (items.length === before) return json({ ok: false, error: "NOT_FOUND" }, 404);
  try {
    await kv.put("pod_wall_" + city, JSON.stringify(items), { expirationTtl: 2592000 });
  } catch (e) {
    return json({ ok: false, error: "WRITE_FAIL" }, 500);
  }
  return json({ ok: true, removed: before - items.length });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
