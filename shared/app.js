// 规范化判断题：把 options.letter 与 answer 由"正确"/"错误"映射为 A/B，避免 UI 显示成"正确。正确"
(function(){
  function normBool(data){
    if(!data || !data.length) return data;
    data.forEach(function(q){
      if((q.type==="judge"||q.type==="bool") && q.options && q.options.length){
        var map={}; var opts=q.options;
        opts.forEach(function(o,i){
          var orig=String(o.letter||"").trim();
          map[orig] = (i===0?"A":"B");
          o.letter = map[orig];
        });
        var ans=String(q.answer||"").trim();
        if(map[ans]) q.answer=map[ans];
      }
    });
    return data;
  }
  if(window.DATA_WRITTEN) window.DATA_WRITTEN = normBool(window.DATA_WRITTEN);
  if(window.DATA_INTERVIEW) window.DATA_INTERVIEW = normBool(window.DATA_INTERVIEW);
  if(window.DATA) window.DATA = normBool(window.DATA);
})();
// 答案显示：判断题 A/B 映射回"正确"/"错误"
function displayAnswer(q){
  var ans = q.answer == null ? "" : String(q.answer).trim();
  if((q.type==="judge"||q.type==="bool") && ans.length===1){
    if(ans==="A") return "正确";
    if(ans==="B") return "错误";
  }
  return ans;
}
// 生成"回答正确/回答错误"文字判定横幅，消除纯颜色歧义（D 看似被标绿等误读）
function makeResultBanner(isCorrect, q){
  var d = document.createElement("div");
  d.className = "ans-result " + (isCorrect ? "ans-correct" : "ans-wrong");
  d.innerHTML = isCorrect
    ? "✅ 回答正确"
    : "❌ 回答错误，正确答案：<b>" + escapeHtml(displayAnswer(q)) + "</b>";
  return d;
}
// ============ 可配置项（优先读 window.SITE_CONFIG，由 template-config.json 生成；没有则用内联默认值）============
var CONFIG = window.SITE_CONFIG || {
  siteTitle: "辅警真题卡组",
  siteEmoji: "🚔",
  subtitle: "真实考试真题 · 笔试+面试 · 离线可用",
  logo: "",
  cover: "",
  themeColor: "#1e3a5f",
  contact: "",
  xianyuCode: "",
  promoTitle: "",
  promoText: "",
  rewardImage: "",
  rewardTitle: "打赏作者 · 支持开源",
  rewardDesc: "如果这个开源题库对你有帮助，请作者喝杯奶茶 ☕",
  footerText: "Powered by RCJ Exam Template",
  timerSeconds: 180,
  // 套题模考默认预设（可由 template-config.json 的 examPreset 覆盖，实现"一键标准卷"）
  examPreset: { label: "标准模考", single: 36, multi: 12, bool: 12, minutes: 60, typing: true, typingMinutes: 10 },
  // 打字题范文（套题模考附加项，不计入客观题分）
  typingText: "辅警是公安机关的重要辅助力量，承担着维护社会治安、服务人民群众的重要职责。每一位辅警都应当以高度的责任感和使命感，认真履行岗位职责，严格遵守工作纪律，做到忠诚、干净、担当，为建设平安中国贡献自己的力量。",
  enabledModules: { promo: true, xianyu: false, reward: false, progress: true, themeToggle: true, record: false },
  defaultPage: "written",
  // ===== 重新设计：真题优先 + 机考/非机考通用 =====
  brandName: "辅警真题卡组",
  cityName: "",            // 城市名，如 "深圳" / "惠州"
  examType: "paper",       // "computer" = 机考(套题模考为核心) | "paper" = 非机考
  examYear: "",            // 真题年份/区间，如 "2024-2026"
  realQuestions: true,     // 铁律：本站题目必须全部为真实考试真题，禁止拼凑/洗白
  realQuestionsNote: "本站题目全部为真实考试真题，无拼凑与洗白内容。",
  modules: { mockExam: true, targeted: true, random: true, written: true, interview: true }
};

// 数据来源：笔试 = window.DATA_WRITTEN，面试 = window.DATA_INTERVIEW；兜底 window.DATA（单文件模式）
var W_DATA = window.DATA_WRITTEN || [];
var I_DATA = window.DATA_INTERVIEW || [];
var G_DATA = window.DATA || [];

// 修复：数据源可能缺失 _idx 字段，导致卡片按钮 data-idx="undefined"、点击提交无反应
[W_DATA, I_DATA, G_DATA].forEach(function (arr) {
  if (!arr || !arr.length) return;
  arr.forEach(function (q, i) { if (q._idx == null) q._idx = i; });
});

var hasW = W_DATA.length > 0, hasI = I_DATA.length > 0;
var singleMode = null;
if (!hasW && !hasI && G_DATA.length) {
  var _s = G_DATA[0];
  singleMode = (_s && (_s.title !== undefined || _s.session !== undefined) && !_s.options) ? "interview" : "written";
}

function dataset() {
  if (MODE === "written") return hasW ? W_DATA : G_DATA;
  return hasI ? I_DATA : G_DATA;
}

// 默认模式：两库都在时，题量大的优先展示；否则展示存在的那个
var MODE = (hasW && hasI)
  ? (CONFIG.defaultPage === "interview" ? "interview" : "written")
  : (hasW ? "written" : (hasI ? "interview" : singleMode));

var TYPE_MAP = {
  "综合分析": { cls: "zhfx", label: "综合分析" },
  "应急应变": { cls: "yjyb", label: "应急应变" },
  "组织管理": { cls: "zzgl", label: "组织管理" },
  "自我认知与职位匹配": { cls: "zwrz", label: "自我认知" },
  "人际沟通": { cls: "rjgt", label: "人际沟通" }
};
var WRITTEN_TYPE_LABEL = { single: "单选题", multiple: "多选题", multi: "多选题", judge: "判断题", bool: "判断题", blank: "填空题", qa: "简答题" };
var TAG_MAP = {
  "高频": { cls: "gp", icon: "🔥" },
  "深圳特色": { cls: "sz", icon: "🏙️" },
  "热点": { cls: "rd", icon: "📌" },
  "必刷": { cls: "bs", icon: "⭐" },
  "常规": { cls: "cg", icon: "📋" }
};

// 标签统一成数组：面试 tags 是数组，笔试 tags 是空格分隔字符串
function normTags(q) {
  var t = q.tags;
  if (!t) return [];
  if (Array.isArray(t)) return t;
  return String(t).split(/\s+/).filter(Boolean);
}

// 掌握度存储：按 mode 隔离
var StorageCtrl = {
  key: function () { return "sso_status_" + MODE; },
  get: function () {
    try { return JSON.parse(localStorage.getItem(this.key())) || {}; } catch (e) { return {}; }
  },
  set: function (db) { try { localStorage.setItem(this.key(), JSON.stringify(db)); } catch (e) {} this.updateUI(); },
  updateUI: function () {
    var db = this.get();
    var data = dataset();
    var mc = 0;
    data.forEach(function (q) { if (db[q._idx] === "mastered") mc++; });
    var pct = data.length ? Math.round((mc / data.length) * 100) : 0;
    var pl = document.getElementById("progressLabel");
    var pp = document.getElementById("progressPercent");
    var pb = document.getElementById("progressBar");
    if (pl) pl.innerHTML = "📊 已掌握 <strong>" + mc + "</strong> / " + data.length + " 道题";
    if (pp) pp.textContent = pct + "%";
    if (pb) pb.style.width = pct + "%";
  }
};

