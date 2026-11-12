const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { hash, overlap, sel, format } = require('./scripts/measure.js');

assert.match(hash('abc'), /^[0-9a-f]{8}$/, 'hash is 8 hex chars');
assert.strictEqual(hash('abc'), hash('abc'), 'hash is stable');
assert.notStrictEqual(hash('1,2,3'), hash('1,2,4'), 'hash changes with input');

const box = (left, top, right, bottom) => ({ left, top, right, bottom });
assert(overlap(box(0, 0, 10, 10), box(5, 5, 15, 15)), 'overlapping rects');
assert(!overlap(box(0, 0, 10, 10), box(10, 0, 20, 10)), 'touching rects do not overlap');
assert(!overlap(box(0, 0, 10, 10), box(0, 20, 10, 30)), 'separate rects');

assert.strictEqual(sel('DIV', 'main', ' a  b c '), 'div#main.a.b', 'tag#id plus two classes');
assert.strictEqual(sel('SPAN', '', null), 'span', 'bare tag');
assert(sel('DIV', 'x'.repeat(60), '').length <= 40, 'selector truncated');

assert.strictEqual(format(1280, 800, 'ab12cd34', []), 'visual-pass 1280x800 fp=ab12cd34 issues=0', 'clean output is one line');
const many = [];
for (let i = 0; i < 10; i++) many.push(['font', `p${i} 9px`]);
for (let c = 0; c < 8; c++) for (let i = 0; i < 2; i++) many.push([`cat${c}`, `el${i}`]);
const out = format(375, 812, '00000000', many).split('\n');
assert.strictEqual(out[0], 'visual-pass 375x812 fp=00000000 issues=26', 'header counts every issue');
assert.strictEqual(out.filter((l) => l.startsWith('font')).length, 3, 'at most 3 per category');
assert(out.length <= 16, 'output is capped');
assert.match(out[out.length - 1], /^\+\d+ more$/, 'reports how many were cut');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-pass-'));
const exec = (args, input) =>
  execFileSync(process.execPath, [path.join(__dirname, 'hooks', 'visual-pass.js'), ...args], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8',
    input,
  });
const set = (...a) => exec(['set', ...a]);
const sid = `test-${process.pid}`;
const marker = path.join(os.tmpdir(), `visual-pass-${sid}`);
fs.rmSync(marker, { force: true });
const hook = (file, session = sid) =>
  exec([], JSON.stringify({ session_id: session, hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: file } }));

assert.match(set(), /auto: off/, 'auto off by default');
assert.strictEqual(hook('src/App.tsx'), '', 'off: no output');

assert.match(set('light'), /VISUAL PASS LIGHT/, 'light pass');
assert.doesNotMatch(set('light'), /Transitions/, 'light has no transitions');
assert.match(set('full'), /VISUAL PASS FULL[\s\S]*Scope[\s\S]*Transitions/, 'full is light plus transitions');
assert.match(set('ultra'), /60-120k tokens[\s\S]*375x812/, 'ultra states its cost and two viewports');
assert.match(set('light'), /measure\.js/, 'pass points at the measuring script');
assert.match(set('bogus'), /Usage/, 'unknown argument shows usage');

assert.match(set('auto', 'ultra'), /never ultra/, 'auto refuses ultra');
assert.match(set(), /auto: off/, 'refused ultra leaves state alone');
assert.match(set('auto'), /auto set to light/, 'bare auto means light');
assert.match(set(), /auto: light/, 'auto persists');

const on = hook('src/App.tsx');
assert.strictEqual(on.trim().split('\n').length, 1, 'on: one line');
const ctx = JSON.parse(on).hookSpecificOutput;
assert.strictEqual(ctx.hookEventName, 'PostToolUse');
assert.match(ctx.additionalContext, /light visual pass/, 'on: names the level');
assert.strictEqual(hook('src/styles.css'), '', 'once per session');
assert.strictEqual(hook('src/util.ts', `${sid}-b`), '', 'non-UI file: no output');

set('auto', 'full');
assert.match(JSON.parse(hook('page.vue', `${sid}-c`)).hookSpecificOutput.additionalContext, /full visual pass/, 'auto full');
assert.match(set('auto', 'off'), /auto set to off/, 'auto off');
assert.strictEqual(hook('page.vue', `${sid}-d`), '', 'off again: no output');

for (const s of [sid, `${sid}-c`]) fs.rmSync(path.join(os.tmpdir(), `visual-pass-${s}`), { force: true });
fs.rmSync(dir, { recursive: true });
console.log('ok');
