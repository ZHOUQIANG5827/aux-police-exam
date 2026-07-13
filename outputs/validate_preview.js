const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
let m, i = 0, errs = 0;
while ((m = re.exec(html))) {
  const code = m[1];
  if (!code.trim()) continue;
  i++;
  try { new Function(code); }
  catch (e) { errs++; console.log('脚本块 #' + i + ' 语法错误: ' + e.message); }
}
console.log('检查脚本块数:', i, '| 语法错误:', errs);
console.log('含 window.DATA_WRITTEN 注入:', html.includes('window.DATA_WRITTEN ='));
console.log('含 window.DATA_INTERVIEW 注入:', html.includes('window.DATA_INTERVIEW ='));
console.log('含 SITE_CONFIG 注入:', html.includes('window.SITE_CONFIG ='));
console.log('含「笔试真题」标签:', html.includes('笔试真题'));
console.log('含「面试真题」标签:', html.includes('面试真题'));
console.log('含「真题数」统计:', html.includes('真题数'));
console.log('含 real-badge 铁律条:', html.includes('real-badge'));
console.log('含 examType 字段:', html.includes('"examType"'));
console.log('文件尾部完整(</html>):', html.trim().endsWith('</html>'));