function escapeHtml(text) {
  var d = document.createElement("div"); d.textContent = text == null ? "" : text; return d.innerHTML;
}
function escapeRegex(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function highlight(text, keyword) {
  var escaped = escapeHtml(text);
  if (!keyword) return escaped;
  try { var re = new RegExp("(" + escapeRegex(keyword) + ")", "gi"); return escaped.replace(re, "<mark>$1</mark>"); }
  catch (e) { return escaped; }
}
function formatAnswer(text, keyword) {
  var html = escapeHtml(text == null ? "" : text);
  if (keyword) { try { var re = new RegExp("(" + escapeRegex(keyword) + ")", "gi"); html = html.replace(re, "<mark>$1</mark>"); } catch (e) {} }
  return html.replace(/\n/g, "<br>");
}

// 题库维度（按 mode）
function activeDimensions() {
  return MODE === "interview"
    ? [{ key: "year", label: "年份" }, { key: "type", label: "题型" }, { key: "tag", label: "标签" }]
    : [{ key: "batch", label: "批次" }, { key: "type", label: "题型" }];
}
function deriveValues(dim) {
  var set = {}, data = dataset();
  data.forEach(function (q) {
    if (dim === "tag") { normTags(q).forEach(function (t) { if (TAG_MAP[t]) set[t] = 1; }); }
    else if (dim === "year") { if (q.year) set[q.year] = 1; }
    else if (dim === "batch") { if (q.batch) set[q.batch] = 1; }
    else if (dim === "type") { if (q.type) set[q.type] = 1; }
  });
  return Object.keys(set);
}
function dimLabel(dim, val) {
  if (dim === "type") return MODE === "interview" ? (TYPE_MAP[val] ? TYPE_MAP[val].label : val) : (WRITTEN_TYPE_LABEL[val] || val);
  return val;
}

var filterState = {};
var filterMark = false;
var PAGE_SIZE = 40;
var flatItems = [], renderedCount = 0, currentGroup = null, groupCounts = {}, totalShown = 0, currentSearch = "";
var PAGE_SIZE_I = PAGE_SIZE;

function groupKey(q) { return MODE === "interview" ? (q.year || "未注明年份") : (q.batch || "未注明批次"); }

function searchText(q) {
  if (MODE === "interview") return (q.title + " " + (q.answer || "") + " " + (q.session || "") + " " + normTags(q).join(" "));
  var opts = (q.options || []).map(function (o) { return o.text; }).join(" ");
  return (q.stem + " " + opts + " " + (q.answer || "") + " " + (q.explanation || "") + " " + (q.batch || "") + " " + normTags(q).join(" "));
}

function buildFilterRows() {
  var wrap = document.getElementById("filterRows");
  wrap.innerHTML = "";
  activeDimensions().forEach(function (d) {
    var row = document.createElement("div");
    row.className = "filter-row";
    var lab = document.createElement("span");
    lab.className = "filter-label"; lab.textContent = d.label;
    row.appendChild(lab);
    var btnsWrap = document.createElement("div");
    btnsWrap.className = "filter-btns";
    var all = document.createElement("button");
    all.className = "btn active"; all.dataset.dim = d.key; all.dataset.value = "all"; all.textContent = "全部";
    btnsWrap.appendChild(all);
    deriveValues(d.key).forEach(function (v) {
      var b = document.createElement("button");
      b.className = "btn"; b.dataset.dim = d.key; b.dataset.value = v; b.textContent = dimLabel(d.key, v);
      btnsWrap.appendChild(b);
    });
    row.appendChild(btnsWrap);
    wrap.appendChild(row);
  });
}

function computeFiltered() {
  var search = document.getElementById("searchInput").value.trim().toLowerCase();
  currentSearch = search;
  var data = dataset();
  var statusDB = StorageCtrl.get();
  var dims = activeDimensions();
  return data.filter(function (q) {
    for (var i = 0; i < dims.length; i++) {
      var d = dims[i], val = filterState[d.key] || "all";
      if (val === "all") continue;
      var ok;
      if (d.key === "tag") ok = normTags(q).indexOf(val) !== -1;
      else ok = (q[d.key] === val);
      if (!ok) return false;
    }
    if (filterMark && statusDB[q._idx] !== "not-mastered") return false;
    if (search && searchText(q).toLowerCase().indexOf(search) === -1) return false;
    return true;
  });
}

function tagBadgesHtml(q) {
  if (MODE === "written") return "";   // 笔试批次/题型已在卡片别处展示，隐藏标签避免冗余
  var h = "";
  normTags(q).forEach(function (t) {
    var ti = TAG_MAP[t];
    if (ti) h += '<span class="tag-badge tag-' + ti.cls + '">' + ti.icon + " " + escapeHtml(t) + "</span>";
    else h += '<span class="tag-badge tag-default">' + escapeHtml(t) + "</span>";
  });
  return h;
}
function answerSection(html) {
  return '<div class="answer-section"><div class="answer-title">📝 ' + (MODE === "interview" ? "参考答案" : "答案与解析") + '</div><div class="answer-content">' + html + "</div></div>";
}
function frameworkHtml(q) {
  if (!q || !q.framework) return "";
  var lines = String(q.framework).split("\n");
  var inner = lines.map(function (l) { return '<div class="fw-line">' + escapeHtml(l) + "</div>"; }).join("");
  return '<div class="framework-box"><div class="fw-title">🧩 结构化思路</div>' + inner + "</div>";
}

function cardHtml(q) {
  var badges, titleHtml, bodyInner;
  if (MODE === "interview") {
    var ti = TYPE_MAP[q.type] || { cls: "zhfx", label: q.type };
    badges = '<span class="badge badge-type-' + ti.cls + '">📝 ' + escapeHtml(ti.label) + "</span>"
      + (q.year ? '<span class="badge badge-year">' + escapeHtml(q.year) + "</span>" : "")
      + (q.session ? '<span class="badge badge-session">' + escapeHtml(q.session) + "</span>" : "")
      + tagBadgesHtml(q);
    titleHtml = highlight(q.title || "", currentSearch);
    bodyInner = answerSection(frameworkHtml(q) + formatAnswer(q.answer || "（暂无参考答案）", currentSearch));
  } else {
    var wl = WRITTEN_TYPE_LABEL[q.type] || q.type;
    badges = (q.num != null ? '<span class="badge badge-year">#' + q.num + "</span>" : "")
      + (q.batch ? '<span class="badge badge-session">' + escapeHtml(q.batch) + "</span>" : "")
      + '<span class="badge badge-type-zhfx">📝 ' + escapeHtml(wl) + "</span>"
      + tagBadgesHtml(q);
    titleHtml = highlight(q.stem || "", currentSearch);
    var optsHtml = "";
    if (q.options && q.options.length) {
      q.options.forEach(function (o) {
        optsHtml += '<div class="opt-row study-opt" data-idx="' + q._idx + '" data-letter="' + escapeHtml(o.letter) + '"><span class="opt-letter">' + escapeHtml(o.letter) + ".</span><span>" + escapeHtml(o.text) + "</span></div>";
      });
    }
    var ansHtml = "<div>答案：<b>" + escapeHtml(displayAnswer(q)) + "</b></div>";
    if (q.explanation) ansHtml += '<div style="margin-top:10px">解析：' + formatAnswer(q.explanation, currentSearch) + "</div>";
    bodyInner = (optsHtml ? '<div style="margin:12px 0">' + optsHtml + "</div>" : "")
      + '<div class="study-check"><button type="button" class="study-check-btn" data-idx="' + q._idx + '" onclick="revealStudyAnswer(' + q._idx + ')">✅ 提交答案</button></div>'
      + '<div class="study-answer" id="ans' + q._idx + '" style="display:none">' + answerSection(ansHtml) + "</div>";
  }
  var statusDB = StorageCtrl.get();
  var cur = statusDB[q._idx] || "not-mastered";
  var actNM = cur === "not-mastered" ? "active" : "";
  var actM = cur === "mastered" ? "active" : "";
  return '<div class="card" id="q' + q._idx + '"><div class="card-header"><div class="card-left"><div class="card-badges">' + badges + '</div><div class="card-title">' + titleHtml + '</div></div><span class="arrow">▼</span></div>'
    + '<div class="card-body"><div class="card-body-inner"><div class="hint-bar"><span>' + (MODE === "interview" ? "💡 先自我作答，再展开参考答案。" : "💡 选择答案后，点「提交答案」查看对错与解析。") + '</span>'
    + '<div class="study-actions"><button class="study-btn not-mastered ' + actNM + '" onclick="changeTrack(event,' + q._idx + ",'not-mastered')\">❌ 仍需练习</button>"
    + '<button class="study-btn mastered ' + actM + '" onclick="changeTrack(event,' + q._idx + ",'mastered')\">🟢 已掌握</button></div></div>"
    + bodyInner + "</div></div></div>";
}

function render() {
  if (document.getElementById("examBtn")) {
    var _showExam = (MODE !== "interview") && CONFIG.modules && CONFIG.modules.mockExam;
    document.getElementById("examBtn").style.display = _showExam ? "" : "none";
  }
  var list = computeFiltered();
  flatItems = list; totalShown = list.length; renderedCount = 0; currentGroup = null; groupCounts = {};
  if (MODE === "interview") flatItems.sort(function (a, b) { return String(b.year || "").localeCompare(String(a.year || "")); });
  flatItems.forEach(function (q) { var g = groupKey(q); groupCounts[g] = (groupCounts[g] || 0) + 1; });
  var container = document.getElementById("questionsList");
  if (flatItems.length === 0) { container.innerHTML = '<div class="no-result">🔍 未找到匹配的题目，请调整筛选条件</div>'; hideLoadMore(); updateCount(); return; }
  container.innerHTML = "";
  appendBatch();
}

function appendBatch() {
  var container = document.getElementById("questionsList");
  var end = Math.min(renderedCount + PAGE_SIZE, flatItems.length);
  var html = "";
  for (var i = renderedCount; i < end; i++) {
    var q = flatItems[i], g = groupKey(q);
    if (g !== currentGroup) {
      if (currentGroup !== null) html += "</div>";
      currentGroup = g;
      html += '<div class="year-section"><h2 class="year-title">' + escapeHtml(g) + ' <span class="year-count">' + (groupCounts[g] || 0) + "道</span></h2>";
    }
    html += cardHtml(q);
  }
  container.insertAdjacentHTML("beforeend", html);
  renderedCount = end;
  if (renderedCount >= flatItems.length) {
    if (currentGroup !== null) { container.insertAdjacentHTML("beforeend", "</div>"); currentGroup = null; }
    hideLoadMore();
  } else showLoadMore();
  updateCount();
}
function loadAll() { while (renderedCount < flatItems.length) appendBatch(); }

function updateCount() {
  var el = document.getElementById("resultCount");
  if (!el) return;
  var tail = totalShown < dataset().length ? "（筛选后 " + totalShown + "）" : "";
  el.innerHTML = "显示 <strong>" + renderedCount + "</strong>/" + dataset().length + " 道" + tail;
}
function showLoadMore() { document.getElementById("loadMoreWrap").style.display = "block"; }
function hideLoadMore() { document.getElementById("loadMoreWrap").style.display = "none"; }

function changeTrack(e, idx, status) {
  e.stopPropagation();
  var db = StorageCtrl.get();
  db[idx] = status;
  StorageCtrl.set(db);
  var pNode = e.target.parentElement;
  pNode.querySelectorAll(".study-btn").forEach(function (b) { b.classList.remove("active"); });
  e.target.classList.add("active");
}

function updateStats() {
  var data = dataset();
  var dimKey = MODE === "interview" ? "year" : "batch";
  var dimSet = {}, typeSet = {};
  data.forEach(function (q) { if (q[dimKey]) dimSet[q[dimKey]] = 1; if (q.type) typeSet[q.type] = 1; });
  document.getElementById("statNum0").textContent = data.length;
  document.getElementById("statLabel0").textContent = "真题数";
  document.getElementById("statNum1").textContent = Object.keys(dimSet).length;
  document.getElementById("statLabel1").textContent = MODE === "interview" ? "覆盖年份" : "覆盖批次";
  document.getElementById("statNum2").textContent = Object.keys(typeSet).length;
  document.getElementById("statLabel2").textContent = "题型分类";
}

function buildModeTabs() {
  var box = document.getElementById("modeTabs");
  box.innerHTML = "";
  var tabs = [];
  if (hasW || singleMode === "written") tabs.push({ m: "written", label: "📖 笔试真题" });
  if (hasI || singleMode === "interview") tabs.push({ m: "interview", label: "🎤 面试真题" });
  if (tabs.length <= 1) { box.style.display = "none"; return; }
  box.style.display = "inline-flex";
  tabs.forEach(function (t) {
    var b = document.createElement("button");
    b.className = "mode-tab" + (t.m === MODE ? " active" : "");
    b.dataset.mode = t.m; b.textContent = t.label;
    b.addEventListener("click", function () { switchMode(t.m); });
    box.appendChild(b);
  });
}

function switchMode(m) {
  if (m === "written" && !hasW && singleMode !== "written") return;
  if (m === "interview" && !hasI && singleMode !== "interview") return;
  MODE = m;
  filterState = {};
  buildModeTabs();
  buildFilterRows();
  updateStats();
  StorageCtrl.updateUI();
  render();
  window.scrollTo({ top: 0 });
}

// 按板块刷：先作答、后核对（不直接给答案）
function studyQuestionByIdx(idx) {
  var data = dataset();
  for (var i = 0; i < data.length; i++) if (data[i]._idx === idx) return data[i];
  return null;
}
function revealStudyAnswer(idx) {
  console.log("[提交] revealStudyAnswer called, idx=", idx);
  try {
  var q = studyQuestionByIdx(idx); if (!q) return;
  var card = document.getElementById("q" + idx);
  var selLetters = [];
  card.querySelectorAll(".study-opt.selected").forEach(function (o) { selLetters.push(o.dataset.letter); });
  var btn = card.querySelector(".study-check-btn");
  var ansEl = document.getElementById("ans" + idx);
  // 未选择则提示，不判分、不展开
  if (selLetters.length === 0) {
    if (btn) { var orig = btn.textContent; btn.textContent = "⚠️ 请先选择答案"; setTimeout(function () { btn.textContent = orig; }, 1200); }
    return;
  }
  card.querySelectorAll(".study-opt").forEach(function (o) {
    var L = o.dataset.letter;
    var isCorr = q.answer != null && String(q.answer).indexOf(L) !== -1;
    var sel = o.classList.contains("selected");
    if (sel) o.classList.add(isCorr ? "ok" : "bad");
    else if (isCorr) o.classList.add("right");
    o.classList.add("locked");
  });
  ansEl.style.display = "block";
  // 文字判定横幅（先移除旧横幅，避免反复展开时重复）
  var oldB = ansEl.querySelector(".ans-result"); if (oldB) oldB.remove();
  var isCorrect;
  if (q.type === "multi" || q.type === "multiple") {
    var ansArr = normAnsArr(q.answer).slice().sort().join("");
    isCorrect = selLetters.slice().sort().join("") === ansArr && selLetters.length > 0;
  } else {
    isCorrect = selLetters.length === 1 && String(selLetters[0]).trim() === String(q.answer).trim();
  }
  ansEl.insertBefore(makeResultBanner(isCorrect, q), ansEl.firstChild);
  if (btn) btn.style.display = "none";
 } catch (err) {
    console.error("revealStudyAnswer error (idx=" + idx + "):", err);
    var _ansEl = document.getElementById("ans" + idx);
    if (_ansEl) { _ansEl.style.display = "block"; _ansEl.innerHTML = '<div class="ans-result ans-wrong">⚠️ 答案显示异常，请刷新页面重试（错误：' + escapeHtml(String(err && err.message || err)) + '）</div>' + _ansEl.innerHTML; }
 }
}
document.getElementById("questionsList").addEventListener("click", function (e) {
  var header = e.target.closest(".card-header");
  if (header) { header.parentElement.classList.toggle("open"); return; }
  var opt = e.target.closest(".study-opt");
  if (opt) {
    if (opt.classList.contains("locked")) return;
    var card = opt.closest(".card");
    var idx = parseInt(opt.dataset.idx, 10);
    var q = studyQuestionByIdx(idx);
    if (!q) return;
    console.log("[选项点击] idx=", idx, "type=", q.type, "letter=", opt.dataset.letter);
    if (q.type === "multi" || q.type === "multiple") {
      // 多选：先多选，点「提交答案」再判
      opt.classList.toggle("selected");
    } else {
      // 单选/判断：点选项选中（取消其他），点「提交答案」再判
      card.querySelectorAll(".study-opt").forEach(function (o) { o.classList.remove("selected"); });
      opt.classList.add("selected");
    }
    return;
  }
  var btn = e.target.closest(".study-check-btn");
  if (btn) { console.log("[事件委托-提交] btn idx=", btn.dataset.idx); revealStudyAnswer(parseInt(btn.dataset.idx, 10)); }
});
document.getElementById("filterRows").addEventListener("click", function (e) {
  var btn = e.target.closest(".btn");
  if (!btn) return;
  var dim = btn.dataset.dim, val = btn.dataset.value;
  filterState[dim] = val;
  this.querySelectorAll('.btn[data-dim="' + dim + '"]').forEach(function (b) { b.classList.remove("active"); });
  btn.classList.add("active");
  render();
});
document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("loadMoreBtn").addEventListener("click", appendBatch);
document.getElementById("expandAll").addEventListener("click", function () { loadAll(); document.querySelectorAll(".card").forEach(function (c) { c.classList.add("open"); }); });
document.getElementById("collapseAll").addEventListener("click", function () { document.querySelectorAll(".card").forEach(function (c) { c.classList.remove("open"); }); });

// 顶部宣传 banner
(function () {
  var banner = document.getElementById("promoBanner");
  var KEY = "sso_promo_closed";
  try { if (localStorage.getItem(KEY) === "1") banner.style.display = "none"; } catch (e) {}
  document.getElementById("promoClose").addEventListener("click", function () {
    banner.style.display = "none";
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
  });
  var xb = document.getElementById("promoXianyu");
  xb.addEventListener("click", function () {
    var t = CONFIG.xianyuCode;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () {
        xb.textContent = "✅ 已复制：" + t;
        setTimeout(function () { xb.textContent = "📋 复制作者ID：" + t; }, 2000);
      });
    } else { xb.textContent = "作者ID：" + t; }
  });
})();

