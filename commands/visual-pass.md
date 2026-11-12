---
description: Visually verify UI work at the lowest token cost - light, full or ultra pass, or auto light|full|off (saved for all sessions). No argument shows the auto setting.
argument-hint: "[light|full|ultra|auto [light|full|off]]"
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/visual-pass.js" set $ARGUMENTS`
