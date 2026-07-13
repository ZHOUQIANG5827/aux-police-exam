// 从现有自包含 hz/index.html 抽出真题：
// 抽出含数据赋值的 <script> 块，用 window 桩 eval 拿到数组（兼容任意 JS 字面量）
const fs = require('fs');
const html = fs.readFileSync('hz/index.html', 'utf8');
const blocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);

const win = {};
let found = 0;
for (const b of blocks) {
  if (b.includes('window.DATA_WRITTEN') || b.includes('window.DATA_INTERVIEW') || b.includes('window.DATA ')) {
    try {
      const fn = new Function('window', b + '\nreturn {W:window.DATA_WRITTEN,I:window.DATA_INTERVIEW,D:window.DATA};');
      const r = fn(win);
      if (r.W && !win.DATA_WRITTEN) win.DATA_WRITTEN = r.W;
      if (r.I && !win.DATA_INTERVIEW) win.DATA_INTERVIEW = r.I;
      if (r.D && !win.DATA) win.DATA = r.D;
      found++;
    } catch (e) {
      console.log('⚠️ 某 script 块 eval 跳过:', e.message.slice(0, 60));
    }
  }
}
console.log('命中数据块:', found);
console.log('written', (win.DATA_WRITTEN||[]).length, '| interview', (win.DATA_INTERVIEW||[]).length, '| DATA', (win.DATA||[]).length);

const w = win.DATA_WRITTEN || [];
let iv = win.DATA_INTERVIEW || [];
if (iv.length === 0 && win.DATA && win.DATA.length) iv = win.DATA; // 退路

fs.writeFileSync('hz/data-written.json', JSON.stringify(w, null, 1));
fs.writeFileSync('hz/data-interview.json', JSON.stringify(iv, null, 1));
console.log('✅ 已写出 hz/data-written.json(%d) / hz/data-interview.json(%d)', w.length, iv.length);
