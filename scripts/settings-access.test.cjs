const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(['.tsx', '.ts', '.js'].map(e => base + e).find(fs.existsSync));
    }
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const { SettingsHome } = load(path.resolve('src/components/settings/SettingsHome.tsx'));
for (const role of ['admin','manager','reviewer','editor','viewer','']) test(`settings entry visibility: ${role || 'unknown'}`, () => {
  const html = renderToStaticMarkup(React.createElement(SettingsHome, { organization: null, role, error: '', checkedAt: '' }));
  assert.equal(html.includes('href="/settings/users"'), role === 'admin');
  assert.equal(html.includes('href="/settings/roles"'), role === 'admin');
  assert.equal(html.includes('href="#settings-organization"'), role === 'admin');
  assert.ok(html.includes('id="settings-price-data"'));
  assert.ok(html.includes('href="/settings/dictionaries"'));
});
