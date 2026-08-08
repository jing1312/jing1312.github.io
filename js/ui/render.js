import * as C from "../content.js";

function h(tag, props = null, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key === "html") el.innerHTML = value;
      else if (key === "dataset") Object.assign(el.dataset, value);
      else el.setAttribute(key, value === true ? "" : value);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const ext = (url, label, cls = "text-link") => h("a", {
  class: cls,
  href: url,
  target: "_blank",
  rel: "noopener noreferrer",
}, label, h("span", { "aria-hidden": "true" }, " ↗"));

function renderHeader() {
  const root = document.getElementById("site-header");
  root.append(h("div", { class: "shell header__inner" },
    h("a", { class: "brand", href: "#home", "aria-label": "Jingjing 首页" },
      h("span", { class: "brand__mark", "aria-hidden": "true" }),
      h("span", { class: "brand__name", text: C.site.name }),
      h("span", { class: "brand__role", text: "BIOPHARMA × AGENTS" })),
    h("button", {
      class: "menu-toggle",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": "primary-nav",
      "aria-label": "打开导航",
    }, h("span"), h("span")),
    h("nav", { class: "primary-nav", id: "primary-nav", "aria-label": "主要导航" },
      ...C.nav.map((item) => h("a", { href: item.href }, item.label)),
      ext(C.site.github, "GitHub", "nav-github"))));
}

function renderHero() {
  const d = C.hero;
  const root = document.getElementById("home");
  root.append(h("div", { class: "shell hero__grid" },
    h("div", { class: "hero__copy reveal" },
      h("p", { class: "eyebrow", text: d.eyebrow }),
      h("h1", { id: "hero-title", text: d.title }),
      h("p", { class: "hero__lede", text: d.lede }),
      h("div", { class: "hero__actions" },
        h("a", { class: "button button--primary", href: d.primary.href }, d.primary.label,
          h("span", { "aria-hidden": "true" }, " ↓")),
        ext(d.secondary.href, d.secondary.label, "button button--secondary")),
      h("p", { class: "status" },
        h("span", { class: "status__dot", "aria-hidden": "true" }), d.status),
      h("ul", { class: "hero__signals", "aria-label": "三条工作主线" },
        ...d.signals.map((signal, i) => h("li", null,
          h("span", { text: String(i + 1).padStart(2, "0") }), signal)))),
    h("div", { class: "hero__visual reveal", id: "core-stage" },
      h("div", { class: "core__header" },
        h("span", { text: "EVIDENCE CORE" }),
        h("span", { text: "GRAPH → MOLECULE" })),
      h("canvas", { id: "gl", "aria-hidden": "true" }),
      h("div", { class: "core-poster", id: "core-poster", "aria-hidden": "true" },
        h("svg", { viewBox: "0 0 420 420", role: "presentation" },
          h("circle", { cx: "210", cy: "210", r: "145", class: "poster-orbit" }),
          h("circle", { cx: "210", cy: "210", r: "98", class: "poster-orbit poster-orbit--2" }),
          h("path", { d: "M102 214L155 138L219 168L278 111L323 197L267 277L184 298L117 257Z", class: "poster-edge" }),
          ...[[102,214],[155,138],[219,168],[278,111],[323,197],[267,277],[184,298],[117,257]].map(([cx,cy], i) =>
            h("circle", { cx, cy, r: i === 4 ? "8" : "5", class: i === 4 ? "poster-node poster-node--active" : "poster-node" })))),
      h("div", { class: "core__footer" },
        h("span", { text: C.molecule.name }),
        h("span", { text: C.molecule.formula }),
        h("span", { text: C.molecule.facts })))));
}

function renderPrinciples() {
  const d = C.principles;
  const root = document.getElementById("principles");
  root.append(h("div", { class: "shell" },
    h("div", { class: "section-head reveal" },
      h("p", { class: "eyebrow", text: d.eyebrow }),
      h("h2", { text: d.title }),
      h("p", { class: "section-lede", text: d.lede })),
    h("div", { class: "principles__grid" },
      ...d.items.map((item) => h("a", { class: "principle reveal", href: item.href },
        h("span", { class: "principle__no", text: item.no }),
        h("h3", { text: item.title }),
        h("p", { text: item.body }),
        h("span", { class: "principle__repo" }, item.repo, h("span", { "aria-hidden": "true" }, " →")))))));
}