// 全真考场倒计时
var testTimer = null, timerLimit = CONFIG.timerSeconds, timerRemaining = CONFIG.timerSeconds;
function startTimerCountdown() {
  clearInterval(testTimer);
  timerRemaining = timerLimit;
  var fillEl = document.getElementById("timerBarFill");
  var textEl = document.getElementById("timerDigits");
  fillEl.classList.remove("warning"); fillEl.style.width = "100%";
  testTimer = setInterval(function () {
    timerRemaining--;
    var m = Math.floor(timerRemaining / 60), s = timerRemaining % 60;
    textEl.textContent = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    fillEl.style.width = (timerRemaining / timerLimit) * 100 + "%";
    if (timerRemaining <= 30) fillEl.classList.add("warning");
    if (timerRemaining <= 0) { clearInterval(testTimer); textEl.textContent = "00:00 - 时间到！"; }
  }, 1000);
}
function stopTimerCountdown() { clearInterval(testTimer); }

// 录音（仅面试模式）
var mediaRecorder = null, audioChunks = [], recordBtn = document.getElementById("recordCtrlBtn");
var audioPlayer = document.getElementById("localAudioPlayer");
var transcriptBox = document.getElementById("transcriptBox");
var transcriptContent = document.getElementById("transcriptContent");
var transcriptNote = document.getElementById("transcriptNote");
var SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition || null;
var speechRecognizer = null, finalTranscript = "";

