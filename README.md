# jingjing — 研究花园

一个多视图的个人主页，内容来自 `jing1312` 的公开 GitHub 仓库。

页面没有后端、登录、统计脚本或第三方 API。Three.js 作为本地 ESM 文件放在
`vendor/three/`，其余交互由原生 JavaScript 完成。

## 页面

- 首页：个人介绍与 3D 主视觉
- 花园：按学习、流程、图表三个方向浏览
- 项目：筛选项目，展开查看背景、完成状态和下一步
- 工作台：做事方式与常用工具
- 笔记：正在进行、已经确认和以后想试的方向
- 关于我：简介、原则和 GitHub 入口

导航使用 URL hash，例如 `#projects`。刷新后仍会保留当前页面，也适合 GitHub
Pages 这类纯静态托管。

## 本地预览

```powershell
node tools/serve.mjs
```

打开 `http://127.0.0.1:8765/`。

## 部署到 GitHub Pages

仓库内容可以直接作为 Pages 根目录发布。保留 `.nojekyll`，确保 `vendor/` 和字体
文件按原路径访问。所有链接和资源路径都是相对路径，不依赖本机文件夹。

## 修改内容

- `js/content.js`：导航、文案、项目和笔记数据
- `js/ui/render.js`：视图结构、筛选、展开栏和 hash 导航
- `css/tokens.css`：颜色、阴影、圆角和间距
- `css/layout.css`：页面布局与响应式规则
- `js/main.js`：页面状态与 Three.js 天空、珠链之间的连接
- `assets/`：主页使用的本地图片

## 隐私

站内只放公开 GitHub 资料，不包含邮箱、手机号、Cookie、Token、电脑用户名或本地
文件路径。图片会随项目一起发布，不会从下载目录读取。

MIT。图片素材由站点所有者提供，Three.js 遵循其原许可证。
