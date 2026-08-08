# Jingjing — 个人主页 / 作品集

面向博士申请与科研合作的单页作品集：生物医药 × 可验证 Agent 系统。

主张：**模型提出方案，证据裁定完成。**

网站采用原生 HTML / CSS / JavaScript 与 Three.js，零构建、无后端、无第三方追踪，可直接部署到 GitHub Pages。

## 本地预览

ES modules 与 `fetch()` 需要通过 HTTP 访问：

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765/
```

仓库名为 `jing1312.github.io`，推送到默认分支后由 GitHub Pages 自动发布。`.nojekyll` 必须保留。

## 页面结构

- Hero：身份、研究主张、PhD 状态与 Evidence Core 3D
- 三条主线：执行可信、知识规模化摄取、生成质量裁决
- 三个代表项目：问题、做法、证据、边界、仓库
- 研究方向：药学背景、Agent 工程能力与方法主张
- 其他公开项目与 GitHub CTA

全部可见文案与项目事实集中在 `js/content.js`。修改事实或数字时，应同步核对相应公开仓库。

## 主要文件

```text
index.html                 语义化页面壳与 noscript 兜底
css/tokens.css             色彩、字号、间距与动效变量
css/type.css               自托管字体与排印
css/layout.css             Hero、案例、研究区与响应式布局
css/ui.css                 导航、按钮、焦点态、降级与 reduced-motion
js/content.js              全站文案和项目数据
js/ui/render.js            content.js → DOM
js/main.js                 导航、渐入、WebGL 生命周期与降级
js/gl/evidence-core.js     执行网络 → 青蒿素分子形变
js/util/anim.js            缓动、阻尼与确定性随机工具
data/molecule.json         青蒿素 42 原子 / 45 键三维构象
vendor/three/              本地 Three.js ESM
qa/test_site.py            交付前浏览器 QA
```

## Evidence Core

Hero 中的 3D 只负责表达一个概念：结构化执行图可以过渡到真实生物医药对象。

- 初态：42 个节点组成的稀疏执行网络
- 滚动：网络节点与连线平滑映射到分子坐标
- 终态：PubChem CID 68827 的青蒿素三维构象
- 视觉：近黑节点/连线与一个青绿色活动信号；不使用全屏玻璃、彩虹色散或背景着色器
- 性能：canvas 仅位于 Hero；离开可视区后停止渲染；设备像素比封顶
- 降级：无 WebGL 时显示同构静态 SVG，正文与 CTA 不受影响

`prefers-reduced-motion: reduce` 会冻结形变和自转；触屏设备不启用指针倾斜。

## 内容与设计约束

- 不写无法从公开仓库核验的成绩、合作方或影响力
- 不公开邮箱，不加入未公开论文列表
- 使用暖白、近黑和单一冷青绿色强调色
- 3D 不覆盖文字；手机端改为单栏并限制 3D 高度
- 正文与交互控件满足清晰层级、键盘焦点和足够对比度
- 不引入 npm、框架、外部 CDN 或分析脚本

## QA

安装 Playwright 后，在另一个终端启动静态服务器：

```bash
python3 -m http.server 8765
python3 qa/test_site.py
```

测试覆盖：

1. 冷启动零控制台错误与资源失败
2. 1440×900、768×1024、390×844 三视口截图
3. 无横向溢出与 Hero 文案/3D 重叠
4. Evidence Core 形变锚点与离屏停止渲染
5. 无 WebGL 静态降级
6. `prefers-reduced-motion`
7. 字体与首屏资源预算
8. 仓库白名单、上游署名、关键数字与无邮箱约束
9. 移动导航的展开、ESC 关闭与 ARIA 状态

测试产物写入 `qa/shots/`、`qa/qa_report.json` 和 `qa/qa_report.md`；这些产物不应提交。

## 字体

字体均为自托管 WOFF2。若新增中文导致字形回退，可运行：

```bash
python3 qa/smoke.py
python3 tools/build_fonts.py
```

`qa/smoke.py` 会根据页面实际渲染文本更新 `qa/glyphs.json`，字体构建脚本据此重新子集化。

## License

MIT。内容、项目数字、分子数据与仓库信息均可从公开来源逐条核验。
