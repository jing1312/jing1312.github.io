/* ==========================================================================
   render.js — 把 content.js 渲染成 DOM。
   文案改动只发生在 content.js；这里只负责结构。
   ========================================================================== */

import * as C from "../content.js";

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
      h("h1", { class: "hero__title" },
        ...d.titleLines.map((l) => h("span", { class: "d-zh", text: l })))),

    h("div", { class: "hero__latin" },
      h("p", { class: "d-la", text: d.latin }),
      h("span", { class: "hero__dash" })),

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
        h("span", { class: "m m--label", text: "01 — 06" })))
  );
}

/* --------------------------------------------------------------------- ACT 2 */
function renderThesis(root) {
  const d = C.thesis;
  root.append(
    actHead(d.kicker, d.index),
    h("div", { class: "thesis__head" }, h("h2", { class: "d-zh d-zh--s", text: d.title })),
    h("div", { class: "thesis__latin" }, h("p", { class: "d-la d-la--i", text: d.latin })),
    h("p", { class: "p thesis__lede", text: d.lede }),
    h("div", { class: "layers" },
      ...d.layers.map((l) =>
        h("div", { class: "layer" },
          h("span", { class: "layer__no", text: l.no }),
          h("span", { class: "layer__title", text: l.title }),
          h("span", { class: "layer__claim", text: l.claim }),
          h("span", { class: "layer__repo", text: l.repo })))),
    h("p", { class: "thesis__outro", text: d.outro })
  );
}

/* ------------------------------------------------------- 项目幕通用侧栏 */
function projSide(d) {
  const rows = [
    ["repo", d.repo],
    ["lang", d.lang],
    d.license ? ["license", d.license] : null,
  ].filter(Boolean);
  return h("aside", { class: "proj__side" },
    h("span", { class: "proj__no", text: d.no }),
    h("dl", null, ...rows.map(([k, v]) => h("div", null, h("dt", { text: k }), h("dd", { text: v })))),
    h("p", { class: "m", style: "margin-top:.7rem" }, extLink(d.url, "查看仓库 ↗")),
    d.siblings
      ? h("div", { style: "margin-top:.9rem" },
          h("span", { class: "m m--label", text: "配套仓库" }),
          ...d.siblings.map((s) =>
            h("p", { class: "m", style: "margin-top:.28rem" },
              extLink(s.url, s.repo), h("span", { class: "m", style: "color:var(--fg-38)", text: " · " + s.role })))) 
      : null
  );
}

/* --------------------------------------------------------------------- ACT 3 */
function renderP1(root) {
  const d = C.projectOne;
  root.append(
    actHead(d.kicker, d.index),
    projSide(d),
    h("div", { class: "proj__main" },
      h("h2", { class: "d-zh d-zh--s proj__title", text: d.title }),
      h("blockquote", { class: "pullquote" },
        h("p", { class: "pullquote__en", text: d.quote }),
        h("p", { class: "pullquote__zh", text: d.quoteZh })),
      h("p", { class: "p", style: "max-width:62ch", text: d.body }),
      h("div", { class: "flow" },
        ...d.flow.map((n, i) =>
          h("span", { class: "flow__node" + (i === d.evidenceGateIndex ? " is-gate" : ""), text: n }))),
      h("div", { class: "points" },
        ...d.points.map((p) =>
          h("div", { class: "point" },
            h("p", { class: "point__t", text: p.t }),
            h("p", { class: "point__d", text: p.d }))))),
    h("div", { class: "honesty" },
      h("span", { class: "honesty__label", text: d.honestyLabel }),
      h("p", { class: "honesty__body", text: d.honesty }))
  );
}

