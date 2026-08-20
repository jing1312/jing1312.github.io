/* render.js — 单页滚动布局，一次性渲染所有 section */
import * as C from "../content.js";

function h(tag, props = null, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const child of kids.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function extLink(label, href, cls = "text-link") {
  return h("a", { class: cls, href, target: "_blank", rel: "noopener noreferrer" },
    h("span", { text: label }), h("span", { class: "link-arrow", "aria-hidden": true, text: "↗" }));
}

function btn(label, action, cls = "btn btn--soft", sym = "") {
  return h("button", { class: cls, type: "button", "data-action": action },
    sym ? h("span", { class: "btn-sym", "aria-hidden": true, text: sym }) : null,
    h("span", { text: label }));
}

/* ── Shell ── */
function shell(app) {
  const nav = h("header", { class: "top-nav" },
    h("a", { class: "nav-brand", href: "#hero", "data-view": "home", "aria-label": "回到首页" },
      h("span", { class: "brand-avatar" }, h("img", { src: "assets/hello-kitty-avatar.png", alt: "" })),
      h("span", { class: "brand-copy" }, h("strong", { text: "jingjing" }), h("small", { text: "药学 / 小工具" }))),
    h("nav", { class: "nav-links", id: "nav-links" },
      ...C.nav.map((item) => h("a", { href: `#${item.id}`, "data-view": item.id, text: item.label }))),
    extLink("GitHub", C.site.github, "nav-github"),
    h("button", { class: "menu-btn", type: "button", "data-action": "toggle-menu", "aria-expanded": "false", "aria-controls": "nav-links", "aria-label": "打开导航" },
      h("span", { "aria-hidden": true, text: "☰" }))
  );
  const backdrop = h("button", { class: "menu-backdrop", type: "button", "data-action": "close-menu", "aria-label": "关闭导航", tabindex: "-1" });
  const content = h("main", { class: "scroll-content" });
  const footer = h("footer", { class: "site-footer" },
    h("span", { text: "大三这一年：上课、复习，也写点自己用的东西。" }),
    extLink("github.com/jing1312", C.site.github));
  app.append(nav, backdrop, content, footer);
  return content;
}

/* ── Sections ── */
function renderHero() {
  const d = C.hero;
  return h("section", { id: "hero", "data-section": "home", class: "section section--hero" },
    h("div", { class: "hero-inner reveal" },
      h("span", { class: "status-pill" }, h("span", { class: "status-dot" }), h("span", { text: d.badge })),
      h("h1", { class: "hero-title" }, "你好，我是 ", h("span", { class: "hero-name", text: "jingjing" })),
      h("p", { class: "hero-lede", text: d.lede }),
      h("div", { class: "hero-actions" },
        btn(d.primary, "go-projects", "btn btn--primary", "→"),
        btn(d.secondary, "go-recent", "btn btn--soft", "↗")),
      h("dl", { class: "fact-row" }, ...d.facts.map((f) => h("div", null,
        h("dt", { text: f.value }), h("dd", { text: f.label }))))
    )
  );
}

function renderProjects() {
  return h("section", { id: "projects", "data-section": "projects", class: "section section--projects" },
    h("div", { class: "section-inner reveal" },
      h("header", { class: "section-head" },
        h("h2", { class: "section-title", text: C.projects.title }),
        h("p", { class: "section-lede", text: C.projects.lede })),
      h("div", { class: "project-grid" }, ...C.projects.cards.map((p, i) =>
        h("article", { class: `project-card project-card--${p.accent} reveal` },
          h("div", { class: "pc-head" },
            h("span", { class: "pc-num", text: String(i + 1).padStart(2, "0") }),
            h("span", { class: "pc-status", text: p.status })),
          h("div", { class: "pc-name" }, h("h3", { text: p.repo }), h("span", { class: "pc-lang", text: p.lang })),
          h("span", { class: "pc-cat", text: p.categoryLabel }),
          h("p", { class: "pc-desc", text: p.desc }),
          h("div", { class: "pc-actions" },
            h("button", { class: "expand-btn", type: "button", "data-action": "toggle-project", "aria-expanded": "false" },
              h("span", { "aria-hidden": true, text: "+" }), "展开"),
            extLink("仓库", p.url)),
          h("div", { class: "pc-detail" },
            h("div", null, h("strong", { text: "为什么做" }), h("p", { text: p.why })),
            h("div", null, h("strong", { text: "现在到哪了" }), h("p", { text: p.done })),
            h("div", null, h("strong", { text: "下一步" }), h("p", { text: p.next })))
        ))))
  );
}

function renderRecent() {
  return h("section", { id: "recent", "data-section": "recent", class: "section section--recent" },
    h("div", { class: "section-inner reveal" },
      h("header", { class: "section-head" },
        h("h2", { class: "section-title", text: C.recent.title }),
        h("p", { class: "section-lede", text: C.recent.lede })),
      h("div", { class: "recent-list" }, ...C.recent.items.map((item, i) =>
        h("details", { class: `recent-item recent-item--${item.tone} reveal`, open: i === 0 },
          h("summary", null,
            h("span", { class: "recent-when", text: item.when }),
            h("strong", { text: item.title }),
            h("span", { class: "recent-status", text: item.status }),
            h("span", { class: "summary-plus", "aria-hidden": true, text: "+" })),
          h("p", { text: item.body }))))
    )
  );
}

function renderTools() {
  return h("section", { id: "tools", "data-section": "tools", class: "section section--tools" },
    h("div", { class: "section-inner reveal" },
      h("header", { class: "section-head" },
        h("h2", { class: "section-title", text: C.tools.title }),
        h("p", { class: "section-lede", text: C.tools.lede })),
      h("div", { class: "tool-shelves" }, ...C.tools.groups.map((g, i) =>
        h("div", { class: `tool-shelf tool-shelf--${i + 1} reveal` },
          h("h3", { text: g.title }),
          h("div", { class: "tool-row" }, ...g.items.map((t) => h("span", { text: t }))))),
      h("div", { class: "habit-section reveal" },
        h("div", { class: "habit-copy" }, h("h3", { text: "做事时的几个习惯" }), h("p", { text: "说不上方法论，主要是被坑过以后留下来的。" })),
        h("div", { class: "habit-list" }, ...C.tools.habits.map((hb, i) =>
          h("details", { class: "habit-item", open: i === 0 },
            h("summary", null, h("span", { text: String(i + 1).padStart(2, "0") }), h("strong", { text: hb.title }), h("span", { class: "summary-plus", text: "+" })),
            h("p", { text: hb.body })))))
    )
  ));
}

function renderNotes() {
  const entries = C.notes.entries.current;
  return h("section", { id: "notes", "data-section": "notes", class: "section section--notes" },
    h("div", { class: "section-inner reveal" },
      h("header", { class: "section-head" },
        h("h2", { class: "section-title", text: C.notes.title }),
        h("p", { class: "section-lede", text: C.notes.lede })),
      h("div", { class: "notes-paper" }, ...entries.map((e, i) =>
        h("details", { class: `note-entry reveal`, open: i === 0 },
          h("summary", null, h("span", { class: "note-index", text: String(i + 1).padStart(2, "0") }), h("strong", { text: e.title }), h("time", { text: e.date })),
          h("p", { text: e.body }))))
    )
  );
}

function renderAbout() {
  return h("section", { id: "about", "data-section": "about", class: "section section--about" },
    h("div", { class: "section-inner reveal" },
      h("header", { class: "section-head" },
        h("h2", { class: "section-title", text: C.about.title }),
        h("p", { class: "section-lede", text: C.about.lede })),
      h("div", { class: "about-layout" },
        h("div", { class: "about-photo reveal" }, h("img", { src: "assets/object-sheet.png", alt: "粉彩风格的电脑、相机和桌面小物" }), h("span", { text: "pharmacy / code / class notes" })),
        h("div", { class: "about-copy reveal" }, ...C.about.paragraphs.map((t) => h("p", { text: t })),
          h("div", { class: "about-contact" }, h("strong", { text: "联系" }), h("p", { text: C.about.contact }), extLink("去 GitHub", C.site.github, "btn btn--primary"))))
    )
  );
}

/* ── Events ── */
function bindEvents() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.dataset.action;
    if (a === "go-projects") { document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }
    if (a === "go-recent") { document.getElementById("recent")?.scrollIntoView({ behavior: "smooth" }); }
    if (a === "toggle-menu") {
      const open = !document.body.classList.contains("menu-open");
      document.body.classList.toggle("menu-open", open);
      t.setAttribute("aria-expanded", String(open));
    }
    if (a === "close-menu") { document.body.classList.remove("menu-open"); }
    if (a === "toggle-project") {
      const card = t.closest(".project-card");
      const open = card.classList.toggle("is-expanded");
      t.setAttribute("aria-expanded", String(open));
      t.firstElementChild.textContent = open ? "−" : "+";
    }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") document.body.classList.remove("menu-open"); });
}

export function renderAll() {
  const app = document.getElementById("app");
  if (!app) return;
  const content = shell(app);
  content.append(renderHero(), renderProjects(), renderRecent(), renderTools(), renderNotes(), renderAbout());
  bindEvents();
  document.title = C.site.title;
}
