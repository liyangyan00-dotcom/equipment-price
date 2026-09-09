const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, globals = {}, imports = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name) => imports[name] ?? require(name), ...globals });
  return exports;
}

const { readSettingsPages } = load("src/lib/data/readSettingsPages.ts");
test("settings reads beyond the first API page", async () => {
  const data = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const result = await readSettingsPages(async (from, to) => ({ data: data.slice(from, to + 1), error: null }));
  assert.equal(result.data.length, 1201);
  assert.equal(result.data[1200].id, 1200);
});
test("later page failure does not report partial totals", async () => {
  const result = await readSettingsPages(async (from) => from ? { data: null, error: { message: "unavailable" } } : { data: Array(500).fill({}), error: null });
  assert.equal(result.data, null);
  assert.equal(result.error.message, "unavailable");
});
test("bounded reads fail explicitly", async () => {
  const result = await readSettingsPages(async () => ({ data: Array(500).fill({}), error: null }));
  assert.equal(result.data, null);
  assert.ok(result.error);
});

function guard(dirty, busy = false) {
  const listeners = new Map();
  let confirmed = false;
  let prompts = 0;
  let cleanup;
  class Element { closest() { return this; } }
  class Anchor extends Element {
    constructor(href) { super(); this.href = new URL(href, "http://localhost/settings/ai").href; this.raw = href; this.target = ""; }
    hasAttribute() { return false; }
    getAttribute() { return this.raw; }
  }
  const events = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) };
  const { useUnsavedSettings } = load("src/hooks/useUnsavedSettings.ts", {
    URL, Element, HTMLAnchorElement: Anchor,
    document: events,
    window: { ...events, location: { href: "http://localhost/settings/ai" }, confirm: () => { prompts++; return confirmed; } },
  }, { react: { useCallback: (fn) => fn, useEffect: (fn) => { cleanup = fn(); } } });
  const leave = useUnsavedSettings(dirty, busy);
  return {
    leave, listeners, prompts: () => prompts, accept: () => { confirmed = true; }, cleanup: () => cleanup?.(),
    click: (href) => {
      const event = { target: new Anchor(href), button: 0, prevented: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() {} };
      listeners.get("click")?.(event);
      return event.prevented;
    },
  };
}
test("dirty route navigation and explicit close require confirmation", () => {
  const g = guard(true);
  assert.equal(g.click("/settings"), true);
  assert.equal(g.leave(), false);
  g.accept();
  assert.equal(g.click("/settings"), false);
  assert.equal(g.leave(), true);
  g.cleanup();
  assert.equal(g.listeners.size, 0);
});
test("refresh links are guarded; same-page anchors are not", () => {
  const g = guard(true);
  assert.equal(g.click("/settings/ai"), true);
  assert.equal(g.click("#models"), false);
});
test("clean state has no listeners, saving cannot be dismissed", () => {
  assert.equal(guard(false).listeners.size, 0);
  const saving = guard(true, true);
  assert.equal(saving.leave(), false);
  assert.equal(saving.prompts(), 0);
});
test("refresh and close request the browser unsaved warning", () => {
  const g = guard(true);
  let prevented = false;
  const event = { preventDefault: () => { prevented = true; } };
  g.listeners.get("beforeunload")(event);
  assert.equal(prevented, true);
  assert.equal(event.returnValue, "");
});
