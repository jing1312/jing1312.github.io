# jingjing — 个人主页 / 作品集

单页、四幕、滚动驱动的 WebGL 主页。**零构建**：没有 npm、没有打包器、没有 CI。
把这个目录原样丢进任何静态托管就能跑，双击 `index.html` 也能跑（除了 ES module 的
`file://` 限制，见下）。

内容全部在 `js/content.js`（Hero / 关于 / 项目 / 联系），背景是一片会随滚动换色的
夏日天空，浮着一串由 9 颗玻璃珠串成的珠链缓缓自转（`js/gl/chain.js`）。

---

## 1. 部署（GitHub Pages）

本目录的内容**就是仓库根**。路径全是相对的，不需要改任何一行代码。

**A. 用户主页仓库（当前采用，地址最干净）**

仓库名必须正好是 `jing1312.github.io`。推到默认分支，Pages 自动生效，
不用进 Settings。

```bash
git clone https://github.com/jing1312/jing1312.github.io
cd jing1312.github.io
cp -R /解压出来的目录/. .          # 覆盖同名文件即可
git add -A && git commit -m "site" && git push
```
→ `https://jing1312.github.io/`

首次生效通常 1–3 分钟。

**B. 任意仓库 + Pages**

把本目录内容放到仓库根或 `docs/` 下，然后 Settings → Pages 选分支 +
`/ (root)` 或 `/docs`。
→ `https://jing1312.github.io/<repo>/`

**`.nojekyll` 必须保留。** 它是个空文件，作用是让 Pages 跳过 Jekyll 处理，
避免 `vendor/` 这类目录被某些 Jekyll 版本按 Ruby 约定过滤掉。删了它可能出现
「本地好好的，线上 three.js 404」。

**本地预览**：ES module + `fetch()` 不能走 `file://`，起个静态服务器：

```bash
npx http-server -p 8765 .      # → http://127.0.0.1:8765/index.html
```

---

## 2. 目录

```
index.html            四个空 <section> + noscript / 无 WebGL 兜底。内容由 JS 注入
.nojekyll             见上
css/
  tokens.css          色板 / 字号 / 间距 / 缓动，唯一的设计变量源
  type.css            字体族与排印（.hero__name 英雄名等）
  fonts.css           ★ 生成产物：@font-face + unicode-range，别手改
  layout.css          磨砂面板与四幕版式（含 640 / 1000 / 1001px 断点）
  ui.css              光标、章节轨、无 WebGL 兜底、打印样式
js/
  content.js          ★ 全部文案与数据。改站基本只改这一个文件
  main.js             状态机：滚动 → 幕次 → 取景 / 色调 / 珠链，以及 window.__site
  ui/render.js        content.js → DOM
  ui/cursor.js        自定义光标 + 磁吸
  gl/scene.js         渲染管线：背景 FBO → 转场 FBO → blit + 珠链叠加
  gl/chain.js         玻璃珠链：CatmullRom 曲线排布 9 珠 + 8 节，着色器里折射天空
  gl/transition.js    幕间着色器转场（柔光带 + 轻色差）
  gl/quality.js       自适应降质三档
  util/anim.js        缓动、阻尼、reduced-motion / QA 开关
vendor/three/         three@0.180.0 ESM 构建（703 KB 原始 / 175 KB gzip）
fonts/*.woff2         69 个子集化字体（按页面实际用字生成，合计约 2.0 MB）
```

---

## 3. 改内容

**只改 `js/content.js`。** 它导出四幕的全部文案与数据：`hero` / `about` /
`projects`（8 张真实仓库卡片）/ `contact`（含 colophon），以及 `acts` 注册表
（每幕的 `tone`，对应 `main.js` 的 `TONE` 表）。

改完中文以后**必须重生成字体**，否则新字会掉回系统字体：

```bash
node C:\WINDOWS\TEMP\opencode\fonts\build.mjs     # 重新子集化 → fonts/*.woff2 + css/fonts.css
```

字体管线：从 npm 的 `@fontsource/*` 包（Bodoni Moda / Noto Sans SC /
IBM Plex Sans / IBM Plex Mono）按 `content.js` 实际用字裁剪为带
`unicode-range` 的子集 woff2，中文每块 307 字符、拉丁逐字，共 69 个文件。
没有 python 也能跑；子集脚本只依赖 Node + npm 装的字体包。

### 加 / 删区块

- **不加联系方式、不加论文列表**是当前的刻意设定，`qa/test_site.py` 的 T8 会断言
  站内不出现邮箱、不出现 "Publications"。真要加，先改测试再改站，别反过来。
- 新增一幕：`index.html` 加一个 `<section class="act act--x" id="act-x" …>`，
  `content.js` 的 `acts` 数组加一项，`render.js` 加一个 `renderX()`，
  `main.js` 的 `VIEW` 与 `TONE` 表各加一行。

