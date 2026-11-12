<h1 align="center">visual-pass</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/visual-pass"><img src="https://img.shields.io/npm/v/visual-pass?logo=npm&color=orange" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/visual-pass"><img src="https://img.shields.io/npm/dt/visual-pass?logo=npm&color=blue" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform: Windows | macOS | Linux">
  <a href="https://code.claude.com/docs/en/plugins"><img src="https://img.shields.io/badge/Claude%20Code-plugin-D97757?logo=claude&logoColor=white" alt="Claude Code plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-18%2B-5FA04E?logo=nodedotjs&logoColor=white" alt="Node 18+"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/joezhuo2/visual-pass-skill?color=green" alt="license"></a>
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#modes">Modes</a> •
  <a href="#usage">Usage</a> •
  <a href="#how-it-keeps-cost-down">Cost</a> •
  <a href="#files">Files</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

> visual-pass is a Claude Code plugin that makes Claude look at the UI it
> just changed, for as few tokens as possible. A screenshot costs about
> 1,500 to 2,000 tokens, so Claude runs a small measuring script first. The
> script returns a few lines of text per page state, and Claude screenshots
> only the states it flags plus the ones your diff touched, as half-scale
> crops where it can.

## Install

Pick one. All of them install the same plugin. Auto mode starts off, so the
plugin costs nothing until you run `/visual-pass`.

- **npx:** nothing stays installed besides the plugin.

  ```bash
  npx visual-pass
  ```

- **npm, global:** installs the `visual-pass` command, which you then run
  once.

  ```bash
  npm i -g visual-pass
  ```

  ```bash
  visual-pass
  ```

- **Claude Code plugin marketplace:** run these inside Claude Code.

  ```
  /plugin marketplace add joezhuo2/visual-pass-skill
  /plugin install visual-pass@visual-pass
  ```

- **Straight from GitHub:** no npm registry needed.

  ```bash
  npx github:joezhuo2/visual-pass-skill
  ```

The npx and npm installers run the two marketplace commands for you through
the `claude` CLI, so it has to be on your `PATH`.

A pass needs a browser tool in the session: the built-in browser of the
Claude desktop app, the Chrome DevTools MCP server, or Claude in Chrome.
Without one, Claude says so and stops; it does not install anything.

### Updates

```bash
claude plugin marketplace update visual-pass
```

```bash
claude plugin update visual-pass@visual-pass
```

### Uninstall

```bash
claude plugin uninstall visual-pass@visual-pass
```

Delete `~/.claude/.visual-pass.json` too if you had turned auto on.

## Modes

| Mode | Screenshots | Rough cost |
| --- | --- | --- |
| light: diff-scoped, one viewport | 3 to 6 | 5,000 to 10,000 tokens |
| full: light plus transitions | +3 to 4 frames | another 5,000 |
| ultra: full sweep, two viewports | 40 to 80 | 60,000 to 120,000 |

### Light

Claude reads the diff (plus untracked files and files it edited this
session), works out which routes, components and states it touches, and
measures each one at a single viewport. It screenshots the flagged states
and the diff-touched states, nothing else.

### Full

Light, plus transitions. For each animation or transition the diff touches,
Claude triggers it and measures four frames: start, middle, end and one
frame after. If the fingerprint is the same across frames, the animation is
not running. It screenshots those frames only where the motion needs a look.

### Ultra

Every route and reachable state (menus, dialogs, tabs, form errors, empty
and loading states) at 1280x800 and 375x812. Claude states the cost first
and runs it only because you typed `ultra`; it is never picked
automatically.

### Auto

`/visual-pass auto light` or `auto full` makes Claude run a pass after it
edits UI files (`.html .css .scss .sass .less .jsx .tsx .vue .svelte
.astro`). A hook adds one line of context the first time that happens in a
session and nothing after that. Auto is off by default and can never be
`ultra`. The setting is saved for every session.

## Usage

```
/visual-pass
/visual-pass light
/visual-pass full
/visual-pass ultra
/visual-pass auto
/visual-pass auto full
/visual-pass auto off
```

