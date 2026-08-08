# Jingjing — 个人主页 / 作品集

单页、六幕、滚动驱动的 WebGL 主页。**零构建**：没有 npm、没有打包器、没有 CI。
把这个目录原样丢进任何静态托管就能跑，双击 `index.html` 也能跑（除了 ES module 的
`file://` 限制，见下）。

主张：*模型只负责提议，证据才裁定完成。*

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
python3 -m http.server 8765     # → http://127.0.0.1:8765/index.html
```

---

## 2. 目录

```
index.html            六个空 <section> + noscript 兜底。内容全部由 JS 注入
.nojekyll             见上
css/
  tokens.css          色板 / 字号 / 间距 / 缓动，唯一的设计变量源
  type.css            字体族与排印
  layout.css          磨砂面板与六幕版式（含 640 / 1000 / 1001px 断点）
  ui.css              光标、章节轨、无 WebGL 兜底
js/
  content.js          ★ 全部文案与数据。改站基本只改这一个文件
  main.js             状态机：滚动 → 幕次 → 取景 / 形变 / 色调，以及 window.__site
  ui/render.js        content.js → DOM
  ui/cursor.js        自定义光标 + 磁吸
  ui/drag.js          第 5 幕分子的物理拖拽（惯性 + 阻尼 + 自动回稳）
  gl/scene.js         六 pass 渲染管线
  gl/glass.js         刻面玻璃：色散折射 / Beer-Lambert 吸收 / 程序化 studio 环境
  gl/morph.js         三态结构体：流体 → Agent 执行图 → 青蒿素分子
  gl/transition.js    幕间着色器转场（柔光带 + 轻色差）
  gl/quality.js       自适应降质三档
  util/anim.js        缓动、阻尼、reduced-motion / QA 开关
vendor/three/         three@0.180.0 ESM 构建（703 KB 原始 / 175 KB gzip）
fonts/*.woff2         9 个子集化字体，合计 153 KB
data/molecule.json    青蒿素 42 原子 / 45 键，PubChem CID 68827 三维构象
```

---

## 3. 改内容

**只改 `js/content.js`。** 它导出六幕的全部文案、项目条目、计数器、索引表。
每个 export 对应一幕：`hero` `thesis` `projectOne` `projectTwo`
`projectThree` + `research` + `molecule` `index6` + `closing`。

改完中文以后**必须重生成字体**，否则新字会掉回系统字体：

```bash
python3 qa/smoke.py            # 跑一遍页面，导出实际用到的字形清单 qa/glyphs.json
python3 tools/build_fonts.py   # 按清单子集化 → site/fonts/*.woff2
```

字体源文件在 `fontsrc/`（Bodoni Moda / Noto Sans SC / IBM Plex Sans / Plex Sans SC /
Plex Mono）。展示中文用 Noto Sans SC Black——IBM Plex Sans SC 最重只到 Bold(700)，
撑不起满出血巨标；正文中文用 IBM Plex Sans SC，和拉丁 Plex 同族，灰度一致。

### 加 / 删区块

- **不加联系方式、不加论文列表**是当前的刻意设定，`qa/test_site.py` 的 T8 会断言
  站内不出现邮箱、不出现 "Publications"。真要加，先改测试再改站，别反过来。
- 新增一幕：`index.html` 加一个 `<section class="act act--x" id="act-x" data-act="6" …>`，
  `content.js` 的 `acts` 数组加一项，`render.js` 加一个 `renderX()`，
  `main.js` 的 `VIEW` 表加一行取景参数。

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
| 墨色 on 柠檬奶油 `#FFE0CC→` | ≥ 8.0 | PASS ← 第 3/4 幕的亲切卡 |
| 墨色 on 黄昏粉 `#F6C9E2` | 7.58 | PASS ← 第 2 幕天幕 |
| 白 on 墨蓝（CTA 药丸） | 11.07 | PASS |

---

## 5. 降级与无障碍

三条路径互相独立，都在 QA 里有断言：

| 情况 | 行为 |
| --- | --- |
| 没有 WebGL2 / context lost | `body.no-webgl`，canvas 隐藏，换成 CSS 天空渐变 + 太阳 / 柔云 + 柠檬色线框 SVG 宝石。六幕文字 100% 可读，天空色调仍随滚动切换 |
| `prefers-reduced-motion: reduce` | 关转场、关相机漂移、关湍流、形变不插值、计数器直接显示终值、锚点跳转用 `auto` |
| 掉帧 | `gl/quality.js` 自动降档：High→Mid 中位 45fps 持续 2s，Mid→Low 25fps 持续 2s；回升需 55fps 持续 5s 且整场只回升一次。触屏 / 窄屏 / ≤4 核起步就是 Mid |

调试用查询参数（真实用户不会带）：

- `?tier=0|1|2` — 锁定画质档（0 High / 1 Mid / 2 Low），会 freeze 自适应逻辑
- `?qa=1` — 冻结时间与随机种子、关转场、计数器直出终值，用来拍可复现的截图

`window.__site` 暴露了 `ready / webgl / morph / act / tone / tier / samples /
fboScale`，以及 `feedFps(fps, seconds)` 和 `forceTier(n)`，供自动化测试注入。

---

## 6. QA

```bash
python3 -m http.server 8765 &       # 站点服务器
python3 qa/test_site.py             # 退出码 = 失败项数
```

T1 冷启动零报错 · T2 六幕 × 三视口 18 张截图 + 横向溢出断言 · T3 形变锚点精确落在
0/1/2 · T4 自适应降质与抖动 · T5 无 WebGL 兜底 · T6 reduced-motion · T7 资源预算 ·
T8 内容完整性（仓库名白名单、fork 不得出现、上游归属、无邮箱、无论文列表）。

产物写到 `qa/shots/`、`qa/qa_report.json`、`qa/qa_report.md`。

**资源预算按 gzip 后的下行字节算**，不是磁盘字节——本地 `http.server` 不压缩，
GitHub Pages 压缩。当前：字体 153 KB（woff2 本身已压缩），首屏关键资源
210 KB gzip（预算 250），three.js 另计 175 KB gzip。

---

## 7. 几个可能会被问到的实现取舍

- **玻璃里那团东西是一个 `LineSegments`**，2400 条线段、一次 draw call、一套顶点
  缓冲。三种形态（流体 / 执行图 / 分子）是同一批顶点在着色器里插值出来的，不是
  三个模型来回切。
- **它被渲染进独立的 FBO，再由玻璃着色器逐波长采样**，所以你看到的弯折是真折射，
  不是叠在上面的贴图。
- **流体态是被球壳封闭的 ABC 流积分流线**：速度场写成 `v = ∇×(g(r)·P(Kx))`，
  散度恒为零；`g(R)=0` 保证壳面上速度严格切向，流线数学上出不去，不需要任何夹取。
  `tools/check_fluid.py` 会数值验证这两条。
- **不做薄膜干涉 / 虹彩**。色散靠把折射强度提到能明显掰弯天空里的光带与云边，
  让逐波长采样在弯折处自然挂出柔和的彩色细边。理由写在 `svg-optimization-skill` 里：
  「高级感来自控制，而不是增加。」
- **页面本身的磨砂白面板是 CSS 背景 + backdrop-filter**，不是贴在半透明玻璃上；
  玻璃仍然是唯一的一层「真折射」，面板只是它脚下轻盈的磨砂舞台。
- **分子不是手摆的**，是 PubChem CID 68827 的三维构象，质心归一化后缩放到单位半径。

---

MIT。文案、数据与仓库信息均可在 `github.com/jing1312` 逐条核验。
