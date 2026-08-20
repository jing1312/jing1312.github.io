/* main.js — 全屏 3D 沉浸式 + 滚动驱动 */
import { renderAll } from "./ui/render.js";
import { createImmersiveScene } from "./gl/immersive-scene.js";
import { prefersReducedMotion } from "./util/anim.js";

// 1) 先渲染 DOM 内容
renderAll();

// 2) 立刻解除 booting 遮罩 —— 内容先可见，3D 是锦上添花
document.body.classList.remove("is-booting");

// 3) 再初始化 3D（失败不影响内容）
const canvas = document.getElementById("bg-canvas");
let scene3d = null;

function hasWebGL() {
  try {
    const p = document.createElement("canvas");
    return !!(p.getContext("webgl2") || p.getContext("webgl"));
  } catch { return false; }
}

if (canvas && hasWebGL()) {
  try {
    scene3d = createImmersiveScene(canvas, {
      reducedMotion: prefersReducedMotion(),
      onReady: () => document.body.classList.add("scene-ready"),
    });
  } catch (e) {
    console.error("[3D] init failed, falling back to static:", e);
    document.body.classList.add("no-webgl");
  }
} else {
  document.body.classList.add("no-webgl");
}

/* ── 滚动驱动 ── */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    scene3d?.setScroll(p);
    ticking = false;
  });
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ── 导航：平滑滚动 ── */
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || link.classList.contains("skip-link")) return;
  const id = link.getAttribute("href").slice(1);
  const target = document.getElementById(id);
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
});

/* ── IntersectionObserver: 高亮导航 + scroll reveal ── */
const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll("section[data-section]");

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.dataset.section;
      navLinks.forEach((l) => l.classList.toggle("is-active", l.dataset.view === id));
    }
  });
}, { rootMargin: "-40% 0px -55% 0px" });
sections.forEach((s) => navObserver.observe(s));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-revealed");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ── 导航栏滚动缩小 ── */
const nav = document.querySelector(".top-nav");
function onNavScroll() {
  if (scrollY > 60) nav?.classList.add("is-compact");
  else nav?.classList.remove("is-compact");
}
addEventListener("scroll", onNavScroll, { passive: true });
onNavScroll();