function initSpeechRecognizer() {
  if (!SpeechRecognitionImpl) {
    transcriptNote.textContent = "当前浏览器不支持语音转文字（常见于 iOS Safari / 微信内置浏览器），仅保留录音回听功能";
    transcriptNote.style.display = "block";
    return null;
  }
  var rec = new SpeechRecognitionImpl();
  rec.lang = "zh-CN"; rec.continuous = true; rec.interimResults = true;
  rec.onresult = function (e) {
    var interim = "";
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var text = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += text; else interim += text;
    }
    transcriptContent.innerHTML = escapeHtml(finalTranscript) + '<span class="transcript-interim">' + escapeHtml(interim) + "</span>";
  };
  rec.onerror = function (e) {
    var msg = "";
    if (e.error === "network") msg = "⚠️ 网络无法连接语音识别服务（国内网络常见，需科学上网），文字转写暂不可用，但录音回听不受影响";
    else if (e.error === "not-allowed" || e.error === "service-not-allowed") msg = "⚠️ 麦克风/语音识别权限被拒绝，请检查浏览器权限设置";
    else if (e.error === "no-speech") msg = "";
    else msg = "⚠️ 语音转文字暂时出错（" + e.error + "），不影响录音回听";
    if (msg) { transcriptNote.textContent = msg; transcriptNote.style.display = "block"; }
  };
  rec.onend = function () { if (mediaRecorder && mediaRecorder.state === "recording") { try { rec.start(); } catch (e) {} } };
  return rec;
}
function initAudioRecorderSystem() {
  recordBtn.onclick = function () {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        audioChunks = []; mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = function (e) { audioChunks.push(e.data); };
        mediaRecorder.onstop = function () {
          var audioBlob = new Blob(audioChunks);
          audioPlayer.src = URL.createObjectURL(audioBlob);
          audioPlayer.style.display = "block";
        };
        mediaRecorder.start();
        recordBtn.textContent = "⏹️ 停止录音并回听"; recordBtn.className = "record-ctrl-btn recording";
        finalTranscript = ""; transcriptContent.innerHTML = ""; transcriptBox.classList.add("show"); transcriptNote.style.display = "none";
        speechRecognizer = initSpeechRecognizer();
        if (speechRecognizer) { try { speechRecognizer.start(); } catch (e) {} }
      }).catch(function (err) {
        alert("麦克风调用失败！请确保已授予麦克风权限，或在 HTTPS 线上安全环境打开网站。本地双击部分浏览器受安全策略限制不可直接调用录音。");
      });
    } else {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(function (t) { t.stop(); });
      recordBtn.textContent = "🎙️ 开始录音演练"; recordBtn.className = "record-ctrl-btn idle";
      if (speechRecognizer) { try { speechRecognizer.onend = null; speechRecognizer.stop(); } catch (e) {} }
    }
  };
}
function resetAudioRecorderUI() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(function (t) { t.stop(); }); }
  if (speechRecognizer) { try { speechRecognizer.onend = null; speechRecognizer.stop(); } catch (e) {} }
  recordBtn.textContent = "🎙️ 开始录音演练"; recordBtn.className = "record-ctrl-btn idle";
  audioPlayer.src = ""; audioPlayer.style.display = "none";
  transcriptBox.classList.remove("show"); transcriptContent.innerHTML = ""; finalTranscript = "";
}

// 随机抽题
var randomModal = document.getElementById("randomModal");
var currentRandomQ = null;

function randomBadgesHtml(q) {
  var html = "";
  if (MODE === "interview") {
    var ti = TYPE_MAP[q.type] || { cls: "zhfx", label: q.type };
    html += '<span class="badge badge-type-' + ti.cls + '">📝 ' + escapeHtml(ti.label) + "</span>";
    if (q.year) html += '<span class="badge badge-year">' + escapeHtml(q.year) + "</span>";
    if (q.session) html += '<span class="badge badge-session">' + escapeHtml(q.session) + "</span>";
    html += tagBadgesHtml(q);
  } else {
    if (q.num != null) html += '<span class="badge badge-year">#' + q.num + "</span>";
    if (q.batch) html += '<span class="badge badge-session">' + escapeHtml(q.batch) + "</span>";
    var wl = WRITTEN_TYPE_LABEL[q.type] || q.type;
    html += '<span class="badge badge-type-zhfx">📝 ' + escapeHtml(wl) + "</span>";
    html += tagBadgesHtml(q);
  }
  return html;
}
function randomQuestionHtml(q) {
  if (MODE === "interview") return escapeHtml(q.title || "");
  var h = escapeHtml(q.stem || "");
  if (q.options && q.options.length) {
    h += '<div style="margin-top:12px">';
    q.options.forEach(function (o) {
      h += '<div class="opt-row rand-opt" data-rand-letter="' + escapeHtml(o.letter) + '"><span class="opt-letter">' + escapeHtml(o.letter) + ".</span><span>" + escapeHtml(o.text) + "</span></div>";
    });
    h += "</div>";
  }
  if (MODE !== "interview") {
    h += '<div class="random-modal-hint" style="margin-top:12px;margin-bottom:0;font-size:13px;padding:10px 12px;">💡 选择答案后，点击下方「提交答案」查看对错</div>';
  }
  return h;
}
function randomAnswerHtml(q) {
  if (MODE === "interview") return frameworkHtml(q) + formatAnswer(q.answer || "（暂无参考答案）", "");
  var h = "<div>答案：<b>" + escapeHtml(displayAnswer(q)) + "</b></div>";
  if (q.explanation) h += '<div style="margin-top:10px">解析：' + formatAnswer(q.explanation, "") + "</div>";
  return h;
}
function showRandomQuestion() {
  resetAudioRecorderUI();
  startTimerCountdown();
  var rb = document.getElementById("randomResultBanner"); if (rb) rb.remove();
  var data = dataset();
  if (!data.length) return;
  var q = data[Math.floor(Math.random() * data.length)];
  currentRandomQ = q;
  var submitBtn = document.getElementById("randomModalSubmit");
  if (submitBtn) submitBtn.style.display = (MODE === "interview") ? "none" : "";
  document.getElementById("audioRecorderZone").style.display = (MODE === "interview" && _mRecord) ? "block" : "none";
  document.getElementById("randomModalBadges").innerHTML = randomBadgesHtml(q);
  document.getElementById("randomModalQuestion").innerHTML = randomQuestionHtml(q);
  document.getElementById("randomModalAnswerContent").innerHTML = randomAnswerHtml(q);
  if (MODE === "interview") document.getElementById("randomModalAnswer").classList.add("show");
  else document.getElementById("randomModalAnswer").classList.remove("show");
  randomModal.classList.add("show");
}
document.getElementById("randomBtn").addEventListener("click", showRandomQuestion);
function revealRandomAnswer() {
  var q = currentRandomQ;
  if (!q || q.answer == null) return;
  document.querySelectorAll("#randomModalQuestion .opt-row.rand-opt").forEach(function (o) {
    var letter = o.dataset.randLetter;
    var isCorrect = String(q.answer).indexOf(letter) !== -1 || String(q.answer).indexOf(o.children[1].textContent) !== -1;
    if (isCorrect) o.classList.add("right");
  });
  document.getElementById("randomModalAnswer").classList.add("show");
  stopTimerCountdown();
}
function gradeRandomSelection() {
  var q = currentRandomQ;
  if (!q || q.answer == null) return;
  var opts = document.querySelectorAll("#randomModalQuestion .opt-row.rand-opt");
  var selLetters = [];
  opts.forEach(function (o) {
    if (o.classList.contains("selected")) selLetters.push(o.dataset.randLetter);
  });
  if (selLetters.length === 0) {
    var btn = document.getElementById("randomModalSubmit");
    if (btn) { var orig = btn.textContent; btn.textContent = "⚠️ 请先选择答案"; setTimeout(function () { btn.textContent = orig; }, 1200); }
    return;
  }
  opts.forEach(function (o) {
    o.classList.add("locked");
    var letter = o.dataset.randLetter;
    var isCorr = String(q.answer).indexOf(letter) !== -1 || String(q.answer).indexOf(o.children[1].textContent) !== -1;
    var sel = o.classList.contains("selected");
    if (sel) o.classList.add(isCorr ? "ok" : "bad");
    else if (isCorr) o.classList.add("right");
  });
  var ansArr = normAnsArr(q.answer).slice().sort().join("");
  var isCorrect = selLetters.slice().sort().join("") === ansArr;
  revealRandomAnswer();
  var ac = document.getElementById("randomModalAnswerContent");
  var rb = document.getElementById("randomResultBanner"); if (rb) rb.remove();
  var banner = makeResultBanner(isCorrect, q); banner.id = "randomResultBanner";
  ac.insertBefore(banner, ac.firstChild);
  var submitBtn = document.getElementById("randomModalSubmit");
  if (submitBtn) submitBtn.style.display = "none";
}
document.getElementById("randomModalQuestion").addEventListener("click", function (e) {
  var opt = e.target.closest(".opt-row.rand-opt");
  if (!opt || opt.classList.contains("locked")) return;
  var q = currentRandomQ;
  if (!q) return;
  if (q.type === "multi" || q.type === "multiple") {
    opt.classList.toggle("selected");
  } else {
    // 单选/判断：选中该项（取消其他），点「提交答案」再判
    document.querySelectorAll("#randomModalQuestion .opt-row.rand-opt").forEach(function (o) { o.classList.remove("selected"); });
    opt.classList.add("selected");
  }
});
document.getElementById("randomModalSubmit").addEventListener("click", gradeRandomSelection);
document.getElementById("randomModalNext").addEventListener("click", showRandomQuestion);
function closeRandomModal() { randomModal.classList.remove("show"); stopTimerCountdown(); resetAudioRecorderUI(); }
document.getElementById("randomModalClose").addEventListener("click", closeRandomModal);
document.getElementById("randomModalDone").addEventListener("click", closeRandomModal);
randomModal.addEventListener("click", function (e) { if (e.target === randomModal) closeRandomModal(); });

