/*
 * content.js — 主页里的事实、语气和导航都集中在这里。
 * 文案只写公开仓库能核验的内容；正在做的方向会明确标成“进行中”。
 */

export const site = {
  name: "jingjing",
  title: "jingjing — 研究花园",
  description: "药学在读，喜欢把学习、整理和重复工作做成能继续使用的小工具。",
  github: "https://github.com/jing1312",
};

export const nav = [
  { id: "home", label: "首页", icon: "⌂", tone: "paper" },
  { id: "garden", label: "花园", icon: "✦", tone: "blue" },
  { id: "projects", label: "项目", icon: "◈", tone: "amber" },
  { id: "workbench", label: "工作台", icon: "⌘", tone: "mint" },
  { id: "notes", label: "笔记", icon: "✎", tone: "lavender" },
  { id: "about", label: "关于我", icon: "◌", tone: "magenta" },
];

export const hero = {
  status: "现在在线 · 还在学习",
  title: "欢迎来到我的小小研究花园",
  lede: "这里放着我写过的工具、整理过的资料，还有几个还没长成的想法。你可以从项目逛起，也可以先看看我做事的方式。",
  primary: "逛逛项目",
  secondary: "看看工作方式",
  sceneLabel: "a small place for useful things",
  facts: [
    { value: "14", label: "公开仓库" },
    { value: "49", label: "图表工作流仓库的 stars" },
    { value: "132", label: "数字分身测试数" },
  ],
};

export const garden = {
  kicker: "THE GARDEN",
  title: "把仓库摆成几座小岛",
  lede: "每一座岛都来自一个很具体的麻烦：课件太散、结构记不住、流程跑完却不知道有没有真的完成。",
  islands: [
    { id: "study", name: "学习岛", mark: "01", color: "pink", projects: "flashcard-pharm · TCM-Study-Materials", note: "让记忆有地方落脚。" },
    { id: "flow", name: "流程岛", mark: "02", color: "mint", projects: "skipping-lectures · daily-digital-twin", note: "把重复步骤写成可以重跑的流程。" },
    { id: "craft", name: "图表岛", mark: "03", color: "yellow", projects: "nature-figure-skill · svg-optimization-skill", note: "先把“好看”拆成能检查的细节。" },
  ],
  sideNote: {
    title: "逛法",
    lines: ["点一座岛，可以直接跳到相关项目。", "点项目卡片的展开按钮，可以看到它为什么存在。", "这里的数字只记公开仓库，不把计划写成成果。"],
  },
};

