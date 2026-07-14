/**
 * test_full.js —— 重构后三站（sz/hz/gd）行为校验。
 *
 * 做法：直接读 <city>/index.html，把 <script src="../shared/app.js"></script>
 * 内联为真实代码，再用 jsdom 的 runScripts:"dangerously" 执行（不依赖 HTTP，
 * 避免 jsdom 不随 url 拉取文档体的坑）。这样内联数据脚本 + app.js 都会真正运行。
 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CITIES = ["sz", "hz", "gd"];
const APPJS = fs.readFileSync(path.join(ROOT, "shared", "app.js"), "utf-8");

function readInline(city) {
  let html = fs.readFileSync(path.join(ROOT, city, "index.html"), "utf-8");
  // 把外部 app.js 引用替换为内联代码，保证 jsdom 能执行到逻辑
  // 用函数式替换，避免 APPJS 中的 $& / $1 等被 String.replace 当成特殊替换符
  html = html.replace(
    /<script src="\.\.\/shared\/app\.js"><\/script>/,
    () => `<script>\n${APPJS}\n</script>`
  );
  return html;
}

function loadPage(city) {
  return new Promise((resolve, reject) => {
    const errors = [];
    const html = readInline(city);
    const dom = new JSDOM(html, {
      url: "http://localhost/",          // 提供非 opaque origin，否则 localStorage 抛 SecurityError
      runScripts: "dangerously",
      pretendToBeVisual: true,
      beforeParse(window) {
        window.scrollTo = () => {};
        window.alert = () => {};
        window.console.error = (...a) => errors.push("CONSOLE_ERROR: " + a.join(" "));
        window.addEventListener("error", (e) =>
          errors.push("PAGE_ERROR: " + (e.error ? e.error.stack : e.message))
        );
      },
    });
    const w = dom.window;
    w.addEventListener("error", (e) => errors.push("WIN_ERROR: " + e.message));
    // DOMContentLoaded/init 触发后稍等，确保渲染完成
    const done = () => setTimeout(() => resolve({ window: w, errors }), 400);
    if (w.document.readyState === "complete" || w.document.readyState === "interactive") {
      done();
    } else {
      w.addEventListener("load", done);
      setTimeout(done, 3000); // 兜底
    }
  });
}

// 兼容两种调用： $(w, sel) 或 $(sel)（自动用当前窗口 CUR_W）
let CUR_W = null;
const $ = (a, b) => {
  const w = b === undefined ? CUR_W : a;
  const sel = b === undefined ? a : b;
  return w.document.querySelector(sel);
};
const $all = (a, b) => {
  const w = b === undefined ? CUR_W : a;
  const sel = b === undefined ? a : b;
  return Array.from(w.document.querySelectorAll(sel));
};
const has = (w, txt) => w.document.body.innerHTML.includes(txt);

async function testCity(city) {
  const { window: w, errors } = await loadPage(city);
  CUR_W = w;
  const results = [];
  const ok = (name, cond, extra = "") =>
    results.push(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);

  // 1. 数据加载
  const W = w.DATA_WRITTEN, I = w.DATA_INTERVIEW, CFG = w.SITE_CONFIG;
  ok("笔试数据载入", Array.isArray(W) && W.length > 0, W ? `${W.length}题` : "null");
  // sz 有面试数据；hz/gd 原站即无面试数据（与原始一致），0 题记 warning 不判失败
  if (Array.isArray(I) && I.length > 0) {
    ok("面试数据载入", true, `${I.length}题`);
  } else {
    const expectEmpty = city !== "sz";
    results.push(expectEmpty ? "⚠️ 面试数据为空（与原站一致）" : "❌ 面试数据载入 — 0题（sz 应有138题）");
  }
  ok("SITE_CONFIG 载入", !!CFG && !!CFG.siteTitle, CFG && CFG.siteTitle);
  ok("_idx 补全生效", !!(W && W[0] && W[0]._idx !== null && W[0]._idx !== undefined),
     W && `idx0=${W[0] && W[0]._idx}`);

  // 2. 笔试：渲染卡片 -> 选选项 -> 提交 -> 显示对错
  try {
    const writtenTab = $all(w, ".tab, a, button").find(t => /笔试/.test(t.textContent));
    if (writtenTab) writtenTab.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    // 给渲染一点时间
    await new Promise(r => setTimeout(r, 200));
    let card = $(".card");
    ok("笔试卡片渲染", !!card, card ? "有卡片" : "无卡片");
    if (card) {
      const opt = card.querySelector(".study-opt");
      ok("存在可点击选项", !!opt);
      if (opt) {
        opt.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
        const selected = card.querySelector(".study-opt.selected");
        ok("点击选项高亮", !!selected);
        const btn = card.querySelector(".study-check-btn");
        if (btn) {
          btn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
          const ans = card.querySelector(".study-answer");
          ok("提交后显示答案区", !!ans && ans.style.display === "block");
        } else {
          results.push("⚠️ 未找到提交按钮（可能该题型无）");
        }
      }
    }
  } catch (e) { results.push("❌ 笔试流程异常: " + e.message + " | " + (e.stack||"").split("\n").slice(0,3).join(" <- ")); }

  // 3. 套题模考：出卷设置含批次下拉 + 两种出卷方式 + 无60分钟计时条
  try {
    const examBtn = $all(w, "button").find(b => /套题模考|机考|模拟/.test(b.textContent));
    ok("存在套题模考入口", !!examBtn);
    if (examBtn) {
      examBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
      const overlay = $("#examSetupOverlay") || $(".exam-setup-overlay");
      ok("模考出卷设置可打开", !!overlay && overlay.style.display !== "none");
      const batchSel = $("#examBatch");
      ok("含批次下拉", !!batchSel && batchSel.options.length > 0, batchSel ? `${batchSel.options.length}项` : "无");
      const planText = has(w, "按套题批次");
      ok("含「按套题批次」出卷方式", planText);
      const radios = $all(w, 'select#examPlanMode option');
      ok("出卷方式≥2种", radios.length >= 2, `${radios.length}种`);
      const hasTimer = !!($("#examTimerBar") || $(".exam-timer-bar") || has(w, "60分钟"));
      ok("已取消60分钟计时条", !hasTimer);
    }
  } catch (e) { results.push("❌ 模考流程异常: " + e.message + " | " + (e.stack||"").split("\n").slice(0,3).join(" <- ")); }

  // 4. 面试渲染
  try {
    const interviewTab = $all(w, ".tab, a, button").find(t => /面试/.test(t.textContent));
    if (interviewTab) {
      interviewTab.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
    }
    const ivCard = $(".interview-card, .card");
    ok("面试模块可见", !!ivCard);
  } catch (e) { results.push("❌ 面试流程异常: " + e.message + " | " + (e.stack||"").split("\n").slice(0,3).join(" <- ")); }

  // 5. JS 运行时错误
  ok("无 JS 运行时错误", errors.length === 0, errors.slice(0, 3).join(" | "));

  console.log(`\n========== ${city} ==========`);
  results.forEach(r => console.log("  " + r));
  return results.every(r => r.startsWith("✅") || r.startsWith("⚠️"));
}

(async () => {
  let allPass = true;
  for (const c of CITIES) {
    try { const pass = await testCity(c); allPass = allPass && pass; }
    catch (e) { console.log(`\n========== ${c} ==========\n  ❌ 加载失败: ${e.message}`); allPass = false; }
  }
  console.log(`\n==== 总结: ${allPass ? "全部通过 ✅" : "存在失败 ❌"} ====`);
  process.exit(allPass ? 0 : 1);
})();