// 闲鱼口令
var XIANYU_CODE = CONFIG.xianyuCode;
function copyToClipboard(text) {
  return new Promise(function (resolve) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { resolve(true); }).catch(function () { resolve(fallbackCopy(text)); });
    } else resolve(fallbackCopy(text));
  });
}
function fallbackCopy(text) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px"; ta.style.top = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    var ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
  } catch (e) { return false; }
}
var xianyuOverlay = document.getElementById("xianyuToastOverlay");
document.getElementById("downloadOfflineBtn").addEventListener("click", function () {
  copyToClipboard(XIANYU_CODE).then(function (ok) {
    var c = document.getElementById("xtCopied");
    if (ok) c.classList.add("show"); else c.classList.remove("show");
    xianyuOverlay.classList.add("show");
  });
});
document.getElementById("xtOpenBtn").addEventListener("click", function () {
  copyToClipboard(XIANYU_CODE);
  try { window.location.href = "fleamarket://searchresult?q=" + encodeURIComponent(XIANYU_CODE); } catch (e) {}
});
document.getElementById("xtCloseBtn").addEventListener("click", function () { xianyuOverlay.classList.remove("show"); });
xianyuOverlay.addEventListener("click", function (e) { if (e.target === xianyuOverlay) xianyuOverlay.classList.remove("show"); });

// 打赏弹层逻辑（reward 模块：显示赞赏码图片）
var rewardOverlay = document.getElementById("rewardToastOverlay");
document.getElementById("rewardBtn").addEventListener("click", function () { rewardOverlay.classList.add("show"); });
document.getElementById("rewardCloseBtn").addEventListener("click", function () { rewardOverlay.classList.remove("show"); });
rewardOverlay.addEventListener("click", function (e) { if (e.target === rewardOverlay) rewardOverlay.classList.remove("show"); });

// 回到顶部 / 主题
var backToTop = document.getElementById("backToTop");
window.addEventListener("scroll", function () { if (window.scrollY > 400) backToTop.classList.add("show"); else backToTop.classList.remove("show"); });
backToTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
var themeToggle = document.getElementById("themeToggle");
var savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") { document.documentElement.setAttribute("data-theme", "dark"); themeToggle.textContent = "☀️"; }
themeToggle.addEventListener("click", function () {
  var cur = document.documentElement.getAttribute("data-theme");
  if (cur === "dark") { document.documentElement.removeAttribute("data-theme"); themeToggle.textContent = "🌙"; localStorage.setItem("theme", "light"); }
  else { document.documentElement.setAttribute("data-theme", "dark"); themeToggle.textContent = "☀️"; localStorage.setItem("theme", "dark"); }
});

// 全屏 / 专注刷题模式
(function () {
  var focusBtn = document.getElementById("focusModeBtn");
  var focusToggle = document.getElementById("focusToggle");
  if (!focusBtn || !focusToggle) return;
  function setFocus(on) {
    document.body.classList.toggle("focus-mode", on);
    var txt = on ? "🖥️ 退出全屏" : "🖥️ 全屏刷题";
    focusBtn.textContent = txt;
    focusToggle.textContent = txt;
    focusToggle.style.display = on ? "block" : "none";
    try { localStorage.setItem("focusMode", on ? "1" : ""); } catch (e) {}
  }
  focusBtn.addEventListener("click", function () { setFocus(!document.body.classList.contains("focus-mode")); });
  focusToggle.addEventListener("click", function () { setFocus(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("focus-mode")) setFocus(false);
  });
  var _saved = null;
  try { _saved = localStorage.getItem("focusMode"); } catch (e) {}
  if (_saved) setFocus(true);
})();

// 只看未掌握 / 快捷键
(function () {
  var markModeBtn = document.getElementById("markModeBtn");
  markModeBtn.addEventListener("click", function () {
    filterMark = !filterMark;
    markModeBtn.classList.toggle("active", filterMark);
    render();
  });
  function currentQuestions() {
    var search = document.getElementById("searchInput").value.trim().toLowerCase();
    var statusDB = StorageCtrl.get();
    return dataset().filter(function (q) {
      var ok = true;
      activeDimensions().forEach(function (d) {
        var val = filterState[d.key] || "all";
        if (val === "all") return;
        ok = ok && (d.key === "tag" ? normTags(q).indexOf(val) !== -1 : q[d.key] === val);
      });
      if (!ok) return false;
      if (filterMark && statusDB[q._idx] !== "not-mastered") return false;
      if (search && searchText(q).toLowerCase().indexOf(search) === -1) return false;
      return true;
    });
  }
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if (k === "escape") { if (randomModal.classList.contains("show")) closeRandomModal(); return; }
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (k === "r" || k === "n") { e.preventDefault(); if (randomModal.classList.contains("show")) showRandomQuestion(); else document.getElementById("randomBtn").click(); }
  });
})();

// 撒花（答对/标记掌握时的正向反馈，纯视觉、无音效）
(function () {
  function playConfetti() {
    var emojis = ["🎉", "⭐", "💡", "✅", "🔥", "🏆", "💪", "🌟"];
    for (var i = 0; i < 18; i++) {
      var s = document.createElement("div"); s.className = "fx-confetti";
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
      s.style.fontSize = (14 + Math.random() * 14) + "px";
      document.body.appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 2800); })(s);
    }
  }
  function celebrate() { playConfetti(); }
  var _ct = changeTrack;
  changeTrack = function (e, idx, status) { _ct(e, idx, status); if (status === "mastered") celebrate(); };
})();

// ====== 套题模考模式（抽题 → 作答 → 提交判分）======
var examActive = false, examGraded = false, examSelections = {};
var examView = document.getElementById("examView");
var examQuestions = document.getElementById("examQuestions");
var examResult = document.getElementById("examResult");
var examSubmitBtn = document.getElementById("examSubmitBtn");