export const projects = {
  kicker: "PROJECT CABINET",
  title: "一些确实做过的东西",
  lede: "它们不全是大项目，大多数只是我不想再手动做第二遍的事情。",
  filters: [
    { id: "all", label: "全部" },
    { id: "study", label: "学习工具" },
    { id: "flow", label: "流程与自动化" },
    { id: "craft", label: "图表与设计" },
  ],
  cards: [
    {
      repo: "skipping-lectures", category: "flow", categoryLabel: "流程与自动化", lang: "Python", status: "在用", accent: "pink",
      desc: "把录播课整理成转写、要点、课件和笔记。批处理会保留中间结果，失败后可以从上次停下的位置继续。",
      why: "课程视频一多，真正耗时间的不是看，而是反复下载、转写、改文件名和找重点。",
      done: "已经有批量处理和结果校验，适合把一批课程资料整理成可读的学习材料。",
      next: "继续补不同课程平台的输入适配，先保证失败时说清楚原因。",
      url: "https://github.com/jing1312/skipping-lectures",
    },
    {
      repo: "daily-digital-twin", category: "flow", categoryLabel: "流程与自动化", lang: "Node.js", status: "在用", accent: "mint",
      desc: "一个偏本地的个人自动化运行时：任务进来以后，要有可观察的完成证据，才算真正完成。",
      why: "自动化最容易让人不放心的地方，是它说做完了，但你没有办法快速核对。",
      done: "仓库里有 132 个测试，并在 Linux / Windows 上做持续集成。",
      next: "把策略审查和每次运行的记录做得更容易读。",
      url: "https://github.com/jing1312/daily-digital-twin",
    },
    {
      repo: "nature-figure-skill", category: "craft", categoryLabel: "图表与设计", lang: "Python", status: "公开", accent: "yellow",
      desc: "面向论文图表的工作流：从图表契约、语义配色到导出前检查，减少“看起来差不多”的情况。",
      why: "一张图的误差经常藏在标题、标注、单位和导出尺寸里，不只是在配色里。",
      done: "仓库提供了可复用的图表工作流和检查思路，目前公开仓库有 49 stars。",
      next: "继续收集不同图表类型的失败案例。",
      url: "https://github.com/jing1312/nature-figure-skill",
    },
    {
      repo: "flashcard-pharm", category: "study", categoryLabel: "学习工具", lang: "HTML", status: "可用", accent: "lavender",
      desc: "天然药物化学结构闪卡：看结构，回忆俗名、类型和用途，再用随机练习检查自己。",
      why: "只看整理好的表格很容易产生“我会了”的错觉，真正需要的是反过来提问。",
      done: "有结构分类、随机练习和移动端控制，打开网页就能用。",
      next: "把自己的错题记录做得更轻一点。",
      url: "https://github.com/jing1312/flashcard-pharm",
    },
    {
      repo: "TCM-Study-Materials", category: "study", categoryLabel: "学习工具", lang: "HTML", status: "可用", accent: "blue",
      desc: "中医药学概论的备考材料：计划、速记卡、关键词和自测入口放在同一个小套件里。",
      why: "考试前最怕资料到处散着，所以把“今天复习什么”也放进页面。",
      done: "整理出学习计划、闪卡和自测内容，适合复习时直接打开。",
      next: "根据实际复习反馈调整内容的颗粒度。",
      url: "https://github.com/jing1312/TCM-Study-Materials",
    },
    {
      repo: "svg-optimization-skill", category: "craft", categoryLabel: "图表与设计", lang: "JavaScript", status: "公开", accent: "orange",
      desc: "把 SVG 里的文字测量、坐标回填和浏览器复核整理成一套流程，让版面别靠运气。",
      why: "导出的 SVG 常常不是不能用，而是某个标题悄悄超出了卡片。",
      done: "有测量工具、布局迭代方法和可复用的检查步骤。",
      next: "继续把常见的溢出问题整理成更短的排查清单。",
      url: "https://github.com/jing1312/svg-optimization-skill",
    },
    {
      repo: "xiangzhang-course-pipeline", category: "flow", categoryLabel: "流程与自动化", lang: "JavaScript", status: "实验", accent: "mint",
      desc: "课程平台录播资料的处理管线，关注签名直链、断点续传和失败重跑。",
      why: "下载失败本身不可怕，可怕的是失败以后只能全部重来。",
      done: "把下载与重试过程拆成可以观察的步骤。",
      next: "继续验证不同网络和文件状态下的恢复行为。",
      url: "https://github.com/jing1312/xiangzhang-course-pipeline",
    },
    {
      repo: "IELTS_player_practice_jing", category: "study", categoryLabel: "学习工具", lang: "JavaScript", status: "可用", accent: "blue",
      desc: "雅思听说练习播放器：逐句回放、变速和跟读，重点是让练习动作少绕一点。",
      why: "练习时频繁找进度、切速度，会把注意力从句子本身带走。",
      done: "做了一个可以逐句操作的浏览器播放器。",
      next: "继续补更细的练习记录。",
      url: "https://github.com/jing1312/IELTS_player_practice_jing",
    },
  ],
};

