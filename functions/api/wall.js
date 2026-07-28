/* 陪练留言墙 / 约练 API（Cloudflare Pages Functions）
 * GET  /api/wall?city=sz        -> 返回该城市留言墙列表（最新在前）
 * POST /api/wall                -> 追加一条（留言 msg 或 约练 meet）
 * 存储：env.VISIT_KV（与访问计数共用同一命名空间），key = pod_wall_<city>
 * 未绑定 KV 时返回 503 {ok:false,error:"KV_NOT_BOUND"}，前端展示降级提示。
 */
const MAX_ITEMS = 100;
const CITIES = ["sz", "hz", "gd", "ms", "cd", "wh"];

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
      "access-control-allow-methods": "GET, POST, OPTIONS",
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
  const city = cityOf(body.city);
  const name = sanitize(body.name, 20) || "匿名考生";
  const type = body.type === "meet" ? "meet" : "msg";
  const text = sanitize(body.text, 300);
  if (!text) return json({ ok: false, error: "EMPTY_TEXT" }, 400);
  const meetAt = sanitize(body.meetAt, 30);
  const contact = sanitize(body.contact, 40);
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    type: type,
    text: text,
    meetAt: meetAt,
    contact: contact,
    createdAt: Date.now(),
  };
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);
  const items = await readList(kv, city);
  items.push(item);
  if (items.length > MAX_ITEMS) items = items.slice(items.length - MAX_ITEMS);
  try {
    await kv.put("pod_wall_" + city, JSON.stringify(items), { expirationTtl: 2592000 });
  } catch (e) {
    return json({ ok: false, error: "WRITE_FAIL" }, 500);
  }
  return json({ ok: true, item: item });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