// ===== 套题模考 · 出卷器 =====
var examPaperList = [], examPaperMeta = null, examLastCfg = null;
var examMinutesSet = 60, examTypingOn = false, examTypingMinutes = 10;
var examTimer = null, examTimerRemaining = 0, examTimerLimit = 0;
function normType(t){ t = String(t||"").toLowerCase(); if(t==="multiple"||t==="multi"||t==="多选题") return "multi"; if(t==="judge"||t==="bool"||t==="判断"||t==="判断题") return "bool"; return "single"; }
function typeLabel(t){ return t==="multi"?"多选":(t==="bool"?"判断":"单选"); }
function shuffleArr(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var x=a[i];a[i]=a[j];a[j]=x; } return a; }
function scopeKey(){ return (MODE==="interview") ? "year" : "batch"; }
function scopeLabel(v){
  if(v==="__random__") return "🎲 随机抽一套";
  if(v==="__all__") return "📚 全库随机抽题";
  if(MODE==="interview") return (v?("年份 "+v):"未注明");
  return (v||"未注明")+" 批";
}
function typesText(tc){
  var parts=[];
  ["single","multi","bool"].forEach(function(t){ if(tc[t]) parts.push(typeLabel(t)+" "+tc[t]); });
  return parts.join(" · ");
}
// 按题型精确出题：单/多/判各取指定数量，题库不足时按上限抽并提示
function buildExamPaperByType(counts){
  var data = dataset();
  var byType = { single: [], multi: [], bool: [] };
  data.forEach(function(q){ var t = normType(q.type); if (byType[t]) byType[t].push(q); });
  var chosen = [], per = { single:0, multi:0, bool:0 }, shortage = [];
  ["single","multi","bool"].forEach(function(t){
    var want = counts[t] || 0;
    var pool = byType[t].slice(); shuffleArr(pool);
    var take = Math.min(want, pool.length);
    if (want > 0 && take < want) shortage.push(typeLabel(t) + "仅有 " + pool.length + " 题（少于设定 " + want + "）");
    per[t] = take;
    chosen = chosen.concat(pool.slice(0, take));
  });
  shuffleArr(chosen);
  return { list: chosen, meta: { per: per, shortage: shortage } };
}
// 按出现顺序取出卷批次列表
function getBatchesInOrder(){
  var seen = [], map = {};
  dataset().forEach(function(q){ var b = q.batch || "未注明"; if(!map[b]){ map[b] = true; seen.push(b); } });
  return seen;
}
function countByType(list){
  var per = { single:0, multi:0, bool:0 };
  list.forEach(function(q){ var t = normType(q.type); if (per[t] !== undefined) per[t]++; });
  return per;
}
// 根据出卷配置重新生成试卷（batch=整套真题 / random=按题型随机）
function rebuildPaper(cfg){
  if (cfg.plan === "batch") {
    var list = dataset().filter(function(q){ return (q.batch || "未注明") === cfg.batch; });
    return { list: list, meta: { per: countByType(list), shortage: [] } };
  }
  return buildExamPaperByType(cfg.counts);
}
// 切换出卷方式：显示/隐藏批次选择 or 题型数量
function toggleExamPlan(){
  var plan = document.getElementById("examPlanMode").value;
  document.getElementById("examBatchRow").style.display = (plan === "batch") ? "" : "none";
  document.getElementById("examCountGrid").style.display = (plan === "random") ? "" : "none";
  refreshExamInfo();
}
function populateExamBatches(){
  var sel = document.getElementById("examBatch");
  var batches = getBatchesInOrder();
  sel.innerHTML = batches.map(function(b){
    var n = dataset().filter(function(q){ return (q.batch || "未注明") === b; }).length;
    return '<option value="' + escapeHtml(b) + '">' + escapeHtml(b) + ' 批 · ' + n + '题</option>';
  }).join("");
}
function openExamSetup(){
  examActive = true;
  populateExamSetup();
  populateExamBatches();
  toggleExamPlan();
  document.getElementById("examSetupOverlay").style.display = "flex";
}
function populateExamSetup(){
  applyExamPreset();
}
function applyExamPreset(){
  var p = CONFIG.examPreset || { label:"标准模考", single:36, multi:12, bool:12, minutes:60, typing:true, typingMinutes:10 };
  document.getElementById("cntSingle").value = p.single;
  document.getElementById("cntMulti").value = p.multi;
  document.getElementById("cntBool").value = p.bool;
  document.getElementById("typingOn").checked = !!p.typing;
  document.getElementById("examMinutesTyping").value = p.typingMinutes || 10;
  document.getElementById("examPresetLabel").textContent = p.label || "标准模考";
  refreshExamInfo();
}
function refreshExamInfo(){
  var typing = document.getElementById("typingOn").checked;
  var tmin = parseInt(document.getElementById("examMinutesTyping").value,10)||0;
  var plan = document.getElementById("examPlanMode").value;
  var info = "";
  if (plan === "batch") {
    var b = document.getElementById("examBatch").value;
    var list = dataset().filter(function(q){ return (q.batch || "未注明") === b; });
    var per = countByType(list);
    info = '本卷为 <b>'+escapeHtml(b)+' 批</b> 整套真题，共 <b>'+list.length+'</b> 题（单选 '+per.single+' · 多选 '+per.multi+' · 判断 '+per.bool+'），<b>无时间限制</b>';
  } else {
    var s = parseInt(document.getElementById("cntSingle").value,10)||0;
    var m = parseInt(document.getElementById("cntMulti").value,10)||0;
    var bo = parseInt(document.getElementById("cntBool").value,10)||0;
    var total = s+m+bo;
    info = '本卷共 <b>'+total+'</b> 道客观题（单选 '+s+' · 多选 '+m+' · 判断 '+bo+'），<b>无时间限制</b>';
    var data = dataset();
    var avail = { single:0, multi:0, bool:0 };
    data.forEach(function(q){ var t=normType(q.type); if(avail[t]!==undefined) avail[t]++; });
    var warn = [];
    if (s > avail.single) warn.push('单选库仅 '+avail.single+' 题');
    if (m > avail.multi) warn.push('多选库仅 '+avail.multi+' 题');
    if (bo > avail.bool) warn.push('判断库仅 '+avail.bool+' 题');
    if (warn.length) info += '<br><span style="color:#dc2626">⚠️ '+warn.join('，')+'，将自动按上限抽取</span>';
  }
  if (typing) info += '；另加打字题 <b>'+tmin+'</b> 分钟（不计入客观题分）';
  document.getElementById("examSetupInfo").innerHTML = info;
}
function confirmExamSetup(){
  var plan = document.getElementById("examPlanMode").value;
  var typing = document.getElementById("typingOn").checked;
  var typingMinutes = parseInt(document.getElementById("examMinutesTyping").value,10)||10;
  var cfg;
  if (plan === "batch") {
    var b = document.getElementById("examBatch").value;
    if (!b) { alert("请选择要刷的批次"); return; }
    cfg = { plan: "batch", batch: b, typing: typing, typingMinutes: typingMinutes };
  } else {
    var counts = {
      single: parseInt(document.getElementById("cntSingle").value,10)||0,
      multi:  parseInt(document.getElementById("cntMulti").value,10)||0,
      bool:   parseInt(document.getElementById("cntBool").value,10)||0
    };
    if (counts.single + counts.multi + counts.bool < 1) { alert("请至少设置 1 道客观题"); return; }
    cfg = { plan: "random", counts: counts, typing: typing, typingMinutes: typingMinutes };
  }
  examLastCfg = cfg;
  document.getElementById("examSetupOverlay").style.display = "none";
  enterExamView();
  var paper = rebuildPaper(cfg);
  examPaperList = paper.list; examPaperMeta = paper.meta;
  examTypingOn = typing; examTypingMinutes = typingMinutes;
  startExam();
}
function enterExamView() {
  document.getElementById("questionsList").style.display = "none";
  document.getElementById("loadMoreWrap").style.display = "none";
  var tb = document.querySelector(".toolbar"); if (tb) tb.style.display = "none";
  if (!_mPromo) document.getElementById("promoBanner").style.display = "none";
  examView.style.display = "block";
  document.getElementById("examModeLabel").textContent = (MODE === "interview") ? "面试" : "笔试";
  examSubmitBtn.textContent = (MODE === "interview") ? "📖 显示参考答案" : "✅ 提交试卷";
  window.scrollTo({ top: 0 });
}
function exitExamMode() {
  examActive = false;
  stopExamTimer();
  examView.style.display = "none";
  document.getElementById("questionsList").style.display = "";
  var tb = document.querySelector(".toolbar"); if (tb) tb.style.display = "";
  if (_mPromo) document.getElementById("promoBanner").style.display = "";
  render();
}
function startExamTimer(minutes){
  stopExamTimer();
  examTimerLimit = minutes * 60;
  examTimerRemaining = examTimerLimit;
  var bar = document.getElementById("examTimerBar");
  var fill = document.getElementById("examTimerFill");
  var digits = document.getElementById("examTimerDigits");
  if (!bar) return;
  bar.style.display = "flex";
  fill.style.width = "100%"; fill.classList.remove("warning");
  function fmt(s){ var m=Math.floor(s/60), x=s%60; return (m<10?"0"+m:m)+":"+(x<10?"0"+x:x); }
  digits.textContent = fmt(examTimerRemaining);
  examTimer = setInterval(function(){
    examTimerRemaining--;
    digits.textContent = fmt(examTimerRemaining);
    fill.style.width = (examTimerRemaining / examTimerLimit * 100) + "%";
    if (examTimerRemaining <= 60) fill.classList.add("warning");
    if (examTimerRemaining <= 0){ clearInterval(examTimer); digits.textContent = "00:00 时间到"; submitExam(); }
  }, 1000);
}
function stopExamTimer(){ if (examTimer) clearInterval(examTimer); examTimer = null; }
function startExam() {
  examGraded = false; examSelections = {};
  examResult.style.display = "none"; examResult.innerHTML = "";
  var list = examPaperList;
  var meta = examPaperMeta;
  document.getElementById("examTotal").textContent = list.length;
  document.getElementById("examSubInfo").innerHTML = typesText(meta.per) + (examTypingOn ? "　+ 打字题" : "");
  var arr = list.slice();
  examQuestions.innerHTML = "";
  if (!arr.length) { examQuestions.innerHTML = '<div class="no-result">🔍 该范围没有题目</div>'; return; }
  arr.forEach(function (q, i) { examQuestions.appendChild(buildExamCard(q, i + 1)); });
  if (examTypingOn) {
    var passage = CONFIG.typingText || "";
    var tcard = document.createElement("div");
    tcard.className = "exam-q typing-q";
    tcard.innerHTML = '<div class="exam-q-head"><div class="exam-q-meta"><span class="exam-q-tag" style="background:linear-gradient(135deg,#d97706,#f59e0b)">打字题</span><span class="exam-q-num">限时 ' + examTypingMinutes + ' 分钟 · 不计入客观题分</span></div><div class="exam-q-stem">✍️ 请照抄下方范文</div></div>'
      + '<div class="typing-passage" id="typingPassage">' + escapeHtml(passage) + '</div>'
      + '<textarea class="typing-area" id="typingArea" placeholder="在此处对照上方范文抄写……"></textarea>';
    examQuestions.appendChild(tcard);
  }
}
function buildExamCard(q, n) {
  var card = document.createElement("div");
  card.className = "exam-q"; card.id = "examQ" + q._idx;
  var headerHtml, bodyHtml;
  if (MODE === "interview") {
    headerHtml = '<div class="exam-q-meta"><span class="exam-q-num">第 ' + n + ' 题</span></div><div class="exam-q-stem">' + escapeHtml(q.title || "") + '</div>';
    bodyHtml = '<div class="exam-explain" id="examExp' + q._idx + '"><b>参考答案：</b><br>' + formatAnswer(q.answer || "（暂无参考答案）", currentSearch) + '</div>';
  } else {
    var lab = (q.type === "multiple" || q.type === "multi") ? {t:"多选题", c:"tag-multi"} : ((q.type === "judge" || q.type === "bool") ? {t:"判断题", c:"tag-bool"} : {t:"单选题", c:"tag-single"});
    var stemHtml = highlight(q.stem || "", currentSearch);
    var multi = (q.type === "multiple" || q.type === "multi");
    var opts = (q.options || []).map(function (o) {
      return '<div class="exam-opt" data-idx="' + q._idx + '" data-letter="' + o.letter + '" data-multi="' + (multi ? 1 : 0) + '">'
        + '<span class="exam-opt-letter">' + o.letter + '.</span>'
        + '<span class="exam-opt-text">' + escapeHtml(o.text) + '</span>'
        + '<span class="exam-mark"></span></div>';
    }).join("");
    bodyHtml = '<div class="exam-opts">' + opts + '</div>'
      + '<div class="exam-explain" id="examExp' + q._idx + '"><div>答案：<b>' + escapeHtml(displayAnswer(q)) + '</b></div>'
      + (q.explanation ? '<div style="margin-top:6px">解析：' + formatAnswer(q.explanation, currentSearch) + '</div>' : '') + '</div>';
    headerHtml = '<div class="exam-q-meta"><span class="exam-q-tag ' + lab.c + '">' + lab.t + '</span><span class="exam-q-num">第 ' + n + ' 题</span></div><div class="exam-q-stem">' + stemHtml + '</div>';
  }
  card.innerHTML = '<div class="exam-q-head">' + headerHtml + '</div>' + bodyHtml;
  return card;
}
examQuestions.addEventListener("click", function (e) {
  var opt = e.target.closest(".exam-opt");
  if (!opt || examGraded) return;
  var idx = +opt.dataset.idx, letter = opt.dataset.letter, multi = opt.dataset.multi === "1";
  if (multi) {
    if (!examSelections[idx]) examSelections[idx] = [];
    var pos = examSelections[idx].indexOf(letter);
    if (pos === -1) examSelections[idx].push(letter); else examSelections[idx].splice(pos, 1);
    opt.parentElement.querySelectorAll(".exam-opt").forEach(function (c) {
      c.classList.toggle("selected", examSelections[idx].indexOf(c.dataset.letter) !== -1);
    });
  } else {
    examSelections[idx] = [letter];
    opt.parentElement.querySelectorAll(".exam-opt").forEach(function (c) {
      c.classList.toggle("selected", c.dataset.letter === letter);
    });
  }
});
function normAnsArr(ans) {
  return (Array.isArray(ans) ? ans : String(ans).split("")).map(function (x) { return String(x).trim(); }).filter(Boolean);
}
function submitExam() {
  if (examGraded && MODE === "written") return;
  examGraded = true;
  stopExamTimer();
  var list = examPaperList;
  if (MODE === "interview") {
    list.forEach(function (q) { var card = document.getElementById("examQ" + q._idx); if (card) card.classList.add("graded"); });
    examResult.innerHTML = '<div class="exam-result-detail">面试为开放作答，提交后已展示各题参考答案，请对照自评，并用上方「🎲 随机抽题」里的 🎙️ 录音功能演练口述作答。</div>';
    examResult.style.display = "block";
    window.scrollTo({ top: 0 });
    return;
  }
  var correct = 0, total = list.length, wrong = 0;
  list.forEach(function (q) {
    var sel = examSelections[q._idx] || [];
    var isCorrect = false;
    if (q.type === "multiple" || q.type === "multi") {
      isCorrect = normAnsArr(q.answer).sort().join("") === sel.map(function (x) { return String(x).trim(); }).sort().join("") && sel.length > 0;
    } else if (q.type === "judge" || q.type === "bool") {
      var selText = ""; (q.options || []).forEach(function (o) { if (sel.indexOf(o.letter) !== -1) selText = o.text; });
      isCorrect = (selText === String(q.answer).trim());
    } else {
      isCorrect = (sel.length === 1 && String(sel[0]).trim() === String(q.answer).trim());
    }
    var card = document.getElementById("examQ" + q._idx);
    card.classList.add("graded");
    card.insertBefore(makeResultBanner(isCorrect, q), card.firstChild);
    if (isCorrect) { correct++; card.classList.add("graded-correct"); }
    else { wrong++; card.classList.add("graded-wrong"); }
    var ansArr = normAnsArr(q.answer);
    (q.options || []).forEach(function (o) {
      var el = card.querySelector('.exam-opt[data-letter="' + o.letter + '"]'); if (!el) return;
      var isAns = ansArr.indexOf(String(o.letter).trim()) !== -1;
      if (isAns) el.classList.add("correct");
      if (sel.indexOf(o.letter) !== -1 && !isAns) el.classList.add("wrong");
      var mk = el.querySelector(".exam-mark");
      if (isAns) mk.textContent = "✅"; else if (sel.indexOf(o.letter) !== -1) mk.textContent = "❌";
    });
  });
  examGraded = true;
  if (MODE === "interview") {
    examResult.innerHTML = '<div class="exam-result-detail">面试为开放作答，提交后已展示各题参考答案，请对照自评，并用上方「🎲 随机抽题」里的 🎙️ 录音功能演练口述作答。</div>';
  } else {
    var pct = total ? Math.round((correct / total) * 100) : 0;
    var grade = pct >= 90 ? "🏆 优秀" : pct >= 60 ? "👍 合格" : "💪 继续加油";
    var html = '<div class="exam-result-score">' + correct + ' / ' + total + '</div>'
      + '<div class="exam-result-detail">客观题正确率 <b>' + pct + '%</b>　' + grade + '　（答错 ' + wrong + ' 题，已用 ❌ 标出）</div>';
    if (examTypingOn) html += gradeTyping();
    examResult.innerHTML = html;
  }
  examResult.style.display = "block";
  window.scrollTo({ top: 0 });
}
function gradeTyping(){
  var passage = CONFIG.typingText || "";
  var area = document.getElementById("typingArea");
  if (!passage || !area) return "";
  var typed = area.value || "";
  var n = typed.length;
  var matched = 0, len = Math.min(n, passage.length);
  for (var i = 0; i < len; i++){ if (typed.charAt(i) === passage.charAt(i)) matched++; }
  var acc = passage.length ? Math.round(matched / passage.length * 100) : 0;
  var speed = examTypingMinutes ? Math.round(n / examTypingMinutes) : n;
  return '<div class="exam-result-detail" style="margin-top:8px">✍️ 打字题：共录入 <b>' + n + '</b> 字 · 准确率 <b>' + acc + '%</b> · 速度约 <b>' + speed + '</b> 字/分钟（不计入客观题分）</div>';
}
function resetExam() {
  examGraded = false; examSelections = {}; examResult.style.display = "none"; examResult.innerHTML = ""; examQuestions.innerHTML = "";
  if (examLastCfg) {
    var paper = rebuildPaper(examLastCfg);
    examPaperList = paper.list; examPaperMeta = paper.meta;
    examTypingOn = examLastCfg.typing; examTypingMinutes = examLastCfg.typingMinutes;
  }
  startExam(); window.scrollTo({ top: 0 });
}
document.getElementById("examBtn").addEventListener("click", openExamSetup);
document.getElementById("examExitBtn").addEventListener("click", exitExamMode);
document.getElementById("examSubmitBtn").addEventListener("click", submitExam);
document.getElementById("examResetBtn").addEventListener("click", resetExam);
document.getElementById("examSetupStart").addEventListener("click", confirmExamSetup);
document.getElementById("examSetupPreset").addEventListener("click", applyExamPreset);
document.getElementById("examSetupCancel").addEventListener("click", function(){ examActive=false; document.getElementById("examSetupOverlay").style.display="none"; });
document.getElementById("typingOn").addEventListener("change", refreshExamInfo);
document.getElementById("examPlanMode").addEventListener("change", toggleExamPlan);
["cntSingle","cntMulti","cntBool","examMinutes","examMinutesTyping"].forEach(function(id){
  var el = document.getElementById(id); if (el) el.addEventListener("input", refreshExamInfo);
});