export const workbench = {
  kicker: "WORKBENCH",
  title: "我怎么把事情做完",
  lede: "我喜欢先把问题拆小，再决定要不要让模型参与。能复跑、能检查、能解释，通常比一次生成得很快更重要。",
  panels: [
    { title: "先确认问题到底是什么", tone: "pink", body: "先写输入、输出和不确定的地方。很多“想做一个页面”的念头，拆开以后其实只是需要一个筛选器、一个批处理脚本，或者一张更清楚的表。" },
    { title: "让 AI 做提案，不替我下结论", tone: "blue", body: "模型适合帮我列可能性、改写结构、找漏项。涉及学习内容、实验记录和公开数据时，我会把假设、限制和需要人工核对的地方单独写出来。" },
    { title: "给流程留一条可回看的痕迹", tone: "mint", body: "文件名、日志、中间结果和测试都不是装饰。下一次运行时，我想知道它做了什么、停在哪里、为什么停，而不是重新猜一遍。" },
    { title: "最后再处理好看不好看", tone: "yellow", body: "视觉不是最后涂颜色。字有没有溢出、按钮能不能点到、手机上是不是还看得懂，这些都要在真实页面里检查。" },
  ],
  tools: ["Python", "JavaScript / TypeScript", "React", "Node.js", "HTML / CSS", "GitHub Actions", "PowerShell"],
};

export const notes = {
  kicker: "FIELD NOTES",
  title: "正在生长的几件事",
  lede: "这里放方向，不把计划写成结果。等做出能核验的东西，再把它移到项目柜里。",
  tabs: [
    { id: "growing", label: "正在生长" },
    { id: "checked", label: "已经确认" },
    { id: "someday", label: "以后想试" },
  ],
  entries: {
    growing: [
      { title: "分子和癌症生物学的交叉阅读", date: "进行中", body: "我在慢慢补基础，也在练习如何区分“读到的结论”“自己的猜想”和“下一步要查的资料”。现在还不是研究结果，只是一个持续更新的阅读方向。" },
      { title: "让学习工具更像一个小系统", date: "进行中", body: "闪卡、笔记和自测其实共享很多数据。想先把它们之间的连接理清，再决定要不要做更大的东西。" },
      { title: "把失败写进流程", date: "进行中", body: "最近很在意失败模式：网络断了、输入不完整、模型答得很像真的但没有证据。工具要先把这些情况说清楚。" },
    ],
    checked: [
      { title: "可复跑比一次成功更有用", date: "已确认", body: "同一份输入再次运行，应该能得到可以解释的结果；如果做不到，至少要留下足够线索。" },
      { title: "公开仓库也要照顾后来的人", date: "已确认", body: "README、安装步骤和限制说明不是附加项。以后回来看自己的代码，也会少一点猜谜。" },
    ],
    someday: [
      { title: "做一套更轻的科研阅读卡片", date: "想试", body: "不是把论文压成一句漂亮的话，而是留下问题、证据、限制和待查的链接。" },
      { title: "把小工具做成可以互相认识的房间", date: "想试", body: "先想想信息怎么流，再想界面长什么样。" },
    ],
  },
};

export const about = {
  kicker: "ABOUT ME",
  title: "我还在路上",
  lede: "药学在读，喜欢研究分子，也喜欢研究一段流程为什么总要重复十遍。",
  paras: [
    "白天面对课程、结构和题目，晚上写一些能让整理工作少绕一圈的小工具。兴趣在药学、Biomedical AI 和可复用的软件之间来回移动。",
    "我不太想把自己包装成已经完成的人。仓库里有做完的，也有实验中的；有些只是解决了自己的一个小问题，能留下来继续用，就已经很值得。",
  ],
  principles: ["把事实和猜想分开", "先做能重跑的版本", "承认失败模式", "保持可以继续修改"],
  contact: "如果你刚好也在做学习工具、科研图表或自动化，欢迎从 GitHub 找我。",
};

export const tones = {
  home: "paper",
  garden: "blue",
  projects: "amber",
  workbench: "mint",
  notes: "lavender",
  about: "magenta",
};
