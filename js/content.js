/* 全站可见内容与项目事实。只写可在公开仓库中核验的信息。 */

export const site = {
  name: "Jingjing",
  title: "Jingjing — 生物医药 × 可验证 Agent 系统",
  description: "Jingjing 的个人主页与作品集：为生物医药科研构建以证据裁定完成的 Agent 执行基础设施。",
  lang: "zh-CN",
  github: "https://github.com/jing1312",
  auditedOn: "2026-08-09",
};

export const nav = [
  { label: "主线", href: "#principles" },
  { label: "代表作", href: "#work" },
  { label: "研究方向", href: "#research" },
  { label: "其他项目", href: "#more" },
];

export const hero = {
  eyebrow: "AI × 生物医药 · VERIFIABLE AGENT SYSTEMS",
  title: "让 Agent 的每一步，\n都有证据。",
  lede: "我是 Jingjing。我在做一套面向生物医药科研的 Agent 基础设施：模型负责提出方案，受控系统负责执行，证据负责裁定是否完成。",
  status: "正在寻找博士项目 / PhD",
  primary: { label: "查看代表作", href: "#work" },
  secondary: { label: "GitHub", href: "https://github.com/jing1312" },
  signals: ["可信执行", "规模化知识摄取", "生成质量裁决"],
};

export const principles = {
  eyebrow: "THREE LAYERS",
  title: "把“完成了”拆成三个可验证问题",
  lede: "一个 Agent 想进入科研流程，不能只靠语言流畅。它必须能证明执行发生过、知识来源可追溯、产出质量经过明确规则裁决。",
  items: [
    {
      no: "01",
      title: "执行可信",
      body: "不信任模型的计划；策略审查、受控执行，再用可观测证据决定任务状态。",
      repo: "daily-digital-twin",
      href: "#project-daily-digital-twin",
    },
    {
      no: "02",
      title: "知识可规模化摄取",
      body: "把录播、课件与讲稿批量转成可检索材料，并能断点续传、识别失败、继续运行。",
      repo: "skipping-lectures + 2",
      href: "#project-skipping-lectures",
    },
    {
      no: "03",
      title: "生成质量可裁决",
      body: "把结构、对比度、排版、材质和动效要求写进机器可检查的质量流水线。",
      repo: "svg-optimization-skill",
      href: "#project-svg-optimization-skill",
    },
  ],
};

export const featuredProjects = [
  {
    id: "daily-digital-twin",
    no: "01",
    layer: "执行可信",
    title: "让“完成”变成可证伪的断言",
    repo: "daily-digital-twin",
    url: "https://github.com/jing1312/daily-digital-twin",
    meta: ["JavaScript", "Node 24", "MIT"],
    problem: "远端模型会给出计划，但计划本身不是可信执行。没有进程、窗口、页面或文件证据，就不该报告成功。",
    approach: "本地运行时把模型输出视为不可信输入：先审策略，再通过受控适配器执行，最后经过证据门，才允许生成脱敏回执。",
    flow: ["任务", "不可信计划", "策略审查", "受控执行", "证据门", "脱敏回执"],
    evidence: [
      { value: "132", label: "个 Node 单测" },
      { value: "2", label: "套系统 CI" },
      { value: "0", label: "第三方运行时依赖" },
    ],
    details: [
      "删除、覆盖、上传、支付、发消息、公开发帖六类动作必须人工确认。",
      "遥测缺失或无效时给出零执行槽位，采用 fail-closed，而不是宽松默认。",
      "私有状态与验证码不进入公开回执；仓库内没有私有状态 fallback。",
    ],
    boundary: "内置执行器目前仍是安全占位符并返回 partial；真实机器相关执行必须私下配置。它是实验性个人自动化框架，不是安全认证产品。",
  },
  {
    id: "skipping-lectures",
    no: "02",
    layer: "知识可规模化摄取",
    title: "13GB 视频，压成一页纸",
    repo: "skipping-lectures",
    url: "https://github.com/jing1312/skipping-lectures",
    meta: ["Python", "JavaScript", "MIT"],
    problem: "一学期 153 节录播、13GB 视频，手动完成“打开—触发—等待—导出”需要 450 次以上操作。",
    approach: "平台录播直接抽取 16kHz 单声道音频后送 ASR；网盘视频走批量 AI 导出。两条链路由 Skill 编排，支持断点续传、失败跳过和占位结果识别。",
    evidence: [
      { value: "153", label: "节录播" },
      { value: "146", label: "份课件 PPT" },
      { value: "122", label: "份讲稿" },
      { value: "55+", label: "份笔记" },
    ],
    details: [
      "签名直链过期出现 401/403 时自动刷新并续跑，不从头重来。",
      "单节失败自动跳过；识别 AI 生成失败的占位模板，不留下空壳文件。",
      "四家 ASR 实测横评后，以火山引擎豆包为主方案，小米 MiMo 为备选。",
    ],
    siblings: [
      { label: "xiangzhang-course-pipeline", url: "https://github.com/jing1312/xiangzhang-course-pipeline" },
      { label: "baidu-ai-batch", url: "https://github.com/jing1312/baidu-ai-batch" },
    ],
    boundary: "这些数字来自四门药学课程的真实处理负载；仓库测试覆盖流程回归，不等同于对所有平台和所有 ASR 服务的普适保证。",
  },
  {
    id: "svg-optimization-skill",
    no: "03",
    layer: "生成质量可裁决",
    title: "把“好看”写成门禁",
    repo: "svg-optimization-skill",
    url: "https://github.com/jing1312/svg-optimization-skill",
    meta: ["JavaScript", "Agent Skill"],
    problem: "AI 生成视觉常见的问题不是不会画，而是缺少稳定系统：没有视觉中心、层级混乱、材质滥用、每次生成都是另一种风格。",
    approach: "先明确设计意图，再依次检查结构完整性与审美质量；把 XML、引用、几何、对比度、排版、材质与动效变成发布前门禁。",
    flow: ["Design intent", "Structure", "Aesthetic review", "Release"],
    evidence: [
      { value: "3", label: "层视觉决策" },
      { value: "7", label: "类质量检查" },
      { value: "1", label: "套角色化配色" },
    ],
    details: [
      "视觉决策拆为 Archetype、Palette、Layout 三层。",
      "颜色被定义为 surface、ink、accent、material、shadow、glow 等角色。",
      "明确禁止随机光球、无意义渐变、玻璃效果堆叠与模板化卡片。",
    ],
    boundary: "结构门禁能防止 SVG 损坏，但审美判断仍需要独立复核；规则减少随机性，不宣称替代设计判断。",
  },
];

