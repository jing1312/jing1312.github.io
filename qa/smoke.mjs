import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as content from "../js/content.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");

assert.equal(content.nav.length, 6, "主页应有 6 个一级视图");
assert.equal(content.projects.cards.length, 8, "项目柜应显示 8 个项目");
assert.equal(new Set(content.nav.map((item) => item.id)).size, content.nav.length, "导航 id 不能重复");
assert.deepEqual(content.nav.map((item) => item.label), ["首页", "项目", "最近", "工具", "笔记", "关于"], "顶部导航栏目不符合新版信息架构");

const categories = new Set(content.projects.cards.map((project) => project.category));
for (const filter of content.projects.filters.filter((item) => item.id !== "all")) {
  assert(categories.has(filter.id), `项目筛选 ${filter.id} 没有对应项目`);
}

for (const project of content.projects.cards) {
  assert(project.repo && project.desc && project.why && project.done && project.next, `${project.repo || "项目"} 的说明不完整`);
  assert.equal(new URL(project.url).hostname, "github.com", `${project.repo} 的链接不是 GitHub`);
}

const index = await read("index.html");
assert(!index.includes('id="poster"'), "静态兜底人物不应常驻页面并覆盖正文");
const localAssets = [...index.matchAll(/(?:src|href)="([^"#][^"]*)"/g)]
  .map((match) => match[1])
  .filter((path) => !path.startsWith("http") && !path.startsWith("data:"))
  .map((path) => new URL(path, "https://local.invalid/").pathname.slice(1));
for (const asset of localAssets) await access(join(root, asset));

const render = await read("js/ui/render.js");
assert(render.includes('id: "character-stage"'), "首页缺少独立的 3D 人物舞台");
assert(render.includes('class: "top-nav"'), "新版缺少顶部导航");
assert(!render.includes('class: "side-nav"'), "新版不应继续使用旧侧栏");
await access(join(root, "js/gl/character-stage.js"));
await access(join(root, "assets/character-hero.png"));
for (const action of ["filter", "toggle-project", "note-tab", "toggle-menu", "kitty-hop"]) {
  assert(render.includes(`action === "${action}"`), `缺少交互处理：${action}`);
}

const sourceFiles = ["README.md", "index.html", "js/content.js", "js/main.js", "js/ui/render.js", "js/gl/character-stage.js", "css/layout.css"];
const privatePattern = /[A-Za-z]:\\|C:\/Users|D:\/|江静静|\bsk-[A-Za-z0-9]{12,}|github_pat_/;
for (const file of sourceFiles) {
  assert(!privatePattern.test(await read(file)), `${file} 包含本机路径或密钥模式`);
}

const publicCopy = `${await read("index.html")}\n${await read("js/content.js")}\n${await read("js/ui/render.js")}`;
for (const phrase of ["研究花园", "科学小花园", "正在生长", "交汇处", "持续改进", "种点什么"]) {
  assert(!publicCopy.includes(phrase), `公开文案仍包含模板化表达：${phrase}`);
}

const stage = await read("js/gl/character-stage.js");
assert(stage.includes("KITTY_BOB_AMPLITUDE"), "3D 舞台没有独立的 Kitty 动态幅度参数");
assert(stage.includes("createCapsule") && stage.includes("createRobot"), "3D 舞台缺少药丸或机器人立体组件");

console.log(`smoke ok: ${content.nav.length} views, ${content.projects.cards.length} projects, ${localAssets.length} local assets`);
