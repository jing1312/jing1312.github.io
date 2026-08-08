# 中医药学概论学习资料 · TCM Study Materials

![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=0b1720)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwindcss&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222?logo=github&logoColor=white)

一个面向《中医药学概论》短期复习的轻量学习套件，整合 **3 天学习计划、速记卡片、重点口诀、自测模拟** 四个模块，适合在电脑、平板和手机上快速刷重点、记口诀、做自测、跟踪掌握进度。

> 项目以“清晰、克制、可信”为设计原则，尽量减少花哨干扰，把重点放在知识点扫描、长时间阅读和移动端适配上。

## 🔗 在线预览

- 在线地址：[https://jing1312.github.io/TCM-Study-Materials/](https://jing1312.github.io/TCM-Study-Materials/)
- 仓库地址：[https://github.com/jing1312/TCM-Study-Materials](https://github.com/jing1312/TCM-Study-Materials)

## ✨ 功能亮点

| 模块 | 说明 | 适合场景 |
| --- | --- | --- |
| 📅 学习计划 | 按 3 天复习节奏拆分章节、时段、知识点和完成状态 | 临考前制定节奏、按清单推进 |
| 🧠 速记卡片 | 支持章节筛选、搜索、翻牌、掌握状态、进度统计和自定义卡片 | 高频考点背诵、错点回刷 |
| 📌 重点口诀 | 按模块整理重点难点、口诀、表格和考试提醒 | 快速记忆易混知识点 |
| 📝 自测模拟 | 提供模拟题练习和自测入口 | 检查掌握情况、考前查漏补缺 |

## 📱 适配与体验

- 支持桌面、平板、手机多端访问。
- 宽表格在移动端保留表头和表格结构，并支持局部横向滑动查看。
- 学习计划和速记卡片状态使用 `localStorage` 保存，刷新页面后仍可保留进度。
- 首页采用学习套件导航，可在四个模块之间快速切换。
- 提供“返回顶部”等辅助操作，适合长页面阅读。

## 🧩 页面入口

| 页面 | 文件 |
| --- | --- |
| 学习套件首页 | `index.html` / `中医药学概论_3天备考全套.html` |
| 3 天学习计划 | `3天学习计划.html` |
| 速记卡片 | `速记卡片.html` |
| 重点难点口诀 | `重点难点口诀.html` |
| 自测模拟题 | `自测模拟题.html` |

## 🛠️ 技术栈

- [Vite](https://vite.dev/)：前端构建工具
- [React](https://react.dev/)：交互式学习套件和速记卡片页面
- [TypeScript](https://www.typescriptlang.org/)：类型约束
- [Tailwind CSS](https://tailwindcss.com/)：样式系统
- [Lucide React](https://lucide.dev/)：图标
- 静态 HTML：学习计划、重点口诀、自测题等内容页面

## 🚀 本地运行

### 1. 克隆仓库

```bash
git clone https://github.com/jing1312/TCM-Study-Materials.git
cd TCM-Study-Materials
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务

```bash
npm run dev
```

默认会启动在本机地址：

```text
http://127.0.0.1:5173/
```

### 4. 构建生产版本

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

### 5. 本地预览生产构建

```bash
npm run preview
```

## 📦 GitHub Pages 部署

项目的 Vite 配置使用：

```ts
base: './'
```

这意味着构建后的资源路径适合部署到 GitHub Pages 的仓库子路径，例如：

```text
https://jing1312.github.io/TCM-Study-Materials/
```

推荐部署方式：

1. 在 GitHub 仓库进入 `Settings`。
2. 打开 `Pages`。
3. 选择 GitHub Actions 或配置发布分支。
4. 确保部署产物来自 `npm run build` 生成的 `dist/`。

如果使用 GitHub Actions，可以参考下面的基础工作流：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 📁 项目结构

```text
TCM-Study-Materials/
├─ index.html                         # 学习套件首页入口
├─ 中医药学概论_3天备考全套.html        # 套件页入口
├─ 3天学习计划.html                    # 3 天学习计划
├─ 速记卡片.html                       # 速记卡片入口
├─ 重点难点口诀.html                   # 重点口诀与难点速记
├─ 自测模拟题.html                     # 自测模拟题
├─ PRODUCT.md                         # 产品定位与设计原则
├─ package.json                       # 项目脚本与依赖
├─ vite.config.ts                     # Vite 多入口构建配置
├─ scripts/
│  └─ clean-dist.mjs                  # 构建前清理 dist
└─ src/
   ├─ main.tsx                        # React 入口
   ├─ App.tsx                         # 应用路由/入口判断
   ├─ styles.css                      # 全局样式
   ├─ data/
   │  └─ cards.ts                     # 速记卡片数据
   ├─ pages/
   │  ├─ SuitePage.tsx                # 学习套件页
   │  └─ FlashcardsPage.tsx           # 速记卡片页
   ├─ components/
   │  ├─ Flashcard.tsx                # 翻牌卡片组件
   │  └─ BackToTop.tsx                # 返回顶部组件
   ├─ hooks/
   │  ├─ useAutoHideOnScroll.ts       # 滚动隐藏导航逻辑
   │  └─ useLocalStorageState.ts      # 本地状态持久化
   └─ utils/
      └─ text.ts                      # 文本搜索工具
```

## 🧪 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | 类型检查并构建生产版本 |
| `npm run preview` | 本地预览生产构建 |

## 🤝 参与贡献

欢迎提交 Issue 或 Pull Request，一起完善内容和体验。

适合贡献的方向：

- 补充或修正《中医药学概论》知识点。
- 增加更多速记卡片和模拟题。
- 优化移动端、平板端和桌面端体验。
- 改进无障碍访问、键盘操作和阅读舒适度。
- 增加自动化测试或部署工作流。

建议提交前先执行：

```bash
npm run build
```

## 📚 内容说明

本项目内容用于学习和复习辅助，不构成医学诊断、治疗建议或考试押题承诺。中医药知识点请以课程教材、授课老师要求和考试大纲为准。

## 📄 许可证

当前仓库尚未附带 `LICENSE` 文件。作为开源项目，建议后续补充明确的开源许可证，例如 MIT License。