/* --------------------------------------------------------------------- ACT 4 */
function renderP2(root) {
  const d = C.projectTwo;
  root.append(
    actHead(d.kicker, d.index),
    h("div", { class: "counters" },
      ...d.counters.map((c) =>
        h("div", { class: "counter" },
          h("span", {
            class: "count", "data-counting": "", "data-target": c.value,
            "data-suffix": c.suffix || "", text: "0" + (c.suffix || ""),
          }),
          h("span", { class: "counter__unit", text: c.unit }),
          h("span", { class: "counter__note", text: c.note })))),
    projSide(d),
    h("div", { class: "proj__main" },
      h("h2", { class: "d-zh d-zh--s proj__title", text: d.title })),
    h("div", { class: "p2__body" }, h("p", { class: "p", text: d.body })),
    h("div", { class: "p2__craft" },
      h("span", { class: "m m--label", text: "工程细节" }),
      h("ul", { class: "craft" }, ...d.craft.map((c) => h("li", { text: c })))),
    h("div", { class: "asr" },
      h("table", null,
        h("caption", { class: "m m--label", text: d.asrTitle }),
        h("thead", null, h("tr", null,
          h("th", { scope: "col", text: "方案" }),
          h("th", { scope: "col", text: "结论" }),
          h("th", { scope: "col", text: "实测理由" }))),
        h("tbody", null,
          ...d.asr.map((a) =>
            h("tr", { class: a.primary ? "is-primary" : a.verdict === "弃用" ? "is-dropped" : "" },
              h("td", { text: a.name }),
              h("td", { text: a.verdict }),
              h("td", { text: a.note })))))),
    h("p", { class: "p p--s p--60 p2__footer", text: d.footer })
  );
}

/* --------------------------------------------------------------------- ACT 5 */
function renderP3(root) {
  const d = C.projectThree;
  const r = C.research;
  const m = C.molecule;

  root.append(
    actHead(d.kicker, d.index),
    projSide(d),
    h("div", { class: "proj__main" },
      h("h2", { class: "d-zh d-zh--s proj__title", text: d.title })),
    h("div", { class: "p3__quote" }, h("p", { class: "d-zh", text: d.quote })),

    h("div", { class: "p3__grid" },
      h("div", { class: "p3__body" }, h("p", { class: "p", text: d.body })),
      h("div", { class: "p3__model" },
        h("span", { class: "m m--label", text: d.modelTitle }),
        h("ul", { class: "chain" },
          ...d.model.map((s, i) => h("li", { "data-i": String(i + 1).padStart(2, "0"), text: s }))),
        h("div", { class: "tags" }, ...d.archetypes.map((a) => h("span", { text: a }))),
        h("span", { class: "m m--label", style: "display:block;margin-top:.8rem", text: d.paletteTitle }),
        h("div", { class: "tags" }, ...d.paletteRoles.map((p) => h("span", { text: p })))),
      h("div", { class: "p3__pipe" },
        h("span", { class: "m m--label", text: d.pipelineTitle }),
        h("ul", { class: "chain" },
          ...d.pipeline.map((s, i) => h("li", { "data-i": String(i + 1).padStart(2, "0"), text: s }))),
        h("div", { class: "tags" }, ...d.checks.map((c) => h("span", { text: c })))),
      h("div", { class: "p3__banned" },
        h("span", { class: "m m--label", text: d.bannedTitle }),
        h("ul", { class: "banned" }, ...d.banned.map((b) => h("li", { text: b })))),
      h("div", { class: "p3__self" },
        h("div", { class: "selfcheck" },
          h("span", { class: "m m--label", text: d.selfCheckLabel }),
          h("p", { class: "p p--s", style: "margin-top:.3rem", text: d.selfCheck })))),

    h("div", { class: "p3__philosophy" }, h("p", { class: "h2", text: d.philosophy })),

    h("div", { class: "research" },
      h("div", { class: "research__head" },
        h("span", { class: "m m--label", text: r.kicker }),
        h("p", { class: "d-la", style: "font-size:clamp(1.2rem,2.6vw,2.6rem);margin:.3rem 0 .6rem", text: r.latin }),
        h("h3", { class: "h2", text: r.title })),
      h("div", { class: "research__body" }, ...r.paras.map((p) => h("p", { class: "p", text: p }))),
      h("div", { class: "research__stack" },
        ...r.stack.map((s) =>
          h("div", null, h("span", { class: "m m--label", text: s.k }), h("span", { class: "m", text: s.v })))),
      h("p", { class: "m research__note", style: "color:var(--fg-38)", text: r.draftNotice }),
      h("div", { class: "mol", id: "mol-panel" },
        h("span", { class: "mol__hint", text: m.dragHint }),
        h("ul", null,
          h("li", { text: `${m.nameZh} ${m.nameEn} · ${m.formulaPretty}` }),
          ...m.facts.map((f) => h("li", { text: f }))),
        h("p", { class: "p p--s p--60", style: "margin-top:.6rem", text: m.why })))
  );
}

