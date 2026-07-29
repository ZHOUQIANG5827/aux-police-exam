/* 面试对练舱 · KV 集中撮合大厅（替代 PeerJS 大厅自撮合）
 * POST /api/signal?action=join  -> body { city, peerId } 加入等待池或立即配对
 * GET  /api/signal?action=poll&city=sz&ticket=xxx  -> 查询是否已配对
 * POST /api/signal?action=cancel&city=sz&ticket=xxx  -> 取消等待
 *
 * 配对成功后返回 { matched:true, room, isHost, role, peerId }
 *   room:   练习房 PeerJS ID（房主用此 ID 创建房间）
 *   isHost: 当前用户是否为房主
 *   role:   当前用户角色 examiner/candidate
 *   peerId: 对方 PeerJS ID（调试/备用）
 *
 * 依赖 env.VISIT_KV；未绑定返回 503 KV_NOT_BOUND。
 */
const CITIES = ["sz", "hz", "gd", "ms", "cd", "wh"];
const WAIT_TTL = 300;          // 等待池条目 TTL（秒）
const MATCH_TTL = 300;         // 配对结果 TTL（秒）
const MAX_WAIT = 60;           // 单个城市等待池最多保留条目（防异常堆积）

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
function ticket() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function genRoom() {
  return "r" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
function kvKeyWait(city) { return "pod_signal_wait_" + city; }
function kvKeyMatch(ticket) { return "pod_signal_match_" + ticket; }

async function readWaitList(kv, city) {
  try {
    const raw = await kv.get(kvKeyWait(city));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
async function writeWaitList(kv, city, list) {
  await kv.put(kvKeyWait(city), JSON.stringify(list), { expirationTtl: WAIT_TTL });
}
async function writeMatch(kv, ticket, data) {
  await kv.put(kvKeyMatch(ticket), JSON.stringify(data), { expirationTtl: MATCH_TTL });
}

// 原子式尝试配对：读取等待池，若有人则配对并写结果，否则把自己加入。
// 用简单重试处理 KV 最终一致性的并发冲突。
async function joinOrWait(kv, city, myPeerId) {
  const myTicket = ticket();
  const now = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
    let list = await readWaitList(kv, city);
    // 清理过期 / 同 peerId 的旧条目
    list = list.filter(function (x) {
      if (!x) return false;
      if (x.peerId === myPeerId) return false;
      if ((x.createdAt || 0) < now - 240000) return false; // 4 分钟未匹配视为过期
      return true;
    });

    if (list.length > 0) {
      // 配对：取最早等待者
      const partner = list.shift();
      const room = genRoom();
      // 随机分配角色
      const partnerRole = Math.random() < 0.5 ? "examiner" : "candidate";
      const myRole = partnerRole === "examiner" ? "candidate" : "examiner";

      const partnerMatch = { matched: true, room: room, isHost: true, role: partnerRole, peerId: myPeerId };
      const myMatch = { matched: true, room: room, isHost: false, role: myRole, peerId: partner.peerId };

      try {
        await writeMatch(kv, partner.ticket, partnerMatch);
        await writeMatch(kv, myTicket, myMatch);
        await writeWaitList(kv, city, list);
        return { ok: true, matched: true, ticket: myTicket, ...myMatch };
      } catch (e) {
        // 写失败重试
        await new Promise(function (r) { setTimeout(r, 50); });
        continue;
      }
    } else {
      // 加入等待池
      const entry = { ticket: myTicket, peerId: myPeerId, createdAt: now };
      list.push(entry);
      if (list.length > MAX_WAIT) list = list.slice(list.length - MAX_WAIT);
      try {
        await writeWaitList(kv, city, list);
        return { ok: true, matched: false, ticket: myTicket };
      } catch (e) {
        await new Promise(function (r) { setTimeout(r, 50); });
        continue;
      }
    }
  }
  return { ok: false, error: "BUSY" };
}

async function cancelWait(kv, city, t) {
  const list = await readWaitList(kv, city);
  const next = list.filter(function (x) { return x && x.ticket !== t; });
  if (next.length !== list.length) {
    await writeWaitList(kv, city, next);
  }
  return { ok: true };
}

async function pollMatch(kv, t, city) {
  // 优先读配对结果；KV 最终一致，客户端应持续轮询，不要因等待池无自己就放弃。
  try {
    const raw = await kv.get(kvKeyMatch(t));
    if (raw) {
      const data = JSON.parse(raw);
      return { ok: true, ...data };
    }
  } catch (e) {}
  return { ok: true, matched: false };
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const action = url.searchParams.get("action") || "join";
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);

  if (action === "cancel") {
    const city = cityOf(url.searchParams.get("city"));
    const t = sanitize(url.searchParams.get("ticket"), 40);
    if (!t) return json({ ok: false, error: "MISSING_TICKET" }, 400);
    return json(await cancelWait(kv, city, t));
  }

  if (action !== "join") return json({ ok: false, error: "BAD_ACTION" }, 400);

  let body;
  try { body = await context.request.json(); } catch (e) { body = {}; }
  const city = cityOf(body.city);
  const peerId = sanitize(body.peerId, 60);
  if (!peerId) return json({ ok: false, error: "MISSING_PEER_ID" }, 400);

  return json(await joinOrWait(kv, city, peerId));
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const action = url.searchParams.get("action") || "poll";
  const kv = context.env && context.env.VISIT_KV;
  if (!kv) return json({ ok: false, error: "KV_NOT_BOUND" }, 503);

  if (action === "poll") {
    const t = sanitize(url.searchParams.get("ticket"), 40);
    const city = cityOf(url.searchParams.get("city"));
    if (!t) return json({ ok: false, error: "MISSING_TICKET" }, 400);
    return json(await pollMatch(kv, t, city));
  }

  return json({ ok: false, error: "BAD_ACTION" }, 400);
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