---

## 4. 换色

色板有**两处**，必须同步改：

1. `css/tokens.css` — DOM 侧（`--paper` `--ink` `--spec-a…f` `--sky-*`）
2. `js/main.js` 顶部的 `TONE` 表 — WebGL 侧（每幕的 `skyTop` / `skyBottom` / `sun` /
   `sunPos` / `tintA` / `tintB` / `rim` / `envTop` / `envBottom`）

背景天空渐变挂在 WebGL 层（`js/gl/scene.js` 的天空 shader），CSS 的 `--sky-*`
只用于兜底与 meta，两者在 `TONE` 表里共用同一组值。

改完请重算对比度。当前实测（WCAG AA 正文 4.5:1，正文全站深海军蓝）：

| 组合 | 对比度 | |
| --- | --- | --- |
| 墨色 `#2E3A55` on 面板白 | 11.07 | PASS |
| 墨色 on 柠檬奶油 `#FFF3C9` | ≥ 8.0 | PASS ← 项目幕天幕 |
| 墨色 on 黄昏粉 `#F6C9E2` | 7.58 | PASS ← 关于幕天幕 |
| 白 on 墨蓝（CTA 药丸） | 11.07 | PASS |

---

## 5. 降级与无障碍

三条路径互相独立，都在 QA 里有断言：

| 情况 | 行为 |
| --- | --- |
| 没有 WebGL2 / context lost | `body.no-webgl`，canvas 隐藏，换成 CSS 天空渐变 + 太阳 / 柔云 + 柠檬色珠链线框 SVG。四幕文字 100% 可读，天空色调仍随滚动切换 |
| `prefers-reduced-motion: reduce` | 关转场、关相机漂移、珠链定格到固定帧、锚点跳转用 `auto` |
| 掉帧 | `gl/quality.js` 自动降档：High→Mid 中位 45fps 持续 2s，Mid→Low 25fps 持续 2s；回升需 55fps 持续 5s 且整场只回升一次。触屏 / 窄屏 / ≤4 核起步就是 Mid |

调试用查询参数（真实用户不会带）：

- `?tier=0|1|2` — 锁定画质档（0 High / 1 Mid / 2 Low），会 freeze 自适应逻辑
- `?qa=1` — 冻结时间与随机种子、关转场、珠链停在固定帧，用来拍可复现的截图

`window.__site` 暴露了 `ready / webgl / act / tone / tier / chainSpin / fboScale /
quality`，以及 `feedFps(fps, seconds)`、`forceTier(n)`、`pick(x%, y%)`（读取某点
渲染像素，用于无头验证），供自动化测试注入。

---

## 6. QA

```bash
node qa/… 或现成的 puppeteer 脚本（本机服务 http://127.0.0.1:8766）
```

T1 冷启动零报错 · T2 四幕 × 三视口截图 + 横向溢出断言 · T3 每幕色调锚点
（paper / blue / amber / magenta）· T4 自适应降质与抖动 · T5 无 WebGL 兜底 ·
T6 reduced-motion（珠链冻结 + 卡片 ≥ 6）· T7 资源预算 · T8 内容完整性
（仓库名白名单、fork 不得出现、上游归属、无邮箱、无论文列表）。

**资源预算按磁盘字节算**（woff2 已压缩，gzip 无额外收益）。当前首屏字体约
2.0 MB、40 个子集按需加载（预算 3 MB），three.js 175 KB gzip 另计。

---

## 7. 几个可能会被问到的实现取舍

- **珠链不是动画模型**：9 颗玻璃珠 + 8 根细管沿一条三次 Catmull-Rom 样条布点，
  整体绕 Y 轴缓慢自转，每颗珠带微小的呼吸缩放。一次 draw call 一组顶点。
- **珠的折射是真的**：珠子着色器以屏幕坐标为输入采样「天空 FBO」做 uv 偏移，
  配合菲涅尔白边与太阳高光，所以你看到的天光弯折是逐像素算出来的，不是贴图。
- **背景是两层混色**：每幕两档天空渐变色（`uSkyTopA/B`）在 CPU 侧插值——
  滚动跨幕时天空、太阳位置、云量、环境色同时缓动，配色都在 `TONE` 表里。
- **不做薄膜干涉 / 虹彩**。高级感来自控制，而不是增加。
- **磨砂白面板是 CSS 背景 + backdrop-filter**，不是贴在半透明玻璃上；珠链
  是唯一的一层「真折射」。
- **页面图标也换成珠链线框**（内联 SVG），无 WebGL 时作为静态兜底图。

---

MIT。文案、数据与仓库信息均可在 `github.com/jing1312` 逐条核验。