// 初始化界面
// 标题 / 副标题
document.title = CONFIG.siteTitle || document.title;
document.getElementById("siteTitle").textContent = CONFIG.siteTitle;
document.getElementById("siteEmoji").textContent = CONFIG.siteEmoji;
document.getElementById("siteSubtitle").textContent = CONFIG.subtitle + (CONFIG.examYear ? "（" + CONFIG.examYear + "）" : "");

// 主题色注入（themeColor 统一控制主色与圆角按钮）
if (CONFIG.themeColor) {
  document.documentElement.style.setProperty('--primary', CONFIG.themeColor);
  document.documentElement.style.setProperty('--primary-light', CONFIG.themeColor);
  document.documentElement.style.setProperty('--header-grad', 'linear-gradient(135deg, ' + CONFIG.themeColor + ' 0%, ' + CONFIG.themeColor + ' 100%)');
}

// 封面头像（可选）：超长 base64 会阻塞首屏，自动回退到轻量 SVG
function lightCover(){ return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%231e3a5f'/%3E%3Ctext x='50' y='64' font-size='44' text-anchor='middle' fill='%23fff'%3E🚔%3C/text%3E%3C/svg%3E"; }
function safeCover(src){ return (src && src.length > 8192) ? lightCover() : src; }
if (CONFIG.cover) {
  var _hc = document.querySelector('.header-content');
  if (_hc) {
    var _cov = document.createElement('img');
    _cov.src = safeCover(CONFIG.cover); _cov.className = 'cover-avatar'; _cov.alt = 'cover';
    _cov.loading = 'lazy'; _cov.decoding = 'async';
    _hc.insertBefore(_cov, _hc.firstChild);
  }
}

// 模块开关（默认极简；按需开启）
// - promo   : 推广横幅（闲鱼 banner）。未显式配置时回退到 xianyu 值，兼容旧配置
// - xianyu  : 工具栏「获取完整版口令」按钮 + 闲鱼口令弹层
// - reward  : 工具栏「打赏作者」按钮 + 赞赏码弹层
var _em = CONFIG.enabledModules || {};
var _mPromo  = (_em.promo !== undefined) ? _em.promo : _em.xianyu;
var _mXianyu = _em.xianyu;
var _mReward = _em.reward;
var _mRecord = (_em.record !== undefined) ? _em.record : false;
function _hide(id) { var _el = document.getElementById(id); if (_el) _el.style.display = 'none'; }
if (!_mPromo)  { _hide('promoBanner'); }
if (!_mXianyu) { _hide('downloadOfflineBtn'); _hide('xianyuToastOverlay'); }
if (!_mReward) { _hide('rewardBtn'); _hide('rewardToastOverlay'); }

// 闲鱼文案（仅开启时才有意义）
document.getElementById("promoTitle").textContent = CONFIG.promoTitle;
document.getElementById("promoText").innerHTML = CONFIG.promoText;
document.getElementById("promoXianyu").textContent = "📋 复制作者ID：" + CONFIG.xianyuCode;
document.getElementById("xtCode").textContent = CONFIG.xianyuCode;

// 打赏文案与赞赏码（仅 reward 开启时有意义）
if (CONFIG.rewardTitle) document.getElementById("rewardTitle").textContent = CONFIG.rewardTitle;
if (CONFIG.rewardDesc)  document.getElementById("rewardDesc").innerHTML = CONFIG.rewardDesc;
if (CONFIG.rewardImage) { var _qr = document.getElementById("rewardQr"); _qr.src = CONFIG.rewardImage; _qr.loading = 'lazy'; _qr.decoding = 'async'; }

// 倒计时显示
document.getElementById("timerDigits").textContent = (function () { var m = Math.floor(CONFIG.timerSeconds / 60), s = CONFIG.timerSeconds % 60; return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s); })();

