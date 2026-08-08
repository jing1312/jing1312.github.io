/* ============================================================================
   content.js — 全站文案与数据，集中一处。
   改文案只需要动这个文件，不用碰任何逻辑代码。

   规则（请保持）：
   1. 只写能在公开仓库里核验的事实。没有出处的成绩、影响力、合作方不要写。
   2. 数字请与 README 保持一致；改了 README 记得回来同步。
   3. 每一幕的 id 与 css/layout.css 里的 --act-* 变量一一对应，改名要同步。
   ========================================================================= */

export const site = {
  name: "Jingjing",
  title: "Jingjing — 可验证的 Agent 执行基础设施",
  description:
    "Jingjing 的个人主页与作品集：为生物医药科研构建可验证的 Agent 执行基础设施——可信执行、大规模知识摄取、生成质量的机器裁决。",
  lang: "zh-CN",
  github: "https://github.com/jing1312",
  // 审计快照日期，用于 star 数等会变动的数字
  auditedOn: "2026-08-09",
};

/* --------------------------------------------------------------------------
   开关：默认关闭的模块。改成 true 即可启用，无需改其他代码。
   -------------------------------------------------------------------------- */
export const modules = {
  // 论文区。目前不放：没有公开的论文细节时，「N 篇在审」是不可核验的空 claim。
  publications: {
    enabled: false,
    title: "论文",
    latin: "PUBLICATIONS",
    items: [
      // { authors: "", title: "", venue: "", year: 2026, url: "" },
    ],
  },
  // 联系方式。用户明确要求不公开，默认关闭。
  contact: {
    enabled: false,
    title: "联系",
    latin: "CONTACT",
    lines: [
      // { label: "Email", value: "", href: "" },
    ],
  },
};

/* ==========================================================================
   ACT 1 — HERO
   ========================================================================== */
export const hero = {
  id: "hero",
  index: "01 / 06",
  eyebrow: "AI × 生物医药 · AGENT 执行基础设施",
  // 每一行是一个满宽的巨型中文标题行
  titleLines: ["模型只负责提议", "证据才裁定完成"],
  latin: "EVIDENCE OVER ASSERTION",
  lede:
    "我是 Jingjing。我为生物医药科研构建可验证的 Agent 执行基础设施——从可信执行，到大规模知识摄取，到生成质量的机器裁决。",
  meta: [
    { k: "定位", v: "生物医药为面 · Agent 为里" },
    { k: "在找", v: "博士项目 / PhD" },
    { k: "代码", v: "github.com/jing1312" },
  ],
  scrollHint: "向下滚动 · 全篇六幕",
};

/* ==========================================================================
   ACT 2 — 三层主线
   ========================================================================== */
export const thesis = {
  id: "thesis",
  index: "02 / 06",
  kicker: "主线",
  title: "三层主线",
  latin: "THREE LAYERS",
  lede:
    "一个 Agent 想进科研流程，得先回答三个问题：它说做完了，凭什么信；知识从哪来，能不能规模化；产出好不好，谁说了算。我用三个仓库分别回答。",
  layers: [
    {
      no: "I",
      title: "执行可信",
      claim: "不信任模型的计划，用证据裁定完成",
      repo: "daily-digital-twin",
    },
    {
      no: "II",
      title: "知识可规模化摄取",
      claim: "把非结构化多媒体批量转成可检索的知识",
      repo: "skipping-lectures + 2",
    },
    {
      no: "III",
      title: "生成质量可裁决",
      claim: "把审美判断编码成机器可校验的规则",
      repo: "svg-optimization-skill",
    },
  ],
  outro: "下一步，是把这套「证据裁定」的架构，用到真实的生物医药研究流程上。",
};

/* ==========================================================================
   ACT 3 — 项目 I：daily-digital-twin
   ========================================================================== */
