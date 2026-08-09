/* main.js — 页面入口与 Three.js 人物舞台。 */

import { renderAll } from "./ui/render.js?v=kitty-20260810-2";
import { createCharacterStage } from "./gl/character-stage.js?v=kitty-20260810-2";
import { prefersReducedMotion } from "./util/anim.js";

renderAll();

const canvas = document.getElementById("character-stage");

function hasWebGL() {
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

function fallback(reason) {
  document.body.classList.add("no-webgl");
  document.body.classList.remove("is-booting");
  window.__site = { ready: true, webgl: false, reason, get view() { return window.__homepage?.view || "home"; } };
}

if (!canvas || !hasWebGL()) {
  fallback("no-webgl");
} else {
  try {
    const character = createCharacterStage(canvas, {
      reducedMotion: prefersReducedMotion(),
      onReady: () => document.body.classList.add("character-ready"),
    });
    document.body.classList.remove("is-booting");
    window.__site = {
      ready: true,
      webgl: true,
      character,
      get view() { return window.__homepage?.view || "home"; },
    };
  } catch (error) {
    console.error("人物舞台启动失败", error);
    fallback("boot-failed");
  }
}