// 页脚（logo + 文案 + 联系 + 版本）
var _footer = document.querySelector('.footer');
if (_footer) {
  _footer.innerHTML = '';
  if (CONFIG.logo) {
    var _lg = document.createElement('img'); _lg.src = CONFIG.logo; _lg.className = 'footer-logo'; _lg.alt = 'logo';
    _lg.loading = 'lazy'; _lg.decoding = 'async';
    _footer.appendChild(_lg);
  }
  var _fp = document.getElementById('footerText');
  if (!_fp) { _fp = document.createElement('p'); _fp.id = 'footerText'; _footer.appendChild(_fp); }
  else { if (_fp.parentNode !== _footer) _footer.appendChild(_fp.cloneNode(false)); }
  _fp.innerHTML = CONFIG.footerText + (CONFIG.contact ? ' · 联系：' + CONFIG.contact : '');
  var _fv = document.createElement('p'); _fv.className = 'footer-version'; _fv.id = 'footerVersion';
  _footer.appendChild(_fv);
}

// 版本信息（读取 VERSION.json；离线 file:// 下 fetch 受限时静默跳过）
(function () {
  try {
    fetch('VERSION.json').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v) return;
        var _fv = document.getElementById('footerVersion');
        if (!_fv) return;
        var _parts = ['RCJ Exam Template v' + (v.version || '1.0.0')];
        if (v.updated) _parts.push('更新于 ' + v.updated);
        var _c = [];
        if (v.writtenCount != null) _c.push('笔试 ' + v.writtenCount);
        if (v.interviewCount != null) _c.push('面试 ' + v.interviewCount);
        if (_c.length) _parts.push(_c.join(' / '));
        _fv.textContent = _parts.join(' · ');
      }).catch(function () {});
  } catch (e) {}
})();

// 构建标记：用于排查浏览器缓存（看不到「回答正确/错误」横幅时，先核对此时间与部署时间是否一致）
(function () {
  var _bv = document.getElementById('buildVersion');
  if (_bv) _bv.textContent = 'build:2026-07-12T20-15 · 文字判定横幅v2';
})();

window.addEventListener("DOMContentLoaded", function () {
  if (!hasW && !hasI && !G_DATA.length) {
    document.getElementById("questionsList").innerHTML = '<div class="no-result">⚠️ 未找到题目数据。请确认同目录存在 data-written.js / data-interview.js / data.js（由 build_data.py 生成）。</div>';
    return;
  }
  buildModeTabs();
  buildFilterRows();
  updateStats();
  StorageCtrl.updateUI();
  initAudioRecorderSystem();
  render();
});
