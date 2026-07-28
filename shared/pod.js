/* 面试对练舱 · 1v1 P2P 极简面试对练
 * 架构：PeerJS（默认云信令）。房号=房主 PeerID，搭子凭 ?room= 直连。
 * 特性：URL 秒连 / 考生·考官分工 / 题库+倒计时镜面同步 / Checklist 零延迟同步
 *       / 断线自动重连(disconnected+close) / Checklist 双向 localStorage 缓存
 * 修复记录：① 题库字段 title/answer（原 stem 导致空白）② 房主刷新稳定复用房间号
 *         ③ 双向语音自动回拨 ④ 考官端参考答案 ⑤ 重置/离开
 */
(function () {
  "use strict";

  var qs = new URLSearchParams(location.search);
  var CITY = (qs.get("city") || "sz");
  var ROOM = (qs.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  // 房主判定：无 room= 即新房主；有 room= 且本地标记过“我是该房房主”则仍为房主（刷新复用）
  var HOST_MARK = "podHost_" + (ROOM || "draft");
  var IS_HOST = !ROOM ? true : (localStorage.getItem(HOST_MARK) === "1");
  var STORE_KEY = "podCache_" + (ROOM || "draft");

  var DURATION_DEFAULT = 180;
  var BASE_SCORE = 100;
  var CHECKLIST = [
    { id: "dress",    label: "着装/仪容不规范",       score: 5 },
    { id: "fluent",   label: "表达不流畅、口头禅多",  score: 5 },
    { id: "key",      label: "核心要点遗漏",          score: 10 },
    { id: "logic",    label: "逻辑混乱、条理不清",    score: 5 },
    { id: "time",     label: "超时/被叫停",           score: 5 },
    { id: "attitude", label: "态度不端正/不礼貌",      score: 10 },
    { id: "content",  label: "内容空泛、无事例支撑",   score: 5 }
  ];

  // ---------- 状态（双向缓存） ----------
  var state = {
    role: "", qIndex: -1, started: false,
    durationSec: DURATION_DEFAULT, startTs: 0, checks: {}, lastSync: 0
  };
  loadCache();

  var $ = function (id) { return document.getElementById(id); };
  var el = {};
  ["landing","room","connState","createBtn","roomNo","copyBtn","leaveBtn","roleRow","roleNow",
   "candPanel","candQuestion","candTimer","candScore","candDeduct",
   "examPanel","qSelect","sendQBtn","examAnswer","durRow","startBtn","stopBtn","resetBtn","checklist","examScore",
   "micBtn","voiceState","remoteAudio","localAudio","log","wxHint","toast"
  ].forEach(function (k) { el[k] = $(k); });

  var peer = null, conn = null, localStream = null, micOn = false;
  var timerInt = null, reconnectTimer = null, reconnectDelay = 1000;
  var calledPeerId = null; // 防止双向语音重复呼叫的守卫

  // ---------- 工具 ----------
  function log(msg, cls) {
    var d = document.createElement("div");
    d.className = "log-line" + (cls ? " " + cls : "");
    d.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
    el.log.appendChild(d);
    el.log.scrollTop = el.log.scrollHeight;
  }
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add("show");
    setTimeout(function () { el.toast.classList.remove("show"); }, 2200);
  }
  function setConn(text, cls) {
    el.connState.textContent = text;
    el.connState.className = "pod-conn " + (cls || "");
  }
  function genRoom() {
    var s = "", chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function saveCache() {
    try { state.lastSync = Date.now(); localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function loadCache() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        state.role = o.role || "";
        state.qIndex = (typeof o.qIndex === "number") ? o.qIndex : -1;
        state.started = !!o.started;
        state.durationSec = o.durationSec || DURATION_DEFAULT;
        state.startTs = o.startTs || 0;
        state.checks = o.checks || {};
      }
    } catch (e) {}
  }

  // ---------- 数据传输 ----------
  function send(obj) {
    if (conn && conn.open) { try { conn.send(obj); } catch (e) {} }
  }
  function onData(data) {
    if (!data || !data.t) return;
    switch (data.t) {
      case "hello":
        if (state.role === "examiner") sendState();
        break;
      case "req":
        if (state.role === "examiner") sendState();
        break;
      case "state":
        if (state.role === "candidate") applyState(data.state);
        break;
      case "q":
        if (state.role === "candidate") { state.qIndex = data.i; showCandQuestion(); saveCache(); }
        break;
      case "start":
        if (state.role === "candidate") {
          state.started = true; state.durationSec = data.durationSec; state.startTs = data.startTs;
          startCandidateTimer(); saveCache();
        }
        break;
      case "stop":
        if (state.role === "candidate") { state.started = false; stopCandidateTimer(); el.candTimer.textContent = "已结束"; saveCache(); }
        break;
      case "check":
        if (state.role === "candidate") { state.checks[data.id] = !!data.on; updateCandScore(); saveCache(); }
        break;
      case "reset":
        if (state.role === "candidate") { state.checks = {}; updateCandScore(); saveCache(); }
        break;
    }
  }
  function sendState() {
    send({ t: "state", state: {
      qIndex: state.qIndex, started: state.started,
      durationSec: state.durationSec, startTs: state.startTs, checks: state.checks
    }});
  }
  function applyState(s) {
    if (!s) return;
    state.qIndex = (typeof s.qIndex === "number") ? s.qIndex : state.qIndex;
    state.started = !!s.started;
    state.durationSec = s.durationSec || state.durationSec;
    state.startTs = s.startTs || state.startTs;
    state.checks = s.checks || {};
    showCandQuestion(); updateCandScore();
    if (state.started) startCandidateTimer(); else stopCandidateTimer();
    saveCache();
  }

  // ---------- 倒计时（考生端，基于共享 startTs 同步） ----------
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }
  function startCandidateTimer() {
    stopCandidateTimer();
    timerInt = setInterval(function () {
      var remain = state.durationSec - (Date.now() - state.startTs) / 1000;
      if (remain <= 0) { el.candTimer.textContent = "00:00 · 时间到"; stopCandidateTimer(); }
      else el.candTimer.textContent = fmt(remain);
    }, 250);
  }
  function stopCandidateTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }

  // ---------- 评分 ----------
  function calcScore(checks) {
    var d = 0;
    CHECKLIST.forEach(function (c) { if (checks[c.id]) d += c.score; });
    return Math.max(0, BASE_SCORE - d);
  }
  function updateCandScore() {
    var sc = calcScore(state.checks);
    el.candScore.textContent = sc;
    var items = CHECKLIST.filter(function (c) { return state.checks[c.id]; });
    el.candDeduct.textContent = items.length
      ? ("已扣：" + items.map(function (c) { return c.label + "(-" + c.score + ")" }).join("、"))
      : "暂无扣分";
  }
  function renderChecklist() {
    el.checklist.innerHTML = "";
    CHECKLIST.forEach(function (c) {
      var row = document.createElement("label"); row.className = "ck-row";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = !!state.checks[c.id];
      cb.addEventListener("change", function () {
        state.checks[c.id] = cb.checked;
        updateExamScore(); updateCandScore(); saveCache();
        send({ t: "check", id: c.id, on: cb.checked });
      });
      var span = document.createElement("span");
      span.textContent = c.label + "（-" + c.score + "）";
      row.appendChild(cb); row.appendChild(span);
      el.checklist.appendChild(row);
    });
    updateExamScore();
  }
  function updateExamScore() { el.examScore.textContent = calcScore(state.checks); }

  // ---------- 题库 ----------
  var QUESTIONS = [];
  function qText(q) { return ((q && (q.title || q.stem)) || "").replace(/<[^>]+>/g, ""); }
  function qAns(q) { return ((q && (q.answer || q.a)) || "").replace(/<[^>]+>/g, ""); }
  function loadQuestions(cb) {
    var s = document.createElement("script");
    s.src = "../" + CITY + "/station-data.js?pod=" + Date.now();
    s.onload = function () {
      try { QUESTIONS = (window.DATA_INTERVIEW || []).slice(); } catch (e) {}
      cb();
    };
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }
  function renderQuestionOptions() {
    el.qSelect.innerHTML = "";
    if (!QUESTIONS.length) {
      var o = document.createElement("option"); o.textContent = "（未加载到题库）"; el.qSelect.appendChild(o); return;
    }
    QUESTIONS.forEach(function (q, i) {
      var o = document.createElement("option");
      o.value = i;
      var t = qText(q);
      o.textContent = (i + 1) + ". " + (t.length > 26 ? t.slice(0, 26) + "…" : t);
      el.qSelect.appendChild(o);
    });
  }
  function showCandQuestion() {
    if (state.qIndex >= 0 && QUESTIONS[state.qIndex]) {
      el.candQuestion.textContent = qText(QUESTIONS[state.qIndex]);
    } else {
      el.candQuestion.textContent = "等待考官发题…";
    }
  }
  function showExamAnswer() {
    var i = (typeof el.qSelect.value === "string") ? parseInt(el.qSelect.value, 10) : el.qSelect.value;
    if (QUESTIONS[i]) {
      el.examAnswer.textContent = qAns(QUESTIONS[i]);
      el.examAnswer.classList.remove("empty");
    } else {
      el.examAnswer.textContent = "选择题目后，此处显示参考答案（供你对照评分）";
      el.examAnswer.classList.add("empty");
    }
  }

  // ---------- 身份分工 ----------
  function setRole(role) {
    state.role = role; saveCache();
    el.roleRow.style.display = "none";
    el.roleNow.style.display = "block";
    el.roleNow.innerHTML = "你的身份：<b>" + (role === "examiner" ? "🎓 考官" : "🙋 考生") +
      "</b> <button class=\"link-btn\" id=\"switchRole\">切换</button>";
    $("switchRole").addEventListener("click", function () {
      state.role = ""; saveCache();
      el.roleRow.style.display = "flex"; el.roleNow.style.display = "none";
      el.candPanel.style.display = "none"; el.examPanel.style.display = "none";
    });
    if (role === "examiner") {
      el.examPanel.style.display = "block"; el.candPanel.style.display = "none";
      renderChecklist(); markDurActive(); showExamAnswer();
      if (state.qIndex >= 0) showCandQuestion();
      updateExamScore();
    } else {
      el.candPanel.style.display = "block"; el.examPanel.style.display = "none";
      showCandQuestion(); updateCandScore();
      if (state.started) startCandidateTimer();
    }
    send({ t: "hello", role: role });
    if (role === "candidate") send({ t: "req" });
    else sendState();
  }
  function markDurActive() {
    Array.prototype.forEach.call(el.durRow.querySelectorAll(".dur-btn"), function (x) {
      x.classList.toggle("active", parseInt(x.getAttribute("data-d"), 10) === state.durationSec);
    });
  }

  // ---------- 麦克风 / 语音呼叫 ----------
  function startMic() {
    if (micOn) { toast("麦克风已开启"); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("当前环境不支持麦克风（建议系统浏览器打开）"); return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (stream) {
      localStream = stream; el.localAudio.srcObject = stream;
      micOn = true; el.voiceState.textContent = "已开启"; el.micBtn.textContent = "🎤 麦克风已开";
      log("麦克风已开启");
      callPeer(IS_HOST ? (conn && conn.peer) : ROOM);
    }).catch(function (e) {
      toast("无法开启麦克风：" + (e && e.message ? e.message : e));
      log("麦克风失败：" + (e && e.message ? e.message : e), "err");
    });
  }
  // 向对端发起语音（守卫：同一对端只呼叫一次，避免双向互呼死循环）
  function callPeer(targetId) {
    if (!localStream || !peer || !peer.open || !targetId || targetId === calledPeerId) return;
    try {
      var call = peer.call(targetId, localStream);
      if (call) { bindCall(call); calledPeerId = targetId; }
    } catch (e) { log("呼叫失败：" + e, "err"); }
  }
  function bindCall(call) {
    call.on("stream", function (remoteStream) {
      el.remoteAudio.srcObject = remoteStream;
      log("已收到对方语音");
    });
    call.on("close", function () { calledPeerId = null; });
    call.on("error", function () { calledPeerId = null; });
  }

  // ---------- PeerJS 连接 ----------
  function setupPeer() {
    var opts = { debug: 1 };
    peer = IS_HOST ? new Peer(ROOM || genRoom(), opts) : new Peer(opts);

    peer.on("open", function (id) {
      log((IS_HOST ? "房主 Peer 就绪：" : "已连信令：") + id);
      setConn("已连信令", "warn");
      if (IS_HOST) {
        ROOM = id; STORE_KEY = "podCache_" + ROOM; HOST_MARK = "podHost_" + ROOM;
        try { localStorage.setItem(HOST_MARK, "1"); } catch (e) {}
        loadCache(); // 房主刷新后恢复之前缓存的打分/身份
        if (state.role) setRole(state.role);
        el.roomNo.textContent = ROOM;
        var url = "?room=" + ROOM + (CITY !== "sz" ? "&city=" + CITY : "");
        history.replaceState(null, "", url);
        toast("房间已创建：" + ROOM + "，把链接发给搭子");
      } else {
        connectToHost();
      }
    });
    peer.on("connection", function (c) {
      conn = c; bindConn(c); log("搭子已连接（数据）"); setConn("已连接", "ok");
      if (micOn) callPeer(c.peer);
    });
    peer.on("call", function (call) {
      call.answer(localStream || undefined);
      bindCall(call);
      if (localStream && call.peer !== calledPeerId) callPeer(call.peer); // 自动回拨，形成双向语音
    });
    peer.on("disconnected", function () {
      setConn("信令断开，重连中…", "err"); log("Peer 断开，尝试重连", "err");
      try { peer.reconnect(); } catch (e) {}
    });
    peer.on("close", function () {
      setConn("连接关闭，重建中…", "err"); log("Peer 关闭，重建", "err");
      scheduleReconnect();
    });
    peer.on("error", function (err) {
      if (err && err.type === "unavailable-id") {
        log("房号被占用，重新生成", "err");
        if (IS_HOST) {
          try { if (peer && peer.destroy) peer.destroy(); } catch (e) {}
          ROOM = genRoom(); setupPeer();
        }
        return;
      }
      if (err && err.type === "peer-unavailable") {
        log("房主暂不可达，重试中…", "err"); scheduleReconnect(); return;
      }
      log("Peer 错误：" + (err && err.type), "err");
      setConn("连接异常", "err");
    });
  }

  function connectToHost() {
    if (!ROOM) { setConn("无效房间号", "err"); return; }
    setConn("连接房主中…", "warn");
    try {
      var c = peer.connect(ROOM, { reliable: true });
      if (c) { conn = c; bindConn(c); }
    } catch (e) { scheduleReconnect(); }
  }

  function bindConn(c) {
    c.on("open", function () {
      setConn("已连接", "ok"); log("数据通道已打开");
      calledPeerId = null;
      if (state.role) send({ t: "hello", role: state.role });
      if (state.role === "candidate") send({ t: "req" });
      else if (state.role === "examiner") sendState();
      if (micOn) callPeer(IS_HOST ? (c.peer) : ROOM);
    });
    c.on("data", onData);
    c.on("close", function () {
      setConn("对端断开，重连中…", "err"); log("数据通道关闭", "err");
      conn = null; calledPeerId = null; scheduleReconnect();
    });
    c.on("error", function () { log("数据通道错误", "err"); });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectDelay = Math.min(reconnectDelay * 1.6, 8000);
    var delay = reconnectDelay;
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      log("尝试重连（延迟 " + delay + "ms）");
      calledPeerId = null;
      if (IS_HOST) {
        try { if (peer && peer.destroy) peer.destroy(); } catch (e) {}
        setupPeer();
      } else {
        if (peer && peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
        else if (!peer || peer.destroyed) { setupPeer(); }
        else { connectToHost(); }
      }
    }, delay);
  }

  function leaveRoom() {
    try { if (peer && peer.destroy) peer.destroy(); } catch (e) {}
    try { localStorage.removeItem(HOST_MARK); } catch (e) {}
    peer = null; conn = null; calledPeerId = null;
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    micOn = false;
    el.room.style.display = "none"; el.landing.style.display = "block";
    setConn("未连接", "");
    log("已离开房间");
  }

  // ---------- 考官控制 ----------
  function bindControls() {
    el.sendQBtn.addEventListener("click", function () {
      if (!QUESTIONS.length) { toast("题库未加载"); return; }
      state.qIndex = parseInt(el.qSelect.value, 10) || 0;
      showCandQuestion(); showExamAnswer(); saveCache();
      send({ t: "q", i: state.qIndex });
      toast("已发题给搭子");
    });
    el.qSelect.addEventListener("change", function () { showExamAnswer(); });
    Array.prototype.forEach.call(el.durRow.querySelectorAll(".dur-btn"), function (b) {
      b.addEventListener("click", function () {
        state.durationSec = parseInt(b.getAttribute("data-d"), 10);
        markDurActive(); saveCache();
      });
    });
    el.startBtn.addEventListener("click", function () {
      state.started = true; state.startTs = Date.now();
      el.startBtn.style.display = "none"; el.stopBtn.style.display = "inline-block";
      send({ t: "start", durationSec: state.durationSec, startTs: state.startTs });
      saveCache();
      toast("已开始，考生端倒计时同步启动");
    });
    el.stopBtn.addEventListener("click", function () {
      state.started = false;
      el.startBtn.style.display = "inline-block"; el.stopBtn.style.display = "none";
      send({ t: "stop" }); saveCache();
    });
    el.resetBtn.addEventListener("click", function () {
      state.checks = {}; renderChecklist(); updateCandScore(); saveCache();
      send({ t: "reset" });
      toast("评分已重置");
    });
    el.micBtn.addEventListener("click", startMic);
    el.leaveBtn.addEventListener("click", leaveRoom);
    el.copyBtn.addEventListener("click", function () {
      var url = location.origin + location.pathname + "?room=" + ROOM + (CITY !== "sz" ? "&city=" + CITY : "");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast("链接已复制，发给搭子"); },
          function () { toast(url); });
      } else { toast(url); }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".role-btn"), function (b) {
      b.addEventListener("click", function () { setRole(b.getAttribute("data-role")); });
    });
  }

  // ---------- 初始化 ----------
  function init() {
    if (ROOM) {
      IS_HOST = (localStorage.getItem(HOST_MARK) === "1"); // 刷新后可能是房主
      el.landing.style.display = "none";
      el.room.style.display = "block";
      el.roomNo.textContent = ROOM;
      el.wxHint.innerHTML = "📌 微信内点开可能不支持语音，可点右上角 ⋯ 选「在浏览器打开」。<br>🔊 双方都点一下「开启麦克风」才能互相听到。";
      setupPeer();
    } else {
      el.landing.style.display = "block";
      el.room.style.display = "none";
      el.createBtn.addEventListener("click", function () {
        el.landing.style.display = "none";
        el.room.style.display = "block";
        el.wxHint.innerHTML = "📌 微信内点开可能不支持语音，可点右上角 ⋯ 选「在浏览器打开」。<br>🔊 双方都点一下「开启麦克风」才能互相听到。";
        setupPeer();
      });
    }
    bindControls();
    loadQuestions(function () {
      renderQuestionOptions();
      if (state.role) setRole(state.role); // 刷新后恢复身份与打分进度
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
