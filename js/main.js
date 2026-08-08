import { renderAll } from "./ui/render.js";
import { prefersReducedMotion, qaMode } from "./util/anim.js";
import { createEvidenceCore } from "./gl/evidence-core.js";

const reduced = prefersReducedMotion();
const qa = qaMode();
let core = null;

renderAll();
wireHeader();
wireMenu();
wireReveals();

function wireHeader() {
  const header = document.getElementById("site-header");
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 18);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function wireMenu() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (!button || !nav) return;

  const setOpen = (open) => {
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    nav.classList.toggle("is-open", open);
  };
  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      button.focus();
    }
  });
  window.matchMedia("(min-width: 761px)").addEventListener?.("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

function wireReveals() {
  const items = [...document.querySelectorAll(".reveal")];
  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: .08, rootMargin: "0px 0px -4%" });
  items.forEach((item) => observer.observe(item));
}

function hasWebGL2() {
  if (new URLSearchParams(location.search).get("no-webgl") === "1") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function fallback(reason) {
  document.body.classList.remove("has-webgl");
  document.body.classList.add("no-webgl");
  window.__site = {
    ready: true,
    webgl: false,
    reduced,
    reason,
    get rendering() { return false; },
    get morph() { return .62; },
  };
  finishBoot();
}

async function bootCore() {
  if (!hasWebGL2()) { fallback("no-webgl2"); return; }
  try {
    const response = await fetch("data/molecule.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`molecule.json ${response.status}`);
    const molecule = await response.json();
    const canvas = document.getElementById("gl");
    core = createEvidenceCore(canvas, molecule, {
      reduced,
      qa,
      onContextLost: () => fallback("context-lost"),
    });
    document.body.classList.add("has-webgl");
    document.body.classList.remove("no-webgl");
    window.__site = {
      ready: true,
      webgl: true,
      reduced,
      get rendering() { return core?.rendering ?? false; },
      get morph() { return core?.morph ?? 0; },
    };
    finishBoot();
  } catch (error) {
    console.error(error);
    fallback("boot-failed");
  }
}

function finishBoot() {
  requestAnimationFrame(() => document.body.classList.remove("is-booting"));
}

bootCore();