`/visual-pass` with no argument shows the auto setting. Bare `auto` means
`auto light`. The plugin registers the command as
`/visual-pass:visual-pass`; typing `/visual-pass` finds it.

## How it keeps cost down

- **Script first:** `scripts/measure.js` runs in the page and returns text,
  for example:

  ```
  visual-pass 1280x800 fp=a1bcfa64 issues=3
  overflow-x document scrollWidth=1600 > 1280
  font p.tiny 9px
  clipped div.clip scrollWidth=239 clientWidth=80
  ```

  It checks document overflow, elements sticking out of the viewport, text
  clipped without an ellipsis, overlapping text, fonts under 12px, tap
  targets under 24x24 on viewports 480px wide or less, and broken images.
  Output is capped at 3 lines per check and about 15 lines in total.
  `issues=0` is the whole output for a clean state.
- **Screenshots only where needed:** flagged states and diff-touched states,
  as crops of the flagged region at about half scale (roughly a quarter of a
  full screenshot's cost).
- **Fingerprint:** `fp` is a hash of the visible layout (rounded boxes,
  opacity, transform, scroll). A state whose fingerprint has not changed is
  never screenshotted again, and equal fingerprints across animation frames
  show the animation did not run.
- **Text over pixels:** copy and structure are checked through the
  accessibility tree or page text.
- **Fix loop:** after a fix Claude re-runs the script, not the screenshots,
  and re-shoots only the fixed region.
- **Short report:** a few lines: states checked, issues found and fixed,
  anything not verified.
- **Zero cost when idle:** with auto off, the hook prints nothing and the
  command text is only loaded when you run it. The command loads only the
  instructions for the mode you asked for.

## Files

| What | Path |
| --- | --- |
| Saved auto setting | `~/.claude/.visual-pass.json` (absent means `off`) |
| Measuring script | `scripts/measure.js` |
| Pass instructions and auto hook | `hooks/visual-pass.js` |
| Hook registration | `hooks/hooks.json` |
| Slash command | `commands/visual-pass.md` |
| Plugin and marketplace manifests | `.claude-plugin/` |
| npx / npm installer | `bin/install.js` |

If `CLAUDE_CONFIG_DIR` is set, the settings file lives there instead of
`~/.claude`.

## Development

### How it works

`/visual-pass` runs `hooks/visual-pass.js set <args>`, which prints the
instructions for that mode (or saves the auto setting) into Claude's
context. Claude reads `scripts/measure.js` once, evaluates it in the page
with the session's browser tool, and re-measures later states with the
`__vp()` function it leaves behind.

A `PostToolUse` hook on `Edit|Write|MultiEdit` runs the same script. With
auto off it exits without reading anything. With auto on, after an edit to
a UI file it returns one `additionalContext` line, and marks the session in
a small file in the system temp folder so it does not repeat.

`scripts/measure.js` is one expression: evaluated in a page it returns the
report, and `require`d in Node it exports its pure helpers for the tests.

### Test

Requirements: Node 18+ and the Claude Code CLI.

```bash
npm test                                                   # measure helpers, command and hook self-test
claude plugin validate .                                   # manifest check
claude --plugin-dir . -p "/visual-pass:visual-pass"        # run the command from the local copy, no install
```

### Releasing

Bump the version in `package.json` and `.claude-plugin/plugin.json`, add a
`CHANGELOG.md` entry, then push a matching `v*` tag. GitHub Actions runs
`npm test`, checks the tag matches `package.json`, publishes to npm with
provenance (skipped if that version is already on npm) and creates the
GitHub release.

```bash
git tag v0.1.1
git push origin v0.1.1
```

CI publishing needs an npm automation token saved as the `NPM_TOKEN`
repository secret. Without it, publish by hand with `npm publish` before
pushing the tag.

## Contributing

Issues and pull requests are welcome at
[joezhuo2/visual-pass-skill](https://github.com/joezhuo2/visual-pass-skill).
Keep changes small and run `npm test` before you open one.

## License

[MIT](LICENSE)
