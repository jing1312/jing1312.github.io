/*
 * render.js — 主页的 DOM 和交互。
 * 这里保留一个小状态机，让 hash、侧栏和展开内容保持同步。
 */

import * as C from "../content.js";

const validViews = new Set(C.nav.map((item) => item.id));
const state = {
  view: readView(),
  filter: "all",
  noteTab: "growing",
};

function h(tag, props = null, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key === "html") el.innerHTML = value;
      else el.setAttribute(key, value);
    }
  }
  for (const child of kids.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function readView() {
  const value = window.location.hash.replace("#", "");
  return validViews.has(value) ? value : "home";
}

function icon(mark) {
  return h("span", { class: "ui-icon", "aria-hidden": "true", text: mark });
}

function button(label, action, cls = "button button--ghost", mark = "") {
  return h("button", { class: cls, type: "button", "data-action": action }, mark ? icon(mark) : null, h("span", { text: label }));
}

function link(label, url, cls = "text-link") {
  return h("a", { class: cls, href: url, target: "_blank", rel: "noopener noreferrer" }, label, h("span", { class: "link-arrow", "aria-hidden": "true", text: "↗" }));
}

function kicker(text, number = "") {
  return h("div", { class: "view-kicker" }, h("span", { class: "eyebrow", text }), number ? h("span", { class: "view-number", text: number }) : null);
}

function shell(app) {
  const characterStage = h("canvas", { id: "character-stage", "aria-hidden": "true" });
  const topbar = h("header", { class: "topbar" },
    h("a", { class: "brand", href: "#home", "data-view": "home", "aria-label": "回到首页" },
      h("span", { class: "brand-orbit", "aria-hidden": "true" }, h("span", { class: "brand-dot" })),
      h("span", { class: "brand-copy" }, h("strong", { text: "jingjing" }), h("small", { text: "个人主页" }))),
    h("div", { class: "topbar-status" }, h("span", { class: "status-dot", "aria-hidden": "true" }), h("span", { text: "最近：整理学习工具" })),
    h("button", { class: "mobile-menu", type: "button", "aria-expanded": "false", "aria-controls": "side-nav", "data-action": "toggle-menu" }, icon("☰"), h("span", { class: "sr-only", text: "打开导航" }))
  );

  const navList = h("nav", { class: "side-nav", id: "side-nav", "aria-label": "主页导航" },
    h("div", { class: "nav-profile" },
      h("img", { src: "assets/character-hero.png", alt: "jingjing 的主页角色" }),
      h("div", null, h("strong", { text: "jingjing" }), h("small", { text: "药学 / 小工具" }))),
    h("div", { class: "nav-label", text: "探索" }),
    ...C.nav.map((item, index) => h("a", { class: "nav-item", href: `#${item.id}`, "data-view": item.id }, icon(item.icon), h("span", { text: item.label }), h("small", { text: String(index + 1).padStart(2, "0") }))),
    h("div", { class: "nav-divider" }),
    h("div", { class: "nav-caption", text: "公开仓库、学习工具，还有一些过程笔记。" }),
    link("GitHub / jing1312", C.site.github, "nav-github")
  );

  const content = h("div", { class: "content-wrap" }, h("div", { id: "view-root", tabindex: "-1" }));
  const contact = h("a", { class: "floating-contact", href: C.site.github, target: "_blank", rel: "noopener noreferrer", "aria-label": "打开 GitHub" }, icon("↗"), h("span", { text: "找我" }));
  app.append(characterStage, topbar, navList, content, contact);
}

function renderHome(root) {
  const d = C.hero;
  root.append(
    kicker("HOME / 01", "你好"),
    h("section", { class: "home-layout" },
      h("div", { class: "home-copy" },
        h("div", { class: "status-label" }, h("span", { class: "status-dot", "aria-hidden": "true" }), h("span", { text: d.status })),
        h("h1", { class: "home-title" }, "我是 ", h("span", { class: "title-accent", text: "jingjing" }), "。", h("br"), "药学在读。"),
        h("p", { class: "home-lede", text: d.lede }),
        h("div", { class: "hero-tags" }, ...d.tags.map((tag) => h("span", { text: tag }))),
        h("div", { class: "home-actions" }, button(d.primary, "go-projects", "button button--primary", "→"), button(d.secondary, "go-workbench", "button button--soft", "⌘")),
        h("div", { class: "home-facts" }, ...d.facts.map((fact) => h("div", { class: "fact" }, h("strong", { text: fact.value }), h("span", { text: fact.label }))))
      ),
      h("div", { class: "home-art" },
        h("div", { class: "stage-halo", "aria-hidden": "true" }),
        h("div", { class: "stage-loading", text: "正在准备人物舞台…" }),
        h("div", { class: "floating-tag floating-tag--top" }, h("span", { text: "✦" }), h("span", { text: "药学" })),
        h("div", { class: "floating-tag floating-tag--bottom" }, h("span", { text: "◈" }), h("span", { text: "写点工具" })),
        h("span", { class: "art-caption", text: d.sceneLabel })
      )
    ),
    h("section", { class: "home-featured" },
      h("div", { class: "featured-heading" }, h("div", null, h("span", { class: "eyebrow", text: "RECENTLY OPENED" }), h("h2", { text: "最近常打开的三个仓库" })), button("全部项目", "go-projects", "button button--ghost", "→")),
      h("div", { class: "featured-grid" }, ...C.projects.cards.slice(0, 3).map((project) =>
        h("a", { class: `featured-project featured-project--${project.accent}`, href: project.url, target: "_blank", rel: "noopener noreferrer" },
          h("span", { class: "featured-icon", text: project.category === "study" ? "✎" : project.category === "craft" ? "✦" : "⌘" }),
          h("div", null, h("strong", { text: project.repo }), h("p", { text: project.desc })),
          h("span", { class: "link-arrow", text: "↗" }))))
    )
  );
}

function renderGarden(root) {
  const d = C.garden;
  root.append(kicker(d.kicker, "02 / 06"), h("section", { class: "split-heading" }, h("div", null, h("h1", { class: "view-title", text: d.title }), h("p", { class: "view-lede", text: d.lede })), h("div", { class: "side-note" }, h("strong", { text: d.sideNote.title }), ...d.sideNote.lines.map((line) => h("p", { text: line })))));

  const stage = h("section", { class: "garden-stage" }, h("div", { class: "stage-grid", "aria-hidden": "true" }));
  d.islands.forEach((island) => {
    const item = h("button", { class: `garden-island island--${island.color}`, type: "button", "data-action": "island", "data-filter": island.id },
      h("span", { class: "island-number", text: island.mark }),
      h("span", { class: "island-shape", "aria-hidden": "true" }, h("span", { class: "island-spark", text: "✦" })),
      h("span", { class: "island-name", text: island.name }),
      h("span", { class: "island-note", text: island.note }),
      h("span", { class: "island-projects", text: island.projects })
    );
    stage.append(item);
  });
  stage.append(h("div", { class: "stage-label" }, h("span", { text: "click an island" }), h("span", { text: "↘" })));
  root.append(stage, h("section", { class: "garden-foot" }, h("img", { src: "assets/garden-scene.png", alt: "粉彩云朵和多个角色组成的 3D 场景", loading: "lazy" }), h("div", null, h("span", { class: "eyebrow", text: "A VISUAL NOTE" }), h("p", { text: "这些小岛不是项目数量的统计图。它们更像我的工作台：一边是学习，一边是流程，中间留着一块地方给还没想明白的事。" }))));
}

function renderProjects(root) {
  const d = C.projects;
  const filtered = state.filter === "all" ? d.cards : d.cards.filter((card) => card.category === state.filter);
  root.append(kicker(d.kicker, "03 / 06"), h("div", { class: "split-heading project-heading" }, h("div", null, h("h1", { class: "view-title", text: d.title }), h("p", { class: "view-lede", text: d.lede })), h("div", { class: "filter-box" }, h("span", { class: "filter-label", text: "筛选" }), h("div", { class: "filter-row" }, ...d.filters.map((filter) => h("button", { class: `filter-button ${state.filter === filter.id ? "is-selected" : ""}`, type: "button", "data-action": "filter", "data-filter": filter.id, text: filter.label }))))));
  root.append(h("div", { class: "project-grid" }, ...filtered.map((card, index) => projectCard(card, index))));
  root.append(h("div", { class: "project-footer" }, h("span", { text: `现在显示 ${filtered.length} / ${d.cards.length} 个项目` }), link("去 GitHub 看完整列表", "https://github.com/jing1312?tab=repositories", "text-link")));
}

function projectCard(card, index) {
  const detail = h("div", { class: "project-detail" }, h("div", null, h("span", { class: "detail-label", text: "为什么做" }), h("p", { text: card.why })), h("div", null, h("span", { class: "detail-label", text: "已经完成" }), h("p", { text: card.done })), h("div", null, h("span", { class: "detail-label", text: "还想继续" }), h("p", { text: card.next })));
  const cardEl = h("article", { class: `project-card project-card--${card.accent}` },
    h("div", { class: "project-card-head" }, h("span", { class: "project-index", text: String(index + 1).padStart(2, "0") }), h("span", { class: "project-status", text: card.status })),
    h("div", { class: "project-card-title" }, h("h2", { text: card.repo }), h("span", { class: "project-lang", text: card.lang })),
    h("span", { class: "project-category", text: card.categoryLabel }),
    h("p", { class: "project-desc", text: card.desc }),
    h("div", { class: "project-actions" }, h("button", { class: "expand-button", type: "button", "data-action": "toggle-project", "aria-expanded": "false" }, icon("+"), h("span", { text: "展开看看" })), link("打开仓库", card.url, "text-link")),
    detail
  );
  return cardEl;
}

function renderWorkbench(root) {
  const d = C.workbench;
  root.append(kicker(d.kicker, "04 / 06"), h("div", { class: "split-heading" }, h("div", null, h("h1", { class: "view-title", text: d.title }), h("p", { class: "view-lede", text: d.lede })), h("div", { class: "workbench-stamp" }, h("span", { text: "OPEN" }), h("strong", { text: "可修改" }), h("small", { text: "没有最终版本" }))));
  const list = h("div", { class: "accordion-list" });
  d.panels.forEach((panel, index) => {
    list.append(h("details", { class: `accordion accordion--${panel.tone}`, open: index === 0 ? "open" : null }, h("summary", null, h("span", { class: "accordion-number", text: `0${index + 1}` }), h("span", { text: panel.title }), h("span", { class: "accordion-plus", text: "+" })), h("div", { class: "accordion-body" }, h("p", { text: panel.body }))));
  });
  root.append(h("section", { class: "workbench-grid" }, list, h("aside", { class: "tool-panel" }, h("span", { class: "eyebrow", text: "TOOLS I ACTUALLY USE" }), h("h2", { text: "工具箱" }), h("div", { class: "tool-cloud" }, ...d.tools.map((tool) => h("span", { text: tool }))), h("p", { text: "工具只是手，问题怎么拆才是方向。" }))));
}

function renderNotes(root) {
  const d = C.notes;
  const entries = d.entries[state.noteTab] || [];
  root.append(kicker(d.kicker, "05 / 06"), h("div", { class: "split-heading" }, h("div", null, h("h1", { class: "view-title", text: d.title }), h("p", { class: "view-lede", text: d.lede })), h("div", { class: "notes-index", text: "field notes / 2026" })));
  root.append(h("div", { class: "notes-tabs" }, ...d.tabs.map((tab) => h("button", { class: `notes-tab ${state.noteTab === tab.id ? "is-selected" : ""}`, type: "button", "data-action": "note-tab", "data-tab": tab.id, text: tab.label }))));
  root.append(h("div", { class: "notes-list" }, ...entries.map((entry, index) => h("details", { class: "note-entry", open: index === 0 ? "open" : null }, h("summary", null, h("span", { class: "note-index", text: `0${index + 1}` }), h("span", { class: "note-title", text: entry.title }), h("span", { class: "note-date", text: entry.date })), h("p", { text: entry.body })) )));
}

function renderAbout(root) {
  const d = C.about;
  root.append(kicker(d.kicker, "06 / 06"), h("section", { class: "about-layout" }, h("div", { class: "about-portrait" }, h("img", { src: "assets/object-sheet.png", alt: "粉彩风格的相机、电脑和桌面小物素材", loading: "lazy" }), h("span", { text: "somewhere between study and making" })), h("div", { class: "about-copy" }, h("h1", { class: "view-title", text: d.title }), h("p", { class: "about-lede", text: d.lede }), ...d.paras.map((para) => h("p", { text: para })), h("div", { class: "principle-list" }, ...d.principles.map((principle, index) => h("div", null, h("span", { text: `0${index + 1}` }), h("strong", { text: principle })))), h("p", { class: "about-contact", text: d.contact }), link("github.com/jing1312", C.site.github, "button button--primary"))));
}

function renderView(root) {
  root.innerHTML = "";
  const view = h("div", { class: `view view--${state.view}` });
  const renderer = { home: renderHome, garden: renderGarden, projects: renderProjects, workbench: renderWorkbench, notes: renderNotes, about: renderAbout }[state.view] || renderHome;
  renderer(view);
  root.append(view);
  document.body.dataset.tone = C.tones[state.view] || "paper";
  document.body.dataset.view = state.view;
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item.dataset.view === state.view));
  window.__homepage = { view: state.view, navigate, filter: state.filter };
}

