/* 面试对练舱 · KV 信令通道（替代 PeerJS 云信令）
 * 原生 WebRTC + Cloudflare KV 做 SDP/ICE 中转：国内可达、免费、不依赖任何云信令服务器。
 *
 * POST /api/rtc  body { room, tag:"A"|"B", type:"offer"|"answer"|"ice", payload }
 *   写入该房间的信号总线（按 seq 自增，供对方按 since 拉取增量）
 * GET  /api/rtc?room=&tag=&since=
 *   返回 from!=tag 且 seq>since 的信号（增量）
 *
 * 依赖 env.VISIT_KV；未绑定返回 503 KV_NOT_BOUND。
 */
function sanitizeRoom(s) {
  return (s || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
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
function kvKey(room) { return "rtc_" + room; }

export async function onRequestPost(context) {
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);
  const url = new URL(context.request.url);
  let body;
  try { body = await context.request.json(); } catch (e) { body = {}; }
  const room = sanitizeRoom(body.room || url.searchParams.get("room"));
  if (!room) return json({ ok: false, error: "MISSING_ROOM" }, 400);
  const tag = (body.tag === "A" || body.tag === "B") ? body.tag : "A";
  const type = body.type;
  if (!["offer", "answer", "ice"].includes(type)) return json({ ok: false, error: "BAD_TYPE" }, 400);
  if (!body.payload) return json({ ok: false, error: "MISSING_PAYLOAD" }, 400);

  let store;
  try {
    const raw = await kv.get(kvKey(room));
    store = raw ? JSON.parse(raw) : { seq: 0, signals: [], created: Date.now() };
  } catch (e) {
    store = { seq: 0, signals: [], created: Date.now() };
  }
  store.seq = (store.seq || 0) + 1;
  store.signals = store.signals || [];
  store.signals.push({ seq: store.seq, from: tag, type: type, payload: body.payload, ts: Date.now() });
  if (store.signals.length > 80) store.signals = store.signals.slice(-80); // 裁剪，防无限增长
  await kv.put(kvKey(room), JSON.stringify(store), { expirationTtl: 1800 });
  return json({ ok: true, seq: store.seq });
}

export async function onRequestGet(context) {
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);
  const url = new URL(context.request.url);
  const room = sanitizeRoom(url.searchParams.get("room"));
  if (!room) return json({ ok: false, error: "MISSING_ROOM" }, 400);
  const tag = (url.searchParams.get("tag") === "A" || url.searchParams.get("tag") === "B") ? url.searchParams.get("tag") : "A";
  const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
  try {
    const raw = await kv.get(kvKey(room));
    if (!raw) return json({ ok: true, signals: [], seq: 0 });
    const store = JSON.parse(raw);
    const all = store.signals || [];
    const out = all.filter(function (s) { return s.from !== tag && s.seq > since; });
    return json({ ok: true, signals: out, seq: store.seq || 0 });
  } catch (e) {
    return json({ ok: true, signals: [], seq: 0 });
  }
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
