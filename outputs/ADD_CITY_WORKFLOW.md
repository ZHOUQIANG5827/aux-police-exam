# 加城市工作流（真题优先 · 通用模板）

## 铁律（最重要）
**只有拿到该城市「真实考试真题」，才建站。**
严禁用其他城市数据洗白、拼凑、或编造"通用版"冒充城市真题。
（此前武汉/长沙用深圳数据洗白 → 漏洞百出、被迫下架，教训在此。）

## 模板已具备的能力（一套引擎通吃）
- 真题即数据：笔试 `data-written.json` / 面试 `data-interview.json`
- 模块：定向刷题（点击即判）、随机抽题、套题模考（机考核心）
- 面试模块、文字判定横幅、全屏模式、主题切换、进度大盘
- 机考 / 非机考 仅由 `config.js` 的 `examType` + `modules` 区分，无代码分叉

## 步骤
1. **准备真实真题数据**
   - 笔试 `data-written.json`：数组，元素含 `title / options / answer / analysis / batch / type / year`
   - 面试 `data-interview.json`：数组，元素含 `title / session / analysis / type / year`
   - 数据务必来自真实试卷/回忆版，并标注年份
2. **写城市配置 `config.js`**
   ```js
   window.SITE_CONFIG = {
     siteTitle: "深圳辅警真题卡组",
     siteEmoji: "🚔",
     subtitle: "笔试 900 题 + 结构化面试真题",
     examType: "paper",          // "computer"=机考 | "paper"=非机考
     examYear: "2024-2026",
     realQuestions: true,        // 铁律开关
     realQuestionsNote: "深圳辅警真实考试真题，无拼凑与洗白内容。",
     modules: { mockExam: true, targeted: true, random: true, written: true, interview: true },
     themeColor: "#1e3a5f",
     enabledModules: { promo: false, xianyu: false, reward: false, progress: true, themeToggle: true, record: false },
     defaultPage: "written"
   };
   ```
3. **构建自包含站（数据+配置内联，双击离线可用）**
   ```bash
   python outputs/build_city.py \
     <skill模板 viewer.html> <城市 config.js> \
     <written.json> <interview.json> \
     <输出目录/index.html> [examYear]
   ```
   例（深圳）：
   ```bash
   python outputs/build_city.py \
     ~/.workbuddy/skills/rcj-exam-builder/assets/viewer.html \
     sz/config.js sz/data-written.json sz/data-interview.json \
     outputs/preview-sz/index.html 2024-2026
   ```
4. **本地预览** `outputs/preview-sz/index.html`（双击即可，离线可用）
5. **上线**：复制到城市子目录（如 `sz/`），`git add` + `commit` + 手动 `push origin main`

## 机考 vs 非机考
| 维度 | 机考 computer | 非机考 paper |
|---|---|---|
| 典型 | 惠州（2136 题） | 深圳（900+138） |
| 套题模考 | 核心，必开 `mockExam:true` | 可选 |
| 重点 | 客观题机考模拟 | 结构化面试 + 笔试 |

## 质检清单（上架前必过）
- [ ] 每题 `answer` 与 `options` 对应、无错位
- [ ] 解析 `analysis` 非空、无"深圳市"等源城市残留
- [ ] 年份/批次标注准确
- [ ] 随机抽题、套题模考、点击即判 三处交互均正常
- [ ] 双人抽检 ≥30 题