function navigate(view) {
  if (!validViews.has(view)) return;
  state.view = view;
  if (window.location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  renderView(document.getElementById("view-root"));
  document.getElementById("view-root")?.focus({ preventScroll: true });
  document.querySelector(".side-nav")?.classList.remove("is-open");
  const menu = document.querySelector(".mobile-menu");
  if (menu) menu.setAttribute("aria-expanded", "false");
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-view], [data-action]");
    if (!target) return;
    if (target.dataset.view) {
      event.preventDefault();
      navigate(target.dataset.view);
      return;
    }
    const action = target.dataset.action;
    if (action === "go-projects") navigate("projects");
    if (action === "go-workbench") navigate("workbench");
    if (action === "toggle-menu") {
      const nav = document.querySelector(".side-nav");
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      target.setAttribute("aria-expanded", String(open));
    }
    if (action === "filter") {
      state.filter = target.dataset.filter || "all";
      renderView(document.getElementById("view-root"));
    }
    if (action === "island") {
      state.filter = target.dataset.filter || "all";
      navigate("projects");
    }
    if (action === "note-tab") {
      state.noteTab = target.dataset.tab || "growing";
      renderView(document.getElementById("view-root"));
    }
    if (action === "toggle-project") {
      const card = target.closest(".project-card");
      const open = card.classList.toggle("is-expanded");
      target.setAttribute("aria-expanded", String(open));
      target.querySelector(".ui-icon").textContent = open ? "−" : "+";
    }
  });
  window.addEventListener("hashchange", () => {
    state.view = readView();
    renderView(document.getElementById("view-root"));
  });
}

export function renderAll() {
  const app = document.getElementById("app");
  if (!app) return;
  shell(app);
  bindEvents();
  renderView(document.getElementById("view-root"));
  document.title = C.site.title;
}
