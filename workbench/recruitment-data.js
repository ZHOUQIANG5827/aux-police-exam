// ============================================================
// RCJ 业务工作台 · 招录数据源
// 由「每日辅警+消防员招录汇总」自动化每日 09:00 合并写入。
// 工作台(workbench.html)通过 <script src="recruitment-data.js"> 离线读取。
// 字段说明见 workbench.html 内「使用说明」。
// ============================================================
window.RCJ_RECRUITMENT = {
  // 最近一次同步日期 (YYYY-MM-DD)，由自动化更新
  updated: "2026-07-29",

  // 备注（可选）
  note: "种子数据来自 2026-07-29 联网检索；自动化将每日合并滚动更新。",

  // 条目数组：每条一条招录公告
  items: [
    // ---------- 辅警 ----------
    {
      category: "辅警",
      region: "河南·郑州",
      unit: "郑州市公安机关",
      count: 387,
      publishDate: null,
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
      publishDate: "2026-07-06",
      signupStart: null,
      signupEnd: null,
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
      publishDate: "2026-07-06",
      signupStart: "2026-07-13",
      signupEnd: "2026-07-14",
      method: "现场报名",
      threshold: "详见职位表，封闭式管理",
      source: "湛江市公安局",
      url: "https://gaj.zhanjiang.gov.cn/gkmlpt/content/2/2198/post_2198337.html",
      bankStatus: "未建",
      note: "已截止，留作母库参考"
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
      publishDate: "2026-07-13",
      signupStart: "2026-07-13",
      signupEnd: "2026-07-17",
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
      publishDate: "2026-07-15",
      signupStart: "2026-07-27",
      signupEnd: "2026-07-29",
      method: "现场报名（人社局 205 室）",
      threshold: "高中及以上，驾驶员需驾驶证",
      source: "商水县人民政府",
      url: "https://www.shangshui.gov.cn/sitesources/ssx/page_pc/zwgk/zdxxgk/gsgg/article890f7b24217e4e628f2d65a674c6ab20.html",
      bankStatus: "未建",
      note: "今天（7/29）报名截止！"
    },
    {
      category: "政府专职消防员",
      region: "吉林·伊通",
      unit: "伊通满族自治县消防救援局",
      count: null,
      publishDate: "2026-07-20",
      signupStart: null,
      signupEnd: null,
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
      publishDate: "2026-07-11",
      signupStart: "2026-07-13",
      signupEnd: "2026-07-17",
      method: "网上报名",
      threshold: "月工资 2500 元，含社保",
      source: "肇东市人民政府",
      url: "https://www.hljzhaodong.gov.cn/zd/c31/202607/c12_237423.shtml",
      bankStatus: "未建",
      note: "已截止，留作参考"
    },
    {
      category: "政府专职消防员",
      region: "内蒙古·额尔古纳",
      unit: "额尔古纳市应急管理局",
      count: null,
      publishDate: "2026-07-09",
      signupStart: "2026-07-09",
      signupEnd: "2026-07-16",
      method: "现场报名（应急管理局三楼）",
      threshold: "高中及以上，驾驶员需驾驶证",
      source: "额尔古纳市政府",
      url: "https://eegn.gov.cn/News/show/1441701.html",
      bankStatus: "未建",
      note: "已截止，留作参考"
    },
    {
      category: "政府专职消防员",
      region: "黑龙江·铁力",
      unit: "铁力市消防救援大队",
      count: 10,
      publishDate: "2026-07-03",
      signupStart: "2026-07-03",
      signupEnd: "2026-07-13",
      method: "详见公告",
      threshold: "灭火岗男18-30岁高中；文职女25-40岁大专",
      source: "铁力市人民政府",
      url: "https://www.tls.gov.cn/newtlsrmzf/c104440/202607/429749.shtml",
      bankStatus: "未建",
      note: "已截止，留作参考"
    }
  ]
};
