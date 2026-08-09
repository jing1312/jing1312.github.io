/* content.js - 主页文字和公开项目资料。只写能从仓库核对的内容。 */

export const site = {
  name: "jingjing",
  handle: "jing1312",
  title: "jingjing / 药学与小工具",
  description: "药学大三。平时背结构、做作业，也写一些自己会反复用的小工具。",
  github: "https://github.com/jing1312",
};

export const nav = [
  { id: "home", label: "首页" },
  { id: "projects", label: "项目" },
  { id: "recent", label: "最近" },
  { id: "tools", label: "工具" },
  { id: "notes", label: "笔记" },
  { id: "about", label: "关于" },
];

export const hero = {
  badge: "大三 / 药学 / 还在折腾",
  title: "你好，我是 jingjing",
  lede: "平时主要忙两件事：背药化，和把不好用的流程改成小工具。这里放的是我现在还会打开的仓库，也留着一些没做完的东西。",
  primary: "先看项目",
  secondary: "最近在忙",
  stageLabel: "背药化 · 写脚本 · 接着改",
  facts: [
    { value: "14", label: "公开仓库" },
    { value: "8", label: "这里重点放的项目" },
    { value: "132", label: "daily-digital-twin 测试" },
  ],
  desk: [
    { title: "课程处理脚本", note: "最近在补失败后的恢复逻辑。", tone: "pink" },
    { title: "论文图表", note: "继续收集那些一眼看不出的排版问题。", tone: "lavender" },
    { title: "药化闪卡", note: "想把错题记录做轻一点。", tone: "mint" },
  ],
};

export const projects = {
  title: "我确实做过的东西",
  lede: "大多是从一次作业、一次复习，或者某个重复到烦的步骤开始的。",
  filters: [
    { id: "all", label: "全部" },
    { id: "study", label: "学习" },
    { id: "flow", label: "流程" },
    { id: "craft", label: "图表" },
  ],
  cards: [
    {
      repo: "skipping-lectures", category: "flow", categoryLabel: "课程处理", lang: "Python", status: "在用", accent: "pink",
      desc: "把录播课整理成转写、要点、课件和笔记。批处理会保留中间结果，失败后能接着跑。",
      why: "课程视频一多，真正费时间的是下载、改文件名、转写和重新找重点。",
      done: "已经有批量处理、结果校验和断点恢复。",
      next: "继续补不同课程平台的输入适配，失败时把原因说得更清楚。",
      url: "https://github.com/jing1312/skipping-lectures",
    },
    {
      repo: "daily-digital-twin", category: "flow", categoryLabel: "本地自动化", lang: "Node.js", status: "在用", accent: "mint",
      desc: "一个跑在本地的个人自动化工具。任务说完成之前，要留下可以核对的结果。",
      why: "自动化最让人不放心的情况，是它说做完了，你却找不到证据。",
      done: "仓库里有 132 个测试，并在 Linux 和 Windows 上跑 CI。",
      next: "把策略检查和每次运行的记录做得更好读。",
      url: "https://github.com/jing1312/daily-digital-twin",
    },
    {
      repo: "nature-figure-skill", category: "craft", categoryLabel: "论文图表", lang: "Python", status: "公开", accent: "yellow",
      desc: "整理了一套论文图表流程，从语义配色、标注到导出前检查，专门抓那些不太显眼的小错误。",
      why: "标题、单位、字号和导出尺寸都可能让一张图翻车，不只是配色。",
      done: "仓库里有可复用的绘图流程和检查清单。",
      next: "继续收集不同图表类型的失败案例。",
      url: "https://github.com/jing1312/nature-figure-skill",
    },
    {
      repo: "flashcard-pharm", category: "study", categoryLabel: "药学复习", lang: "HTML", status: "可用", accent: "lavender",
      desc: "天然药物化学结构闪卡。先看结构，再回忆俗名、类型和用途，支持随机练习。",
      why: "只看整理好的表格，很容易误以为自己已经记住了。",
      done: "有结构分类、随机练习和移动端控制，打开网页就能用。",
      next: "补一个不打扰练习节奏的错题记录。",
      url: "https://github.com/jing1312/flashcard-pharm",
    },
    {
      repo: "TCM-Study-Materials", category: "study", categoryLabel: "考前复习", lang: "HTML", status: "可用", accent: "blue",
      desc: "中医药学概论的备考材料。计划、速记卡、关键词和自测入口放在一起。",
      why: "考试前最怕资料散得到处都是，所以连今天看什么也一起写进页面。",
      done: "已经整理出学习计划、闪卡和自测内容。",
      next: "根据自己复习时卡住的地方调整内容。",
      url: "https://github.com/jing1312/TCM-Study-Materials",
    },
    {
      repo: "svg-optimization-skill", category: "craft", categoryLabel: "SVG 排版", lang: "JavaScript", status: "公开", accent: "orange",
      desc: "把 SVG 的文字测量、坐标回填和浏览器复核整理成一套流程。",
      why: "很多 SVG 不是不能用，只是标题悄悄跑出了卡片。",
      done: "有测量工具、布局方法和可以重复执行的检查步骤。",
      next: "把常见溢出问题整理成更短的排查表。",
      url: "https://github.com/jing1312/svg-optimization-skill",
    },
    {
      repo: "xiangzhang-course-pipeline", category: "flow", categoryLabel: "下载流程", lang: "JavaScript", status: "实验", accent: "mint",
      desc: "处理课程平台录播资料，主要在意签名直链、断点续传和失败重跑。",
      why: "下载失败不可怕，失败以后只能全部重来才麻烦。",
      done: "把下载与重试拆成了可以单独检查的步骤。",
      next: "继续测不同网络和文件状态下的恢复行为。",
      url: "https://github.com/jing1312/xiangzhang-course-pipeline",
    },
    {
      repo: "IELTS_player_practice_jing", category: "study", categoryLabel: "听说练习", lang: "JavaScript", status: "可用", accent: "blue",
      desc: "雅思听说练习播放器，支持逐句回放、变速和跟读。",
      why: "练习时总在找进度和切速度，会把注意力从句子本身带走。",
      done: "做了一个可以逐句操作的浏览器播放器。",
      next: "补更简单的练习记录。",
      url: "https://github.com/jing1312/IELTS_player_practice_jing",
    },
  ],
};

