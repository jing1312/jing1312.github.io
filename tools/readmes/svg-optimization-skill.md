<div align="center">
  <img src="docs/images/hero-cover.svg" alt="SVG Visual System Engine" width="100%" />
</div>

<div align="center">

# svg-optimization-skill

## SVG Visual System Engine

**SVG 不是代码片段，而是一套视觉语言。**

让 AI Agent 生成具有设计规则、材质逻辑、排版体系和质量审查能力的 SVG 资产。

[![ci](https://github.com/jing1312/svg-optimization-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/jing1312/svg-optimization-skill/actions/workflows/ci.yml)

</div>

---

## 为什么需要它

大多数 AI 生成 SVG 的问题不是“不会画”，而是：

- 元素堆叠，没有视觉中心
- 渐变和玻璃效果滥用
- 字体层级混乱
- 配色没有系统
- 动效只是装饰
- 每次生成都是随机风格

这个 Skill 把 SVG 设计从“效果生成”升级为“视觉系统生成”。

---

# Design System

V2 使用三层视觉决策模型：

```
Archetype
    ↓
Palette
    ↓
Layout
```

## Archetype

五种核心视觉语言：

| 系统 | 定位 |
|---|---|
| Dreamlight | 高级未来、情绪科技 |
| Editorial | 杂志、文化、权威 |
| Material Craft | 工艺、纸张、自然材质 |
| Glass Intelligence | AI、界面、未来产品 |
| Mono System | 专业工具、企业系统 |

---

## Palette

颜色不是装饰，而是角色：

- surface
- ink
- accent
- material
- shadow
- glow

所有资产遵循 token 系统，而不是随机选色。

---

## Layout

布局决定信息关系：

- Hero
- Grid
- Poster
- Object Showcase

一个优秀 SVG：

> 一个主题，一个主视觉，一个清晰层级。

---

# AI Design Rules

生成前必须回答：

1. 这个 SVG 要传达什么？
2. 核心视觉元素是什么？
3. 每个材质为什么存在？

禁止：

- 随机光球
- 无意义渐变
- 玻璃效果堆叠
- 元素拼贴
- 模板化卡片布局

高级感来自控制，而不是增加。

---

# Quality Pipeline

SVG 输出经过三层检查：

```
Design Intent
      ↓
Structural Validation
      ↓
Aesthetic Review
      ↓
Release
```

包含：

- XML 检查
- 引用完整性
- 几何验证
- 对比度检查
- 排版审查
- 材质审查
- 动效审查

---

# Examples

当前 V2 示例：

```
examples/v2/

├── dreamlight-hero.svg
├── editorial-poster.svg
└── glass-intelligence.svg
```

这些不是效果展示，而是 AI 的视觉参考标准。

---

# Installation

```bash
git clone https://github.com/jing1312/svg-optimization-skill.git
```

将 `SKILL.md` 和 `references/` 提供给支持 Agent Skill 的 AI Agent。

---

# Project Structure

```
SKILL.md

references/
 ├── design-tokens.md
 ├── style-library.md
 ├── aesthetic-score.md
 ├── motion-library.md
 └── anti-ai.md

examples/
 └── v2/
```

---

# Philosophy

> 门禁保证 SVG 不坏。
>
> 设计系统保证 SVG 不普通。

这个项目不是 SVG 模板库。

它是一套让 AI 理解视觉设计的方法。