/* --------------------------------------------------------------------- ACT 6 */
function renderClosing(root) {
  const d = C.index6;
  const c = C.closing;

  root.append(
    actHead(d.kicker, c.index),
    h("div", { style: "grid-column:1/span 6" },
      h("h2", { class: "d-zh d-zh--s", text: d.title }),
      h("p", { class: "p p--60", style: "margin-top:.6rem", text: d.lede })),
    h("div", { style: "grid-column:8/-1;align-self:end;text-align:right" },
      h("p", { class: "d-la d-la--i", style: "font-size:clamp(1.2rem,3vw,3rem)", text: d.latin })),

    h("div", { class: "idx", style: "margin-top:clamp(1.6rem,5vh,3.5rem)" },
      ...d.items.map((it) =>
        h("div", { class: "idx__row" },
          h("div", null, extLink(it.url, it.repo, "idx__repo magnet")),
          h("div", null,
            h("p", { class: "idx__desc", text: it.desc }),
            it.attribution
              ? h("p", { class: "idx__attr" },
                  it.attribution.text, " · ",
                  h("a", { class: "link", href: it.attribution.upstream, target: "_blank", rel: "noopener noreferrer" },
                    it.attribution.upstreamName))
              : null),
          h("div", { class: "idx__meta" },
            it.lang,
            it.stars != null ? h("span", null, h("br"), `★ ${it.stars}`) : null))),
      h("p", { class: "m idx__note", style: "color:var(--fg-38)", text: d.starNote })),

    h("div", { class: "closing" },
      h("div", { class: "closing__title" }, h("p", { class: "d-zh", text: c.title })),
      h("p", { class: "p closing__body", text: c.body }),
      h("a", {
        class: "closing__cta magnet", href: c.cta.url, target: "_blank",
        rel: "noopener noreferrer", "data-magnet": "",
      }, c.cta.label)),

    modulesBlock(),

    h("div", { class: "colophon" },
      h("span", { class: "m m--label", text: c.colophonTitle }),
      h("ul", null, ...c.colophon.map((l) => h("li", { text: l })))),

    h("div", { class: "page-footer" },
      h("span", { class: "m", style: "color:var(--fg-60)", text: c.footer }),
      h("span", { class: "m", style: "color:var(--fg-38)", text: "EVIDENCE OVER ASSERTION" }))
  );
}

/* 可选模块：默认关闭，改 content.js 里的 enabled 即可出现 */
function modulesBlock() {
  const wrap = h("div", { style: "grid-column:1/-1" });
  const { publications, contact } = C.modules;

  if (publications?.enabled && publications.items?.length) {
    wrap.append(
      h("div", { style: "margin-top:clamp(2rem,6vh,5rem);border-top:1px solid var(--rule);padding-top:1rem" },
        h("span", { class: "m m--label", text: publications.title }),
        h("ul", { class: "craft", style: "margin-top:.5rem" },
          ...publications.items.map((p) =>
            h("li", null,
              p.url ? extLink(p.url, p.title) : p.title,
              h("span", { class: "m", style: "color:var(--fg-38)", text: ` — ${p.authors}. ${p.venue}, ${p.year}.` }))))));
  }
  if (contact?.enabled && contact.lines?.length) {
    wrap.append(
      h("div", { style: "margin-top:clamp(1.4rem,4vh,3rem);border-top:1px solid var(--rule);padding-top:1rem" },
        h("span", { class: "m m--label", text: contact.title }),
        h("ul", { class: "craft", style: "margin-top:.5rem" },
          ...contact.lines.map((l) =>
            h("li", null, `${l.label} · `, l.href ? extLink(l.href, l.value) : l.value)))));
  }
  return wrap;
}

/* --------------------------------------------------------------- 章节轨 */
function renderRail() {
  const rail = document.getElementById("rail");
  if (!rail) return;
  const labels = ["主张", "主线", "执行可信", "规模摄取", "质量裁决", "结尾"];
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
    "act-thesis": renderThesis,
    "act-p1": renderP1,
    "act-p2": renderP2,
    "act-p3": renderP3,
    "act-closing": renderClosing,
  };
  for (const [id, fn] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) fn(el);
  }
  renderRail();
  document.title = C.site.title;
}
