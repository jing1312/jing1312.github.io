/* ==========================================================================
   render.js — 把 content.js 渲染成 DOM。
   文案改动只发生在 content.js；这里只负责结构。
   ========================================================================== */

import * as C from "./../content.js";

/* 极简 hyperscript */
function h(tag, props = null, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("data-") || k === "role" || k.startsWith("aria-")) el.setAttribute(k, v);
      else el.setAttribute(k, v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const actHead = (kicker, no) =>
  h("div", { class: "act__index" },
    h("span", { class: "act__kicker", text: kicker }),
    h("span", { class: "act__no", text: no }));

const extLink = (href, label, cls = "link magnet") =>
  h("a", { class: cls, href, target: "_blank", rel: "noopener noreferrer", "data-magnet": "" }, label);

/* --------------------------------------------------------------------- ACT 1 */
function renderHero(root) {
  const d = C.hero;
  root.append(
    h("div", { class: "hero__top" },
      h("span", { class: "act__kicker", text: d.eyebrow }),
      h("span", { class: "act__no", text: d.index })),

    h("div", { class: "hero__mid" },
      h("h1", { class: "hero__name", lang: "en" }, d.name),
      h("p", { class: "d-la hero__latin", text: d.latin })),

    h("div", { class: "hero__bottom" },
      h("p", { class: "p hero__lede", text: d.lede }),
      h("div", { class: "hero__meta" },
        ...d.meta.map((m) =>
          h("div", null,
            h("span", { class: "m m--label", text: m.k }),
            h("span", { class: "m", text: m.v })))),
      h("div", { class: "hero__scroll" },
        h("span", { class: "m m--label", text: d.scrollHint }),
        h("span", { class: "bar" }),
        h("span", { class: "m m--label", text: "01 — 04" })))
  );
}

/* --------------------------------------------------------------------- ACT 2 */
function renderAbout(root) {
  const d = C.about;
  root.append(
    actHead(d.kicker, d.index),
    h("div", { class: "about__head" },
      h("h2", { class: "d-zh d-zh--s", text: d.title }),
      h("p", { class: "d-la d-la--i", text: d.latin })),
    h("div", { class: "about__body" },
      h("p", { class: "p about__lede", text: d.lede }),
      ...d.paras.map((p) => h("p", { class: "p", text: p }))),
    h("div", { class: "tags about__chips" }, ...d.chips.map((c) => h("span", { text: c })))
  );
}

/* --------------------------------------------------------------------- ACT 3 */
function renderProjects(root) {
  const d = C.projects;
  root.append(
    actHead(d.kicker, d.index),
    h("div", { class: "proj__head" },
      h("h2", { class: "d-zh d-zh--s", text: d.title }),
      h("p", { class: "p proj__lede", text: d.lede })),
    h("div", { class: "cards" },
      ...d.cards.map((c) =>
        h("a", { class: "card magnet", href: c.url, target: "_blank", rel: "noopener noreferrer", "data-magnet": "" },
          h("div", { class: "card__top" },
            h("span", { class: "card__repo", text: c.repo }),
            h("span", { class: "card__lang", text: c.lang })),
          h("p", { class: "p p--s card__desc", text: c.desc }),
          h("span", { class: "card__more", text: "查看仓库 ↗" })))),
    h("p", { class: "m proj__more" }, extLink(d.more.url, d.more.label))
  );
}

/* --------------------------------------------------------------------- ACT 4 */
function renderContact(root) {
  const d = C.contact;
  root.append(
    actHead(d.kicker, d.index),
    h("div", { class: "contact__head" },
      h("h2", { class: "d-zh d-zh--s", text: d.title }),
      h("p", { class: "d-la d-la--i", text: d.latin })),
    h("div", { class: "contact__body" },
      h("p", { class: "p contact__lede", text: d.lede }),
      d.email
        ? h("p", { class: "p" }, extLink(d.email.href, d.email.value), h("span", { class: "m", style: "color:var(--fg-38)", text: " · " + d.email.label }))
        : null,
      h("a", { class: "closing__cta magnet", href: d.cta.url, target: "_blank", rel: "noopener noreferrer", "data-magnet": "" }, d.cta.label)),
    h("div", { class: "colophon" },
      h("span", { class: "m m--label", text: "关于这一页" }),
      h("ul", null, ...d.colophon.map((l) => h("li", { text: l })))),
    h("div", { class: "page-footer" },
      h("span", { class: "m", style: "color:var(--fg-60)", text: d.footer }))
  );
}

/* --------------------------------------------------------------- 章节轨 */
function renderRail() {
  const rail = document.getElementById("rail");
  if (!rail) return;
  const labels = ["首页", "关于", "项目", "联系"];
  C.acts.forEach((a, i) => {
    const b = h("button", { class: "rail__item", type: "button", "data-goto": a.id, "aria-label": `第 ${i + 1} 幕：${labels[i]}` },
      h("span", { class: "lbl", text: labels[i] }),
      h("span", { class: "tick" }));
    rail.append(b);
  });
}

/* --------------------------------------------------------------- 入口 */
export function renderAll() {
  const map = {
    "act-hero": renderHero,
    "act-about": renderAbout,
    "act-projects": renderProjects,
    "act-contact": renderContact,
  };
  for (const [id, fn] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) fn(el);
  }
  renderRail();
  document.title = C.site.title;
}