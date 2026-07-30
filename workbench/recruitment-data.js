// ============================================================
// RCJ 业务工作台 · 招录数据源
// 由「每日招录汇总」自动化每日 09:00 合并写入（含 辅警/消防/广东省考/深圳事业编/海南省考）。
// 工作台(workbench.html)通过 <script src="recruitment-data.js"> 离线读取。
// 字段说明见 workbench.html 内「使用说明」。
// ============================================================
window.RCJ_RECRUITMENT = {
  // 最近一次同步日期 (YYYY-MM-DD)，由自动化更新
  updated: "2026-07-29",

  // 备注（可选）
  note: "演示数据：截止日已调成相对今日的临近值；广东省考/深圳事业编/海南省考 为演示条目，每日 09:00 自动化将用真实数据覆盖（公考类按「自用优先」策略）。",

  // 条目数组：每条一条招录公告
  items: [
    // ---------- 辅警 ----------
    {
      category: "辅警",
      region: "河南·郑州",
      unit: "郑州市公安机关",
      count: 387,
      publishDate: "2026-07-25",
      signupStart: "2026-07-27",
      signupEnd: "2026-07-31",
      method: "网上报名",
      threshold: "大专及以上（部分退役军人放宽至高中）",
      source: "郑州市公安局",
      url: "https://zzga.zhengzhou.gov.cn/jfgg/10166621.jhtml",
      bankStatus: "未建",
      note: "报名进行中（7/31 截止）"
    },
    {
      category: "辅警",
      region: "广东·肇庆",
      unit: "肇庆市公安局",
      count: 252,
      publishDate: "2026-07-22",
      signupStart: null,
      signupEnd: "2026-08-10",
      method: "详见职位表",
      threshold: "大专及以上（退役军人/消防退出人员放宽至高中）",
      source: "肇庆市公安局政府信息公开",
      url: "https://www.zhaoqing.gov.cn/zqgaj/gkmlpt/content/3/3255/post_3255180.html",
      bankStatus: "未建",
      note: "第二次公开招聘，21 个岗位"
    },
    {
      category: "辅警",
      region: "广东·湛江",
      unit: "湛江市公安局（留置看护）",
      count: 50,
      publishDate: "2026-07-24",
      signupStart: "2026-07-25",
      signupEnd: "2026-08-05",
      method: "现场报名",
      threshold: "详见职位表，封闭式管理",
      source: "湛江市公安局",
      url: "https://gaj.zhanjiang.gov.cn/gkmlpt/content/2/2198/post_2198337.html",
      bankStatus: "未建",
      note: "报名进行中"
    },
    {
      category: "辅警",
      region: "广东·惠州",
      unit: "惠州市公安局大亚湾区分局",
      count: 22,
      publishDate: "2026-07-16",
      signupStart: null,
      signupEnd: null,
      method: "详见公告",
      threshold: "详见职位表",
      source: "大亚湾区公安局",
      url: "https://www.dayawan.gov.cn/hzdywgaj/gkmlpt/content/5/5812/post_5812711.html",
      bankStatus: "已上线",
      note: "惠州机考模板已建（真题优先）"
    },
    {
      category: "辅警",
      region: "福建·厦门",
      unit: "厦门市公安局（非在编辅助）",
      count: 10,
      publishDate: "2026-07-23",
      signupStart: "2026-07-23",
      signupEnd: "2026-08-08",
      method: "扫码报名",
      threshold: "最高年龄 38 岁，详见岗位表",
      source: "厦门市公安局",
      url: "https://ga.xm.gov.cn/xmjx/jfts/202607/t20260713_3006790.htm",
      bankStatus: "未建",
      note: "非在编辅助岗，人数少"
    },

    // ---------- 政府专职消防员 ----------
    {
      category: "政府专职消防员",
      region: "河南·商水",
      unit: "商水县人民政府",
      count: null,
      publishDate: "2026-07-25",
      signupStart: "2026-07-27",
      signupEnd: "2026-08-02",
      method: "现场报名（人社局 205 室）",
      threshold: "高中及以上，驾驶员需驾驶证",
      source: "商水县人民政府",
      url: "https://www.shangshui.gov.cn/sitesources/ssx/page_pc/zwgk/zdxxgk/gsgg/article890f7b24217e4e628f2d65a674c6ab20.html",
      bankStatus: "未建",
      note: "报名进行中"
    },
    {
      category: "政府专职消防员",
      region: "吉林·伊通",
      unit: "伊通满族自治县消防救援局",
      count: null,
      publishDate: "2026-07-20",
      signupStart: null,
      signupEnd: "2026-08-12",
      method: "详见公告",
      threshold: "详见公告",
      source: "伊通满族自治县政府",
      url: "http://www.yitong.gov.cn/zw/tzgg/202607/t20260720_771250.html",
      bankStatus: "未建",
      note: ""
    },
    {
      category: "政府专职消防员",
      region: "黑龙江·肇东",
      unit: "肇东市消防救援局",
      count: null,
      publishDate: "2026-07-21",
      signupStart: "2026-07-22",
      signupEnd: "2026-08-06",
      method: "网上报名",
      threshold: "月工资 2500 元，含社保",
      source: "肇东市人民政府",
      url: "https://www.hljzhaodong.gov.cn/zd/c31/202607/c12_237423.shtml",
      bankStatus: "未建",
      note: "报名进行中"
    },
    {
      category: "政府专职消防员",
      region: "内蒙古·额尔古纳",
      unit: "额尔古纳市应急管理局",
      count: null,
      publishDate: "2026-07-22",
      signupStart: "2026-07-22",
      signupEnd: "2026-08-03",
      method: "现场报名（应急管理局三楼）",
      threshold: "高中及以上，驾驶员需驾驶证",
      source: "额尔古纳市政府",
      url: "https://eegn.gov.cn/News/show/1441701.html",
      bankStatus: "未建",
      note: "报名进行中"
    },
    {
      category: "政府专职消防员",
      region: "黑龙江·铁力",
      unit: "铁力市消防救援大队",
      count: 10,
      publishDate: "2026-07-23",
      signupStart: "2026-07-23",
      signupEnd: "2026-08-04",
      method: "详见公告",
      threshold: "灭火岗男18-30岁高中；文职女25-40岁大专",
      source: "铁力市人民政府",
      url: "https://www.tls.gov.cn/newtlsrmzf/c104440/202607/429749.shtml",
      bankStatus: "未建",
      note: "报名进行中"
    },

    // ---------- 公考类（广东省考 / 深圳事业编 / 海南省考）· 自用优先·公开整理版 ----------
    {
      category: "广东省考",
      region: "广东·省直",
      unit: "广东省公务员考试（演示条目）",
      count: null,
      publishDate: "2026-07-20",
      signupStart: null,
      signupEnd: "2026-08-15",
      method: "网上报名（广东省人事考试网）",
      threshold: "大专及以上，详见招考公告",
      source: "广东省人力资源和社会保障厅",
      url: "https://hrss.gd.gov.cn/",
      bankStatus: "未建",
      note: "演示条目：省考题库公开，自用备考+公开整理版引流，不伪装独家"
    },
    {
      category: "深圳事业编",
      region: "广东·深圳",
      unit: "深圳市事业单位公开招聘（演示条目）",
      count: null,
      publishDate: "2026-07-22",
      signupStart: null,
      signupEnd: "2026-08-12",
      method: "网上报名（深圳人社局）",
      threshold: "大专及以上，详见岗位表",
      source: "深圳市人力资源和社会保障局",
      url: "http://hrss.sz.gov.cn/",
      bankStatus: "未建",
      note: "演示条目：事业编题库公开，自用优先"
    },
    {
      category: "海南省考",
      region: "海南·省直",
      unit: "海南省公务员考试（演示条目）",
      count: null,
      publishDate: "2026-07-18",
      signupStart: null,
      signupEnd: "2026-08-20",
      method: "网上报名（海南省考试局）",
      threshold: "大专及以上，详见招考公告",
      source: "海南省考试局",
      url: "http://ea.hainan.gov.cn/",
      bankStatus: "未建",
      note: "演示条目：省考题库公开，自用备考+公开整理版引流"
    }
  ],

  // 历史快照：每日自动化追加一条（按 date 去重，保留约 42 天）。
  // 用于「按周对比」——看招录是否在放量。total = 当日活跃公告数；byCategory = 当日类别构成；byProvince = 当日各省分布。
  history: [
    { date:"2026-07-07", total:5,  byCategory:{"辅警":3,"政府专职消防员":2,"企业消防员":0}, byProvince:{"广东":2,"河南":1,"黑龙江":1,"福建":1} },
    { date:"2026-07-10", total:6,  byCategory:{"辅警":3,"政府专职消防员":2,"企业消防员":1}, byProvince:{"广东":2,"河南":1,"黑龙江":2,"福建":1} },
    { date:"2026-07-14", total:6,  byCategory:{"辅警":4,"政府专职消防员":2,"企业消防员":0}, byProvince:{"广东":2,"河南":1,"黑龙江":2,"福建":1} },
    { date:"2026-07-16", total:7,  byCategory:{"辅警":4,"政府专职消防员":2,"企业消防员":1}, byProvince:{"广东":3,"河南":1,"黑龙江":2,"福建":1} },
    { date:"2026-07-18", total:8,  byCategory:{"辅警":4,"政府专职消防员":3,"企业消防员":1}, byProvince:{"广东":3,"河南":1,"黑龙江":2,"福建":1,"吉林":1} },
    { date:"2026-07-21", total:8,  byCategory:{"辅警":5,"政府专职消防员":2,"企业消防员":1}, byProvince:{"广东":3,"河南":1,"黑龙江":2,"福建":1,"吉林":1} },
    { date:"2026-07-23", total:9,  byCategory:{"辅警":5,"政府专职消防员":3,"企业消防员":1}, byProvince:{"广东":3,"河南":2,"黑龙江":2,"福建":1,"吉林":1} },
    { date:"2026-07-25", total:10, byCategory:{"辅警":5,"政府专职消防员":4,"企业消防员":1}, byProvince:{"广东":3,"河南":2,"黑龙江":2,"福建":1,"吉林":1,"内蒙古":1} },
    { date:"2026-07-27", total:10, byCategory:{"辅警":5,"政府专职消防员":5,"企业消防员":0}, byProvince:{"广东":3,"河南":2,"黑龙江":2,"福建":1,"吉林":1,"内蒙古":1} },
    { date:"2026-07-29", total:12, byCategory:{"辅警":5,"政府专职消防员":5,"企业消防员":0}, byProvince:{"广东":4,"河南":3,"黑龙江":2,"福建":1,"吉林":1,"内蒙古":1} }
  ]
};
