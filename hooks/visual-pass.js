#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const stateFile = path.join(dir, '.visual-pass.json');
const AUTO = ['light', 'full', 'off'];
const MEASURE = path.join(__dirname, '..', 'scripts', 'measure.js');
const SELF = __filename;
const UI = /\.(html|css|scss|sass|less|jsx|tsx|vue|svelte|astro)$/i;

const readAuto = () => {
  try {
    const a = JSON.parse(fs.readFileSync(stateFile, 'utf8')).auto;
    return AUTO.includes(a) ? a : 'off';
  } catch {
    return 'off';
  }
};

const USAGE = 'Usage: /visual-pass light|full|ultra runs a pass; /visual-pass auto [light|full|off] sets the after-edit reminder.';

const COMMON = `Browser: use whatever browser tool this session has (built-in mcp__Claude_Browser__* javascript_tool, computer zoom, resize_window; Chrome DevTools MCP evaluate_script, take_screenshot, resize_page; Claude in Chrome javascript_tool, computer). If none is available, say so and stop; install nothing.
Measure: read ${MEASURE} once and evaluate its contents in the page (Chrome DevTools evaluate_script wants a function: prefix the contents with "() => "). It returns a few text lines and defines __vp(); re-measure with __vp(), and evaluate the file again after a reload or navigation. Line 1 is "visual-pass WxH fp=<hash> issues=N", then one line per issue (overflow-x, offscreen-x, clipped, overlap, font, tap, img-broken). Equal fp means an identical frame.
Rules:
1. Measure every state first; it costs a few lines of text.
2. Screenshot only the states named below. Prefer a zoom/crop of the flagged region at about 0.5 scale over a full-page shot.
3. Never re-screenshot a state whose fp is unchanged since its last capture.
4. Check copy and structure with text reads (accessibility tree, page text), not screenshots.
5. Fix what you find, re-run __vp() on fixed states, and re-screenshot only the fixed region.
6. Report in at most 4 lines: states checked, issues found and fixed, anything not verified.`;

const LIGHT = `Scope: from git diff (plus untracked files and files edited this session) list the routes, components and states the change touches. Use one viewport (the current one, or 1280x800). Measure each state. Screenshot flagged states plus diff-touched states: 3 to 6 screenshots, budget 5-10k tokens.`;

const FULL = `Transitions: for each animation or transition the diff touches, trigger it and measure at start, mid, end and end plus one frame. The same fp across frames means the animation is not running. Screenshot those 3-4 frames as crops only where the motion needs a look. About 5k extra tokens.`;

const ULTRA = `Cost: about 40-80 screenshots, 60-120k tokens. Tell the user that in one line, then proceed because they typed ultra.
Scope: every route and reachable state (menus, dialogs, tabs, form errors, empty and loading states) at two viewports, 1280x800 and 375x812. Measure every state at both; screenshot each state once per viewport, as crops where possible, plus every flagged region. Cover transitions as below.
${FULL}`;

const PASS = {
  light: `VISUAL PASS LIGHT. Verify the UI change at the lowest token cost.\n${COMMON}\n${LIGHT}`,
  full: `VISUAL PASS FULL. Verify the UI change at the lowest token cost.\n${COMMON}\n${LIGHT}\n${FULL}`,
  ultra: `VISUAL PASS ULTRA. Full sweep of the UI.\n${COMMON}\n${ULTRA}`,
};

const [cmd, arg, level] = process.argv.slice(2);

if (cmd === 'set') {
  if (!arg) {
    console.log(`visual-pass auto: ${readAuto()}. ${USAGE} Tell the user in one sentence.`);
  } else if (PASS[arg]) {
    console.log(PASS[arg]);
  } else if (arg === 'auto') {
    const a = level || 'light';
    if (AUTO.includes(a)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify({ auto: a }));
      console.log(`visual-pass auto set to ${a}${a === 'off' ? '' : ': after UI edits you will be reminded to run a ' + a + ' pass'}. Tell the user in one sentence.`);
    } else {
      console.log('visual-pass auto can be light, full or off (never ultra). Tell the user in one sentence.');
    }
  } else {
    console.log(`${USAGE} Tell the user in one sentence.`);
  }
  return;
}

const auto = readAuto();
if (auto === 'off') return;

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch {}
const file = (input.tool_input && input.tool_input.file_path) || '';
if (!UI.test(file)) return;

const marker = input.session_id && path.join(os.tmpdir(), `visual-pass-${String(input.session_id).replace(/[^\w-]/g, '')}`);
if (marker && fs.existsSync(marker)) return;
if (marker) fs.writeFileSync(marker, auto);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `visual-pass auto ${auto}: a UI file was edited. Before finishing, run a ${auto} visual pass on the touched states; get the steps with: node "${SELF}" set ${auto}`,
  },
}));
