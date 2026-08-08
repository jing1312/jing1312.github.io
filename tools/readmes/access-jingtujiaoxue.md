<div align="center">

<img src="assets/banner.svg" alt="景图题库助手" width="100%"/>

**景图题库助手** — 一键导出景图智慧教学平台课程练习题与隐藏答案，支持章节题库与期末考试，数据只保存在你自己的电脑上。

> ⚠️ 仅用于个人学习，请遵守平台服务条款

[![版本 v1.0.0](https://img.shields.io/badge/%E7%89%88%E6%9C%AC-v1.0.0-2f5fb8)](https://github.com/jing1312/access-jingtujiaoxue/releases/latest)
[![Edge / Chrome](https://img.shields.io/badge/%E6%94%AF%E6%8C%81-Edge%20%7C%20Chrome-4e9dff)](extension/README.md)
[![测试 59 项通过](https://img.shields.io/badge/%E6%B5%8B%E8%AF%95-59%20%E9%A1%B9%E9%80%9A%E8%BF%87-2ea44f)](extension/test_core.js)

</div>

## 目录

- [特性](#特性)
- [效果预览](#效果预览)
- [快速开始（推荐：浏览器扩展）](#快速开始推荐浏览器扩展)
- [手动方式（控制台脚本）](#手动方式控制台脚本)
- [项目结构](#项目结构)
- [常见问题](#常见问题)
- [重要说明](#重要说明)

## 特性

- **一键导出，无需任何代码** — 浏览器扩展（Edge / Chrome），装好后打开课程页点两下即可，全程约 1 分钟
- **章节练习题全覆盖** — 单选 / 多选 / 判断 / 名词解释 / 问答题，含正确答案（以《临床药理学》为例：10 章 325 道题）
- **期末考试题** — 一键抓取，含参考答案与各部分分值
- **双格式下载** — 同时得到 JSON（可二次处理）与 Markdown（直接阅读）
- **隐私安全** — 不修改平台任何内容、不收集信息，抓取结果只导出到你自己的电脑

## 效果预览

<img src="assets/popup-demo.svg" alt="扩展界面预览" width="620"/>

装好扩展后：打开课程详情页 → 点击工具栏图标 → 一键抓取 → 下载题库文档。抓取结果是一份结构清晰的 Markdown 文档：

```markdown
# 临床药理学 — 全部章节测试题库
> 共 10 章，325 道题目

## 第1章 绪论

### 1.1 临床药理学基本概述

**第1题** [多选题] （10分）

临床药理学主要研究内容包括哪些方面？

- A. 临床药效学
- B. 基础药理学
- C. 临床药动学
- D. 新药临床试验

<details><summary>查看答案</summary>

**正确答案：A C D**

</details>
```

在 Typora / VS Code 里打开就是这样，答案默认收在折叠块里，点击即可展开：

<img src="assets/typora-demo.svg" alt="题库文档在 Typora 中的效果" width="620"/>

## 快速开始（推荐：浏览器扩展）

> 适合所有同学，不需要任何编程基础，全程约 2 分钟。

1. 下载安装包：[jingtu-extension-v1.0.0.zip](https://github.com/jing1312/access-jingtujiaoxue/releases/latest/download/jingtu-extension-v1.0.0.zip)（GitHub Releases，点击即下）
2. 解压后先读一遍压缩包里的 `安装说明.txt` —— 图文步骤，分 Edge / Chrome 两条路线，照着点就行
3. 装好后：登录景图平台 → 打开课程详情页（"智慧课程-我的学习进度"）→ 点击工具栏上的扩展图标 → 一键抓取并下载

如果页面提示"未检测到课程"，点弹窗里的「打开课程详情页」再「刷新当前页面」即可。详细说明见 [extension/README.md](extension/README.md)。

## 手动方式（控制台脚本）

> 给想了解原理或做二次处理的开发者：打开浏览器控制台粘贴脚本即可抓取，无需安装扩展。

<details>
<summary>抓取章节练习题</summary>

1. 登录平台，进入课程详情页（"智慧课程-我的学习进度"）
2. 打开浏览器控制台（F12），设置课程参数：

```js
window.__config = { iocId: '你的课程ID', iclassId: '你的班级ID' };
```

> 课程 ID 可在课程详情页隐藏域中查看：`document.getElementById('iocId').value`、
> `document.getElementById('iclassId').value`

3. 粘贴 `scripts/fetch_all_tests.js` 的完整内容执行
4. 完成后在控制台执行 `copy(JSON.stringify(window.__exportData))`
5. 粘贴保存为 `chapter_tests.json`

</details>

<details>
<summary>抓取期末考试题</summary>

1. 打开"个人中心-批阅作业"页面（`/action/test/testCheck/toShowOwnTesk`）
2. 粘贴 `scripts/fetch_exam.js` 执行（testUserId 自动从页面读取）
3. 完成后复制 `window.__exportData` 保存为 `exam_questions.json`

</details>

<details>
<summary>生成题库文档（Python）</summary>

```bash
# 章节题库
python scripts/generate_doc.py chapter_tests.json -o 章节测试题库.md

# 期末考试题库
python scripts/generate_exam_doc.py exam_questions.json -o 期末考试题库.md

# 数据完整性校验
python scripts/verify.py chapter_tests.json
```

</details>

## 项目结构

```text
access-jingtujiaoxue/
├── README.md              项目说明
├── docs/
│   └── 方法文档.md         API 接口与实现原理
├── assets/                README 配图（banner / 界面 / 产物预览）
├── extension/             浏览器扩展（推荐使用）
│   ├── README.md            扩展安装与使用说明
│   ├── 安装说明.txt          zip 内附带的新手安装指南
│   ├── manifest.json        MV3 清单
│   ├── core.js              抓取核心（MAIN world 注入，含 Markdown 生成）
│   ├── content.js           页面检测与消息桥接
│   ├── background.js        消息路由、状态持久化、文件下载
│   ├── popup.html/js/css    弹窗界面
│   └── test_core.js         Node 逻辑验证（node test_core.js，59 项断言）
└── scripts/               控制台脚本（备选方案）
    ├── fetch_all_tests.js   批量抓取章节练习题
    ├── fetch_exam.js        抓取期末考试题
    ├── generate_doc.py      生成章节题库 Markdown
    ├── generate_exam_doc.py 生成期末考试 Markdown
    └── verify.py            校验抓取数据完整性
```

> 原理与接口细节见 [docs/方法文档.md](docs/方法文档.md)

## 常见问题

**Q：扩展装好后提示"未检测到课程"？**
点扩展弹窗里的「打开课程详情页」按钮进入课程页，再点「刷新当前页面」即可。

**Q：抓到的题目为什么没有答案？**
只有已提交过的测试才有答案，请先在平台上完成并提交对应章节测试。

**Q：下载的 .md 文件怎么打开？**
用记事本就能打开；想要更好的阅读效果，可以用 Typora、VS Code 等免费软件。题库里的「查看答案」是折叠块，在这些软件里也能点开收起。

**Q：用这个抓取会被平台发现吗？**
扩展只在你的浏览器里读取页面数据，与你手动浏览完全一致，不修改平台任何内容。

## 重要说明

- **用途**：仅限个人学习，请遵守平台服务条款，勿用于商业用途或公开传播
- **隐私**：抓取结果含平台内部 ID（如 testUserId），公开发布前请自行清理
- **会话**：脚本方式依赖已登录会话（`csrfTokenRand`），运行期间请勿刷新页面
- 原理与接口细节见 [docs/方法文档.md](docs/方法文档.md)

## License

本项目未附带开源许可证（默认保留所有权利），代码仅供个人学习与技术交流使用。

---

[↑ 返回顶部](#目录)