export const research = {
  eyebrow: "RESEARCH DIRECTION",
  title: "把证据裁定，放到湿实验旁边",
  intro: "生物医药研究的文献与实验记录高度非结构化，结论链条长，错误成本高。这里需要的不是更会“说完成”的 Agent，而是知道什么时候必须降级、追问或停下来的系统。",
  paragraphs: [
    "我希望把“证据高于断言”的架构落进真实研究流程：文献摄取、实验设计、数据解释和结果归档中的每一个完成状态，都能追溯到具体凭据。",
    "拿不出证据就必须标记为 partial 或 unknown，而不是把不确定性藏在一段顺畅的话里。",
  ],
  stack: [
    { label: "学科基础", value: "天然药物化学 · 药物分析 · 临床药理学 · 生物药剂与药物动力学" },
    { label: "工程能力", value: "Agent 系统设计 · 全栈 · 浏览器与桌面自动化 · CI 与可审计流水线" },
    { label: "方法主张", value: "证据高于断言 · fail-closed · 明确写出边界" },
  ],
};

export const otherProjects = {
  eyebrow: "SELECTED REPOSITORIES",
  title: "其他正在运行的项目",
  note: "Star 数为 2026-08-09 快照。",
  items: [
    {
      repo: "nature-figure-skill",
      url: "https://github.com/jing1312/nature-figure-skill",
      lang: "Python",
      stars: 49,
      desc: "论文配图生产工作流：图表契约、阻断式后端门禁、独立图集导出与语义配色。",
      attribution: {
        text: "派生快照，基于 Yuan1z0825/nature-skills（袁一哲及贡献者），非原仓库，不声称替代上游。",
        url: "https://github.com/Yuan1z0825/nature-skills",
      },
    },
    {
      repo: "access-jingtujiaoxue",
      url: "https://github.com/jing1312/access-jingtujiaoxue",
      lang: "JavaScript",
      desc: "浏览器扩展：导出课程练习题与隐藏答案，数据只保留在本地，59 项测试通过。",
    },
    {
      repo: "flashcard-pharm",
      url: "https://github.com/jing1312/flashcard-pharm",
      lang: "HTML",
      desc: "天然药物化学结构记忆闪卡；Evidence Core 使用的青蒿素结构来自同一学习项目。",
    },
    {
      repo: "TCM-Study-Materials",
      url: "https://github.com/jing1312/TCM-Study-Materials",
      lang: "TypeScript · React 19",
      desc: "《中医药学概论》学习套件：学习计划、速记卡片、重点口诀和自测模拟。",
    },
  ],
};

export const molecule = {
  name: "青蒿素 / Artemisinin",
  formula: "C₁₅H₂₂O₅",
  source: "PubChem CID 68827",
  facts: "42 原子 · 45 键 · 三维构象",
};

export const closing = {
  eyebrow: "OPEN TO",
  title: "寻找一个能把系统带进真实科研流程的博士项目。",
  body: "如果你也关心可验证 Agent、生物医药知识基础设施或实验流程中的证据链，所有代码都可以直接查看，也可以在 GitHub 开 issue。",
  cta: { label: "github.com/jing1312", url: "https://github.com/jing1312" },
  footer: "© 2026 Jingjing · 内容与代码均可核验",
};