export const projectOne = {
  id: "p1",
  index: "03 / 06",
  no: "01",
  kicker: "层 I · 执行可信",
  repo: "daily-digital-twin",
  url: "https://github.com/jing1312/daily-digital-twin",
  lang: "JavaScript · Node 24",
  license: "MIT",
  title: "让「完成」变成可证伪的断言",
  quote: "The remote model is a planning component, not a trusted executor.",
  quoteZh: "远端模型是一个规划组件，不是可信的执行者。",
  body:
    "手机通过飞书提交任务，远端模型给出计划——但那份计划在这里被当成不可信输入。本地运行时先审策略，再经受控适配器执行，最后必须拿到可观测的证据，才允许报告完成。",
  // 架构流：会同步高亮 3D 有向图上对应的节点
  flow: ["飞书任务", "远端模型 · 不可信计划", "策略审查", "受控执行", "证据核验", "脱敏回执"],
  evidenceGateIndex: 4, // flow 里高亮为「证据门」的那一节
  points: [
    {
      t: "证据门",
      d: "拿不到进程 / 窗口 / 页面 / 文件证据的任务，一律降级为 partial，不写成功。",
    },
    {
      t: "Fail-closed 资源策略",
      d: "遥测缺失或无效时给出零执行槽位，而不是宽松默认。",
    },
    {
      t: "人工确认门",
      d: "删除、覆盖、上传、支付、发消息、公开发帖，六类动作必须人工点头。",
    },
    {
      t: "132 个 Node 单测",
      d: "覆盖任务状态、调度、身份绑定、资源锁、脱敏、证据核验等不变量。",
    },
    {
      t: "Linux + Windows 双 CI",
      d: "Node 24，附带隐私审计、CLI 冒烟测试、PowerShell 解析与编码检查。",
    },
    {
      t: "零第三方运行时依赖",
      d: "只用 node:sqlite / node:test 等标准库组件，连 npm install 这一步都没有。",
    },
    {
      t: "默认最小权限",
      d: "调度器默认休眠；首个飞书发送者绑定为 owner，之后的发送者一律拒绝。",
    },
    {
      t: "私有状态出仓",
      d: "验证码只传给活动页面、不写进回执；私有状态在 DAILY_TWIN_HOME，仓库内没有 fallback。",
    },
  ],
  honestyLabel: "边界",
  honesty:
    "状态表里写得很清楚：内置执行器目前仍是安全占位符，返回 partial；真实的机器相关执行必须私下配置。仓库自述为实验性个人自动化框架，不是通用自主 Agent，也不是安全认证产品。我不打算把它讲成别的样子。",
};

/* ==========================================================================
   ACT 4 — 项目 II：skipping-lectures 三件套
   ========================================================================== */
export const projectTwo = {
  id: "p2",
  index: "04 / 06",
  no: "02",
  kicker: "层 II · 知识可规模化摄取",
  repo: "skipping-lectures",
  url: "https://github.com/jing1312/skipping-lectures",
  siblings: [
    {
      repo: "xiangzhang-course-pipeline",
      url: "https://github.com/jing1312/xiangzhang-course-pipeline",
      role: "平台录播 → 转写",
    },
    {
      repo: "baidu-ai-batch",
      url: "https://github.com/jing1312/baidu-ai-batch",
      role: "网盘 AI 批量导出",
    },
  ],
  lang: "Python · JavaScript",
  license: "MIT",
  title: "13GB 视频，压成一页纸",
  counters: [
    { value: 153, suffix: "", unit: "节录播", note: "4 门专业课 · 13GB" },
    { value: 146, suffix: "", unit: "份课件 PPT", note: "AI 自动生成并导出" },
    { value: 122, suffix: "", unit: "份讲稿", note: "全程无人值守" },
    { value: 55, suffix: "+", unit: "份笔记", note: "另有逐节带时间戳转写" },
  ],
  body:
    "一学期 153 节录播、13GB 视频。两条路线并行：平台录播用 ffmpeg 直接从签名直链抽 16kHz 单声道音频（一节不到 100MB，视频根本不落地）再送 ASR；网盘视频走网盘 AI，批量出课件 PPT、讲稿、笔记。skipping-lectures 本身是把这两条链路编排起来的 Agent Skill。",
  craft: [
    "直链是签名的，过期就 401/403 —— 自动重刷后接着跑，不从头再来。",
    "断点续传：中断只补没完成的；单节失败自动跳过，事后重跑。",
    "识别 AI 生成失败时返回的占位模板，不留空壳文件。",
    "手动做同一件事，是 450+ 次「打开 → 触发 → 等待 → 导出」，至少盯一整天。",
  ],
  asrTitle: "ASR 选型：四家实测横评",
  asr: [
    { name: "火山引擎豆包", verdict: "主方案", note: "提交式、支持长音频、快、免费额度大", primary: true },
    { name: "小米 MiMo", verdict: "备选", note: "单次 ≤7MB 或 ≤20 分钟，超长自动切片后合并" },
    { name: "阿里云录音文件识别", verdict: "可用", note: "慢，排队久" },
    { name: "讯飞语音听写", verdict: "弃用", note: "并发受限、长音频需切片组包" },
  ],
  footer:
    "第一批真实负载是四门药学课：药物分析、临床药理学、生物药剂与药物动力学、天然药物化学。CI 每次 push 跑仓库验证器，test-prompts.json 里放着 3 个真实场景回归测试。",
};