export const recent = {
  title: "最近没有同时做十件事",
  lede: "先把手上的几个坑填完。这里写的是当前状态，不是年度计划。",
  items: [
    { when: "这几天", title: "重写这个主页", status: "正在改", tone: "pink", body: "旧版太像模板，人物和文字还挤在一起。这次先把内容和动效都做扎实。" },
    { when: "反复在改", title: "录播课批处理", status: "还在用", tone: "mint", body: "重点不是再加一个按钮，而是网络断掉以后能不能从原地继续。" },
    { when: "复习时", title: "天然药化闪卡", status: "边用边记", tone: "yellow", body: "真正不会的结构比想象中固定，准备先把错题保存下来。" },
    { when: "空下来再补", title: "论文图表案例", status: "收集中", tone: "lavender", body: "字号、单位、留白和导出尺寸都容易出错，我把遇到的案例慢慢记下来。" },
  ],
};

export const tools = {
  title: "电脑里常开的东西",
  lede: "没有技能百分比。会不会用，还是看最后能不能把问题处理掉。",
  groups: [
    { title: "写代码", items: ["Python", "JavaScript / TypeScript", "Node.js", "React", "HTML / CSS"] },
    { title: "跑流程", items: ["PowerShell", "GitHub Actions", "Git", "命令行"] },
    { title: "整理内容", items: ["Markdown", "Jupyter", "浏览器 DevTools", "论文图表工具"] },
  ],
  habits: [
    { title: "先跑一个最小版本", body: "把输入、输出和失败条件写清楚，通常比先搭一个大框架省时间。" },
    { title: "模型给建议，我来核对", body: "生成内容可以当草稿。涉及数据、课程和公开说明时，还是要回到来源。" },
    { title: "失败要留下线索", body: "日志、中间文件和测试不是仪式。下次出错时不用重新猜。" },
    { title: "最后到真实页面里看", body: "文字会不会挤、按钮能不能点、手机上是不是还顺眼，都得打开浏览器检查。" },
  ],
};

export const notes = {
  title: "随手记，不写成宣言",
  lede: "有些想法还没变成项目，先放在这里。",
  tabs: [
    { id: "current", label: "最近记的" },
    { id: "confirmed", label: "已经吃过亏" },
    { id: "later", label: "以后再说" },
  ],
  entries: {
    current: [
      { title: "分子和癌症生物学的阅读笔记", date: "断断续续", body: "基础还在补。我会把论文里的结论、自己的猜测和下一步要查的东西分开写，免得过几天自己也看不懂。" },
      { title: "闪卡、笔记和自测能不能共用一份数据", date: "想清楚一半", body: "它们重复的内容很多。先把数据怎么流动弄明白，再考虑做成更大的工具。" },
      { title: "失败状态应该先设计", date: "最近常想", body: "网络断了、输入不完整、输出没有证据，这些都不是边角情况。" },
    ],
    confirmed: [
      { title: "能接着跑，比一次跑通更有用", date: "已确认", body: "批处理迟早会断。保留中间结果和进度，比祈祷网络稳定靠谱。" },
      { title: "README 是写给三个月后的自己", date: "已确认", body: "安装步骤和限制不写清楚，过一阵子连自己都会重新踩坑。" },
    ],
    later: [
      { title: "更轻的论文阅读卡片", date: "没开工", body: "不做一句话摘要，想保留问题、证据、限制和原文位置。" },
      { title: "让几个学习工具共用资料", date: "没开工", body: "先把现有工具用顺，再决定要不要连起来。" },
    ],
  },
};

export const about = {
  title: "关于我",
  lede: "南昌大学药学大三。会背结构，也会为了少点几次鼠标写半天脚本。",
  paragraphs: [
    "现在最常碰到的是课程、药学资料和一些自动化需求。仓库里有做完的，也有实验中的；不好用的东西我会继续改，没做完的就直接写没做完。",
    "Biomedical AI 我也会看，不过现在谈成果还早。先把药学和代码的基础补齐；写出来的小项目，至少要真的跑得动，隔几个月自己还能看懂。",
  ],
  contact: "想聊某个仓库，直接去 GitHub 提 Issue 最方便。",
};

export const tones = {
  home: "pink",
  projects: "lavender",
  recent: "mint",
  tools: "butter",
  notes: "blue",
  about: "rose",
};
