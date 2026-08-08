/* ============================================================================
   content.js — 全站文案与数据，集中一处。
   改文案只需要动这个文件，不用碰任何逻辑代码。

   规则（请保持）：
   1. 只写能在公开仓库里核验的事实。没有出处的成绩、影响力、合作方不要写。
   2. 数字请与 README 保持一致；改了 README 记得回来同步。
   3. 每一幕的 id 与 css/layout.css 里的 --act-* 变量一一对应，改名要同步。
   ========================================================================= */

export const site = {
  name: "jingjing",
  title: "jingjing — 个人主页",
  description:
    "jingjing 的个人主页：药学在读，喜欢把重复的学习过程变成能用、能看、能自动化的东西。所有内容来自 GitHub 上的公开仓库。",
  lang: "zh-CN",
  github: "https://github.com/jing1312",
};

/* ==========================================================================
   ACT 1 — HERO
   ========================================================================== */
export const hero = {
  id: "hero",
  index: "01 / 04",
  eyebrow: "PERSONAL · 个人主页",
  name: "jingjing",
  latin: "PHARMACY × LITTLE SCRIPTS",
  lede:
    "我是 jingjing，药学方向在读。这一页收集我做成过、并且还在用的小东西——它们大多从「不想再重复一次」开始。",
  meta: [
    { k: "身份", v: "药学 · 在读" },
    { k: "代码", v: "github.com/jing1312" },
    { k: "这页", v: "无追踪 · 无构建" },
  ],
  scrollHint: "向下 · 正文",
};

/* ==========================================================================
   ACT 2 — 关于
   ========================================================================== */
export const about = {
  id: "about",
  index: "02 / 04",
  kicker: "关于",
  title: "把重复的事，写一遍让它自己跑",
  latin: "ABOUT",
  lede: "上课、背药化、刷题、导出课件——这些事每年都会重来一次。所以我写了些小工具，让它们只跑一次。",
  paras: [
    "我学的是药学方向，日常是大量的课程、记忆和整理。整理下来的笔记我不喜欢只放在本地，于是慢慢把它们做成了公开的小项目：录播课自动转成讲义，网盘里的视频批量出课件，练习题自动导出，结构记不住就做成闪卡。",
    "这些仓库大多很小，README 也常常只有几行。但它们是我自己每天都在用的东西，所以能一直跑到今天。这条路上顺手学会了 JavaScript、Python 和一点点后端与浏览器自动化。",
    "最近的兴趣是「把 AI 用在学习流程里」：让它当讲解、当校对、当导出工具，而不是当预言家。",
  ],
  chips: ["药学 · 在读", "JavaScript / Python", "AI 用于学习流程", "开源小工具"],
};

/* ==========================================================================
   ACT 3 — 项目
   ========================================================================== */
export const projects = {
  id: "projects",
  index: "03 / 04",
  kicker: "项目",
  title: "GitHub 上真在跑的东西",
  latin: "PROJECTS",
  lede: "挑几个一直在用的；完整的列表在仓库主页。",
  cards: [
    {
      repo: "skipping-lectures",
      url: "https://github.com/jing1312/skipping-lectures",
      lang: "Python",
      desc: "录播课 → 转写 / 要点 / AI 课件 / 笔记。把 4 门课 13GB 视频压成一页纸。",
    },
    {
      repo: "daily-digital-twin",
      url: "https://github.com/jing1312/daily-digital-twin",
      lang: "JavaScript",
      desc: "Windows / 飞书 / Edge 上的个人自动化运行时：任务从飞书进来，证据核验后才算完成。",
    },
    {
      repo: "svg-optimization-skill",
      url: "https://github.com/jing1312/svg-optimization-skill",
      lang: "JavaScript",
      desc: "把「图做得好看」变成可检查的流程：量文本、对坐标、再迭代，一页页手写 SVG。",
    },
    {
      repo: "nature-figure-skill",
      url: "https://github.com/jing1312/nature-figure-skill",
      lang: "Python",
      desc: "论文配图工作流：图表契约、门禁检查、语义配色、独立导出。快照自 yuan1z0825/nature-skills。",
    },
    {
      repo: "flashcard-pharm",
      url: "https://github.com/jing1312/flashcard-pharm",
      lang: "HTML",
      desc: "天然药物化学结构闪卡：看结构 → 写俗名 / 类型 / 用途。",
    },
    {
      repo: "TCM-Study-Materials",
      url: "https://github.com/jing1312/TCM-Study-Materials",
      lang: "HTML",
      desc: "《中医药学概论》备考套件：计划、速记卡、口诀、自测模拟。",
    },
    {
      repo: "IELTS_player_practice_jing",
      url: "https://github.com/jing1312/IELTS_player_practice_jing",
      lang: "JavaScript",
      desc: "雅思听说练习播放器：逐句回放、变速、跟读。",
    },
    {
      repo: "xiangzhang-course-pipeline",
      url: "https://github.com/jing1312/xiangzhang-course-pipeline",
      lang: "JavaScript",
      desc: "课程平台录播的转写管线：签名直链、断点续传、失败重跑。",
    },
  ],
  more: { label: "完整仓库列表 ↗", url: "https://github.com/jing1312?tab=repositories" },
};

/* ==========================================================================
   ACT 4 — 联系 / 结尾
   ========================================================================== */
export const contact = {
  id: "contact",
  index: "04 / 04",
  kicker: "联系",
  title: "线上能找到我",
  latin: "FIND ME",
  lede: "想聊功能、聊 bug、聊学习，直接开 issue 或 PR——我经常路过 GitHub。",
  email: null, // 邮箱暂不公开；公开后填 { label, href, value }
  cta: { label: "github.com/jing1312", url: "https://github.com/jing1312" },
  colophon: [
    "本站是这个页面自己的作品：WebGL 背景是手写的天空与一条玻璃链，不套模板。",
    "无构建、无后端、无统计脚本，字体按用到的字形子集化。",
    "三款字体：Noto Sans SC（大标题）、IBM Plex Sans SC（正文）、Bodoni Moda（拉丁装饰）。",
  ],
  footer: "© 2026 jingjing · 内容都可以在 GitHub 上核验",
};

/* 幕次注册表 —— 顺序即滚动顺序，3D 状态机按这个表推进 */
export const acts = [
  { id: "hero", tone: "paper" },
  { id: "about", tone: "blue" },
  { id: "projects", tone: "amber" },
  { id: "contact", tone: "magenta" },
];