/* ==========================================================================
   ACT 5 — 项目 III：svg-optimization-skill + 研究方向
   ========================================================================== */
export const projectThree = {
  id: "p3",
  index: "05 / 06",
  no: "03",
  kicker: "层 III · 生成质量可裁决",
  repo: "svg-optimization-skill",
  url: "https://github.com/jing1312/svg-optimization-skill",
  lang: "JavaScript",
  title: "把「好看」写成门禁",
  quote: "高级感来自控制，而不是增加。",
  body:
    "大多数 AI 生成视觉的问题不是不会画，是没有系统：元素堆叠没有视觉中心、渐变和玻璃效果滥用、字体层级混乱、配色随机、每次生成都是另一种风格。这个 skill 把 SVG 从「效果生成」改成「视觉系统生成」。",
  modelTitle: "三层视觉决策模型",
  model: ["Archetype", "Palette", "Layout"],
  archetypes: ["Dreamlight", "Editorial", "Material Craft", "Glass Intelligence", "Mono System"],
  paletteTitle: "颜色不是装饰，是角色",
  paletteRoles: ["surface", "ink", "accent", "material", "shadow", "glow"],
  pipelineTitle: "质量流水线",
  pipeline: ["Design Intent", "Structural Validation", "Aesthetic Review", "Release"],
  checks: ["XML 检查", "引用完整性", "几何验证", "对比度检查", "排版审查", "材质审查", "动效审查"],
  bannedTitle: "禁止",
  banned: ["随机光球", "无意义渐变", "玻璃效果堆叠", "元素拼贴", "模板化卡片布局"],
  philosophy: "门禁保证 SVG 不坏。设计系统保证 SVG 不普通。",
  selfCheckLabel: "自检",
  selfCheck:
    "你现在看的这一页，就是照这套规则做的：全站只有一个主视觉，那颗玻璃宝石——它折射的是真实的天空；版面用磨砂白面板衬托它，强调色取自一个夏天的糖果色。",
};

export const research = {
  id: "research",
  kicker: "研究方向",
  latin: "WHAT NEXT",
  title: "证据裁定，落到湿实验旁边",
  paras: [
    "三层加起来其实是同一件事：让自动化系统的每一步产出都带上可核验的凭据。",
    "生物医药是最需要这件事的领域——文献与实验记录高度非结构化，结论链条长，而错误的代价最终由病人承担。一个在读文献、设计实验、解读数据时会「流畅地编下去」的 Agent，在这里是负资产。",
    "我想做的博士课题，是把「证据裁定」这套架构落进真实的研究流程：每一个「完成」都能追溯到具体证据，拿不出证据就必须降级——而不是把不确定性藏进一段通顺的话里。",
  ],
  stack: [
    { k: "学科底子", v: "天然药物化学 · 药物分析 · 临床药理学 · 生物药剂与药物动力学" },
    { k: "工程", v: "Agent 系统设计 · 全栈 · 浏览器与桌面自动化 · CI 与可审计流水线" },
    { k: "方法主张", v: "证据高于断言 · fail-closed · 边界写在 README 里" },
  ],
  // 这段是 agent 起草的，请逐句改成你自己的说法。
  draftNotice: "本段为初稿，交付后请逐句改成你自己的表述。",
};

