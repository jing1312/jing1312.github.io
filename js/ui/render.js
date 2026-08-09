/* render.js - 顶部导航、多视图和页面交互。 */

import * as C from "../content.js";

const validViews = new Set(C.nav.map((item) => item.id));
const state = {
  view: readView(),
  filter: "all",
  noteTab: "current",
};

function h(tag, props = null, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  for (const child of kids.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function readView() {
  const value = location.hash.replace("#", "");
  return validViews.has(value) ? value : "home";
}

function externalLink(label, href, className = "text-link") {
  return h("a", { class: className, href, target: "_blank", rel: "noopener noreferrer" },
    h("span", { text: label }), h("span", { class: "link-arrow", "aria-hidden": "true", text: "↗" }));
}

function actionButton(label, action, className = "button button--soft", symbol = "") {
  return h("button", { class: className, type: "button", "data-action": action },
    symbol ? h("span", { class: "button-symbol", "aria-hidden": "true", text: symbol }) : null,
    h("span", { text: label }));
}

function shell(app) {
  const stage = h("canvas", { id: "character-stage", "aria-hidden": "true" });
  const navLinks = h("div", { class: "nav-links", id: "nav-links" },
    ...C.nav.map((item) => h("a", { href: `#${item.id}`, "data-view": item.id, text: item.label })));
  const nav = h("header", { class: "top-nav" },
    h("a", { class: "nav-brand", href: "#home", "data-view": "home", "aria-label": "回到首页" },
      h("span", { class: "brand-avatar" }, h("img", { src: "assets/hello-kitty-avatar.png", alt: "" })),
      h("span", { class: "brand-copy" }, h("strong", { text: "jingjing" }), h("small", { text: "药学 / 小工具" }))),
    navLinks,
    externalLink("GitHub", C.site.github, "nav-github"),
    h("button", { class: "menu-button", type: "button", "data-action": "toggle-menu", "aria-expanded": "false", "aria-controls": "nav-links", "aria-label": "打开导航" },
      h("span", { "aria-hidden": "true", text: "☰" }))
  );
  const backdrop = h("button", { class: "menu-backdrop", type: "button", "data-action": "close-menu", "aria-label": "关闭导航", tabindex: "-1" });
  const content = h("main", { class: "page-shell" }, h("div", { id: "view-root", tabindex: "-1" }));
  const footer = h("footer", { class: "site-footer" },
    h("span", { text: "大三这一年：上课、复习，也写点自己用的东西。" }),
    externalLink("github.com/jing1312", C.site.github));
  const toast = h("div", { class: "toast", role: "status", "aria-live": "polite" });
  app.append(stage, nav, backdrop, content, footer, toast);
}

function viewHeading(title, lede, note = "") {
  return h("header", { class: "view-heading" },
    h("div", null, h("h1", { text: title }), h("p", { text: lede })),
    note ? h("span", { class: "heading-note", text: note }) : null);
}

function projectPreview(project, featured = false) {
  return h("a", { class: `project-preview project-preview--${project.accent} ${featured ? "is-featured" : ""}`, href: project.url, target: "_blank", rel: "noopener noreferrer" },
    h("div", { class: "preview-top" },
      h("span", { class: "preview-category", text: project.categoryLabel }),
      h("span", { class: "preview-status", text: project.status })),
    h("strong", { text: project.repo }),
    h("p", { text: project.desc }),
    h("span", { class: "preview-link", text: "打开仓库 ↗" }));
}

function renderHome(root) {
  const d = C.hero;
  const featured = C.projects.cards.slice(0, 3);
  root.append(
    h("section", { class: "hero" },
      h("div", { class: "hero-copy" },
        h("span", { class: "status-pill" }, h("span", { class: "status-dot" }), h("span", { text: d.badge })),
        h("h1", null, "你好，我是 ", h("span", { text: "jingjing" })),
        h("p", { class: "hero-lede", text: d.lede }),
        h("div", { class: "hero-actions" },
          actionButton(d.primary, "go-projects", "button button--primary", "→"),
          actionButton(d.secondary, "go-recent", "button button--soft", "↗")),
        h("dl", { class: "fact-row" }, ...d.facts.map((fact) => h("div", null,
          h("dt", { text: fact.value }), h("dd", { text: fact.label }))))
      ),
      h("div", { class: "hero-stage" },
        h("div", { class: "stage-disc", "aria-hidden": "true" }),
        h("span", { class: "stage-loading", text: "人物加载中" }),
        actionButton("再跳一下", "kitty-hop", "stage-hop", "↟"),
        h("div", { class: "stage-label", text: d.stageLabel })
      )
    ),
    h("section", { class: "desk-strip" },
      h("div", { class: "desk-intro" }, h("span", { text: "这两周" }), h("h2", { text: "桌面上摊着这些" })),
      h("div", { class: "desk-list" }, ...d.desk.map((item) => h("div", { class: `desk-item desk-item--${item.tone}` },
        h("strong", { text: item.title }), h("p", { text: item.note }))))
    ),
    h("section", { class: "home-projects" },
      h("div", { class: "section-heading" }, h("div", null, h("h2", { text: "最近常打开" }), h("p", { text: "不是按 star 排的，是我最近真的在用。" })), actionButton("全部项目", "go-projects", "button button--quiet", "→")),
      h("div", { class: "project-showcase" }, projectPreview(featured[0], true), h("div", { class: "project-preview-stack" }, projectPreview(featured[1]), projectPreview(featured[2])))
    )
  );
}

function projectCard(project, index) {
  return h("article", { class: `project-card project-card--${project.accent}` },
    h("div", { class: "project-card-head" },
      h("span", { text: String(index + 1).padStart(2, "0") }),
      h("span", { class: "project-status", text: project.status })),
    h("div", { class: "project-name" }, h("h2", { text: project.repo }), h("span", { text: project.lang })),
    h("span", { class: "project-category", text: project.categoryLabel }),
    h("p", { class: "project-desc", text: project.desc }),
    h("div", { class: "project-actions" },
      h("button", { class: "expand-button", type: "button", "data-action": "toggle-project", "aria-expanded": "false" }, h("span", { "aria-hidden": "true", text: "+" }), "展开"),
      externalLink("仓库", project.url)),
    h("div", { class: "project-detail" },
      h("div", null, h("strong", { text: "为什么做" }), h("p", { text: project.why })),
      h("div", null, h("strong", { text: "现在到哪了" }), h("p", { text: project.done })),
      h("div", null, h("strong", { text: "下一步" }), h("p", { text: project.next })))
  );
}

function renderProjects(root) {
  const filtered = state.filter === "all" ? C.projects.cards : C.projects.cards.filter((item) => item.category === state.filter);
  root.append(
    viewHeading(C.projects.title, C.projects.lede, `${filtered.length} / ${C.projects.cards.length}`),
    h("div", { class: "filter-bar", role: "group", "aria-label": "项目筛选" }, ...C.projects.filters.map((filter) =>
      h("button", { class: `filter-button ${filter.id === state.filter ? "is-selected" : ""}`, type: "button", "data-action": "filter", "data-filter": filter.id, "aria-pressed": String(filter.id === state.filter), text: filter.label }))),
    h("div", { class: "project-grid" }, ...filtered.map(projectCard))
  );
}

function renderRecent(root) {
  root.append(
    viewHeading(C.recent.title, C.recent.lede, "CURRENT"),
    h("section", { class: "recent-layout" },
      h("div", { class: "recent-rail", "aria-hidden": "true" }, h("span"), h("span"), h("span"), h("span")),
      h("div", { class: "recent-list" }, ...C.recent.items.map((item, index) =>
        h("details", { class: `recent-item recent-item--${item.tone}`, open: index === 0 },
          h("summary", null,
            h("span", { class: "recent-when", text: item.when }),
            h("strong", { text: item.title }),
            h("span", { class: "recent-status", text: item.status }),
            h("span", { class: "summary-plus", "aria-hidden": "true", text: "+" })),
          h("p", { text: item.body }))))
    )
  );
}

function renderTools(root) {
  root.append(
    viewHeading(C.tools.title, C.tools.lede, "TOOLBOX"),
    h("section", { class: "tool-shelves" }, ...C.tools.groups.map((group, index) =>
      h("div", { class: `tool-shelf tool-shelf--${index + 1}` },
        h("h2", { text: group.title }),
        h("div", { class: "tool-row" }, ...group.items.map((tool) => h("span", { text: tool })))))),
    h("section", { class: "habit-section" },
      h("div", { class: "habit-copy" }, h("h2", { text: "做事时的几个习惯" }), h("p", { text: "说不上方法论，主要是被坑过以后留下来的。" })),
      h("div", { class: "habit-list" }, ...C.tools.habits.map((habit, index) =>
        h("details", { class: "habit-item", open: index === 0 },
          h("summary", null, h("span", { text: String(index + 1).padStart(2, "0") }), h("strong", { text: habit.title }), h("span", { class: "summary-plus", text: "+" })),
          h("p", { text: habit.body }))))
    )
  );
}

function renderNotes(root) {
  const entries = C.notes.entries[state.noteTab] || [];
  root.append(
    viewHeading(C.notes.title, C.notes.lede, "NOTES"),
    h("div", { class: "notes-tabs", role: "tablist", "aria-label": "笔记分类" }, ...C.notes.tabs.map((tab) =>
      h("button", { class: `notes-tab ${tab.id === state.noteTab ? "is-selected" : ""}`, type: "button", role: "tab", "data-action": "note-tab", "data-tab": tab.id, "aria-selected": String(tab.id === state.noteTab), text: tab.label }))),
    h("section", { class: "notes-paper" }, ...entries.map((entry, index) =>
      h("details", { class: "note-entry", open: index === 0 },
        h("summary", null, h("span", { class: "note-index", text: String(index + 1).padStart(2, "0") }), h("strong", { text: entry.title }), h("time", { text: entry.date })),
        h("p", { text: entry.body }))))
  );
}

function renderAbout(root) {
  root.append(
    viewHeading(C.about.title, C.about.lede, "JINGJING"),
    h("section", { class: "about-layout" },
      h("div", { class: "about-photo" }, h("img", { src: "assets/object-sheet.png", alt: "粉彩风格的电脑、相机和桌面小物" }), h("span", { text: "pharmacy / code / class notes" })),
      h("div", { class: "about-copy" }, ...C.about.paragraphs.map((text) => h("p", { text })),
        h("div", { class: "about-contact" }, h("strong", { text: "联系" }), h("p", { text: C.about.contact }), externalLink("去 GitHub", C.site.github, "button button--primary"))))
  );
}

function renderView(root) {
  root.innerHTML = "";
  const view = h("div", { class: `view view--${state.view}` });
  const renderers = { home: renderHome, projects: renderProjects, recent: renderRecent, tools: renderTools, notes: renderNotes, about: renderAbout };
  (renderers[state.view] || renderHome)(view);
  root.append(view);
  document.body.dataset.view = state.view;
  document.body.dataset.tone = C.tones[state.view] || "pink";
  document.querySelectorAll("[data-view]").forEach((link) => link.classList.toggle("is-active", link.dataset.view === state.view));
  window.__homepage = { view: state.view, navigate, filter: state.filter };
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  document.querySelector(".menu-button")?.setAttribute("aria-expanded", "false");
}

function navigate(view) {
  if (!validViews.has(view)) return;
  state.view = view;
  if (location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  renderView(document.getElementById("view-root"));
  closeMenu();
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  document.getElementById("view-root")?.focus({ preventScroll: true });
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
    if (action === "go-recent") navigate("recent");
    if (action === "toggle-menu") {
      const open = !document.body.classList.contains("menu-open");
      document.body.classList.toggle("menu-open", open);
      target.setAttribute("aria-expanded", String(open));
    }
    if (action === "close-menu") closeMenu();
    if (action === "filter") {
      state.filter = target.dataset.filter || "all";
      renderView(document.getElementById("view-root"));
    }
    if (action === "toggle-project") {
      const card = target.closest(".project-card");
      const open = card.classList.toggle("is-expanded");
      target.setAttribute("aria-expanded", String(open));
      target.firstElementChild.textContent = open ? "−" : "+";
    }
    if (action === "note-tab") {
      state.noteTab = target.dataset.tab || "current";
      renderView(document.getElementById("view-root"));
    }
    if (action === "kitty-hop") {
      window.dispatchEvent(new CustomEvent("kitty-hop"));
      target.animate([{ transform: "translateY(0)" }, { transform: "translateY(4px)" }, { transform: "translateY(0)" }], { duration: 240 });
    }
  });
  addEventListener("hashchange", () => {
    state.view = readView();
    renderView(document.getElementById("view-root"));
  });
  addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
}

export function renderAll() {
  const app = document.getElementById("app");
  if (!app) return;
  shell(app);
  bindEvents();
  renderView(document.getElementById("view-root"));
  document.title = C.site.title;
}