function projectArticle(project) {
  return h("article", { class: "project reveal", id: `project-${project.id}` },
    h("header", { class: "project__head" },
      h("div", { class: "project__index" },
        h("span", { class: "project__no", text: project.no }),
        h("span", { class: "project__layer", text: project.layer })),
      h("div", { class: "project__title" },
        h("h3", { text: project.title }),
        h("div", { class: "project__meta" },
          ext(project.url, project.repo),
          h("span", { text: project.meta.join(" · ") })))),
    h("div", { class: "project__story" },
      h("div", null,
        h("p", { class: "label", text: "问题" }),
        h("p", { text: project.problem })),
      h("div", null,
        h("p", { class: "label", text: "做法" }),
        h("p", { text: project.approach }))),
    project.flow ? h("ol", { class: "project__flow", "aria-label": "处理流程" },
      ...project.flow.map((step, i) => h("li", null,
        h("span", { text: String(i + 1).padStart(2, "0") }), step))) : null,
    h("div", { class: "project__evidence" },
      ...project.evidence.map((metric) => h("div", { class: "metric" },
        h("strong", { text: metric.value }),
        h("span", { text: metric.label })))),
    h("div", { class: "project__details" },
      h("p", { class: "label", text: "可核验细节" }),
      h("ul", null, ...project.details.map((detail) => h("li", { text: detail }))),
      project.siblings ? h("div", { class: "project__siblings" },
        h("span", { class: "label", text: "配套仓库" }),
        ...project.siblings.map((item) => ext(item.url, item.label))) : null),
    h("div", { class: "boundary" },
      h("span", { class: "label", text: "边界" }),
      h("p", { text: project.boundary })),
    h("div", { class: "project__cta" }, ext(project.url, `查看 ${project.repo}`, "button button--dark")));
}

function renderWork() {
  const root = document.getElementById("work");
  root.append(h("div", { class: "shell" },
    h("div", { class: "work__intro reveal" },
      h("p", { class: "eyebrow", text: "FEATURED WORK" }),
      h("h2", { text: "三个仓库，同一个判断标准" }),
      h("p", { text: "模型可以提出方案；只有系统、证据与明确边界，才能决定结果是否成立。" })),
    ...C.featuredProjects.map(projectArticle)));
}

function renderResearch() {
  const d = C.research;
  const root = document.getElementById("research");
  root.append(h("div", { class: "shell research__grid" },
    h("div", { class: "research__title reveal" },
      h("p", { class: "eyebrow", text: d.eyebrow }),
      h("h2", { text: d.title })),
    h("div", { class: "research__body reveal" },
      h("p", { class: "research__intro", text: d.intro }),
      ...d.paragraphs.map((paragraph) => h("p", { text: paragraph })),
      h("dl", { class: "research__stack" },
        ...d.stack.map((row) => h("div", null,
          h("dt", { text: row.label }),
          h("dd", { text: row.value })))))));
}

function renderMore() {
  const d = C.otherProjects;
  const root = document.getElementById("more");
  root.append(h("div", { class: "shell" },
    h("div", { class: "section-head section-head--compact reveal" },
      h("p", { class: "eyebrow", text: d.eyebrow }),
      h("h2", { text: d.title })),
    h("div", { class: "repo-list" },
      ...d.items.map((item) => h("article", { class: "repo-row reveal" },
        h("div", { class: "repo-row__name" }, ext(item.url, item.repo)),
        h("div", { class: "repo-row__body" },
          h("p", { text: item.desc }),
          item.attribution ? h("p", { class: "attribution" }, item.attribution.text, " ", ext(item.attribution.url, "查看上游")) : null),
        h("div", { class: "repo-row__meta" },
          h("span", { text: item.lang }),
          item.stars != null ? h("span", { text: `★ ${item.stars}` }) : null)))),
    h("p", { class: "repo-note", text: d.note })));
}

function renderClosing() {
  const d = C.closing;
  const root = document.getElementById("closing");
  root.append(h("div", { class: "shell closing__grid" },
    h("div", { class: "closing__copy reveal" },
      h("p", { class: "eyebrow", text: d.eyebrow }),
      h("h2", { text: d.title }),
      h("p", { text: d.body }),
      ext(d.cta.url, d.cta.label, "closing__cta")),
    h("div", { class: "closing__mark", "aria-hidden": "true" },
      h("span", { text: "EVIDENCE" }),
      h("span", { text: "OVER ASSERTION" })),
    h("div", { class: "site-footer" },
      h("span", { text: d.footer }),
      h("a", { href: "#home" }, "返回顶部 ↑"))));
}

export function renderAll() {
  renderHeader();
  renderHero();
  renderPrinciples();
  renderWork();
  renderResearch();
  renderMore();
  renderClosing();
  document.title = C.site.title;
}
