# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-11-11

### Added

- `/visual-pass light|full|ultra`: a visual check of UI work. `light` covers the states the diff touches at one viewport, `full` adds transition frames, `ultra` sweeps every route and state at 1280x800 and 375x812.
- `scripts/measure.js`: a zero-dependency in-page script that returns a few lines of text per state (document overflow, elements past the viewport, clipped text, overlapping text, fonts under 12px, tap targets under 24x24 on narrow viewports, broken images) and a layout fingerprint for spotting identical frames.
- `/visual-pass auto light|full|off`, saved for every session. Default is `off`. When on, a `PostToolUse` hook adds one line of context after the first UI file edit in a session.
- npx / npm installer and self-test.