/* 分子说明 —— 与 data/molecule.json 对应；青蒿素同时出现在 flashcard-pharm 里 */
export const molecule = {
  nameZh: "青蒿素",
  nameEn: "Artemisinin",
  formula: "C15H22O5",
  formulaPretty: "C₁₅H₂₂O₅",
  facts: ["42 原子 / 45 键", "倍半萜内酯（过氧化物）· 抗疟", "PubChem CID 68827 · 3D conformer"],
  why:
    "这个结构不是随便挑的：它是 flashcard-pharm 闪卡里的一张答案——「青蒿素 · 倍半萜内酯(过氧化物) · 抗疟」。",
  dragHint: "拖动它",
};

/* ==========================================================================
   ACT 6 — 索引 + 结尾
   ========================================================================== */
export const index6 = {
  id: "index",
  kicker: "索引",
  title: "其余公开仓库",
  latin: "THE REST",
  lede: "不作代表作，但都是真在跑的东西。",
  items: [
    {
      repo: "nature-figure-skill",
      url: "https://github.com/jing1312/nature-figure-skill",
      lang: "Python",
      stars: 49,
      desc: "论文配图生产工作流：图表契约、阻断式后端门禁、独立图集导出、语义配色，Python / R 单后端全套交付。",
      attribution: {
        text: "派生快照 · 基于 Yuan1z0825/nature-skills（袁一哲及贡献者），非原仓库，不声称替代上游",
        upstream: "https://github.com/Yuan1z0825/nature-skills",
        upstreamName: "Yuan1z0825/nature-skills",
      },
    },
    {
      repo: "access-jingtujiaoxue",
      url: "https://github.com/jing1312/access-jingtujiaoxue",
      lang: "JavaScript",
      desc: "浏览器扩展：导出景图智慧教学平台的课程练习题与隐藏答案，数据只留在本地，59 项测试通过。",
    },
    {
      repo: "flashcard-pharm",
      url: "https://github.com/jing1312/flashcard-pharm",
      lang: "HTML",
      desc: "天然药物化学结构记忆闪卡：看结构 → 写俗名 + 二级结构类型 + 临床用途。第 5 幕那颗分子就出自这里。",
    },
    {
      repo: "TCM-Study-Materials",
      url: "https://github.com/jing1312/TCM-Study-Materials",
      lang: "TypeScript · React 19",
      desc: "《中医药学概论》三天速成套件：学习计划、速记卡片、重点口诀、自测模拟，设计原则是「清晰、克制、可信」。",
    },
  ],
  starNote: "star 数为 2026-08-09 快照。",
};

export const closing = {
  id: "closing",
  index: "06 / 06",
  kicker: "结尾",
  title: "我在找什么",
  latin: "OPEN TO",
  body:
    "我在找一个博士项目，能让我把这套「证据高于断言」的方法，用到真实的生物医药问题上。代码都在 GitHub 上，可以直接读，也可以直接开 issue。",
  cta: { label: "github.com/jing1312", url: "https://github.com/jing1312" },
  colophonTitle: "关于这一页",
  colophon: [
    "这页本身也是一件作品，所以按同一套标准做：",
    "全站唯一的第三方运行时依赖是 three.js —— 刻意对齐 daily-digital-twin 的零依赖主张。",
    "无构建步骤、无后端、无分析脚本、无第三方追踪。",
    "玻璃是双通道折射：背面深度求厚度，正面按 R / G / B 各自的折射率取样，色散是算出来的，不是贴上去的。",
    "玻璃里那团结构一路形变：流体 → Agent 执行图 → 青蒿素分子。三种形态共用一套顶点缓冲、一次 draw call；它被画在玻璃体内部，所以你看到的弯折是真折射，不是叠上去的贴图。",
    "青蒿素的 42 个原子、45 根键来自 PubChem CID 68827 的三维构象，不是手摆的。",
  ],
  footer: "© 2026 Jingjing · 内容与代码均可核验",
};

/* 幕次注册表 —— 顺序即滚动顺序，3D 状态机按这个表推进 */
export const acts = [
  { id: "hero", morph: 0.0, tone: "paper" },
  { id: "thesis", morph: 0.0, tone: "blue" },
  { id: "p1", morph: 1.0, tone: "paper" },
  { id: "p2", morph: 1.0, tone: "amber" },
  { id: "p3", morph: 2.0, tone: "magenta" },
  { id: "closing", morph: 2.0, tone: "paper" },
];
