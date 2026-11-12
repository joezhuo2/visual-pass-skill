#!/usr/bin/env node
const { execSync } = require('child_process');

for (const cmd of [
  'claude plugin marketplace add joezhuo2/visual-pass-skill',
  'claude plugin install visual-pass@visual-pass',
]) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`Failed: ${cmd}. Is the Claude Code CLI installed and on PATH?`);
    process.exit(1);
  }
}
console.log('visual-pass is installed with auto off. Restart Claude Code, then use /visual-pass light|full|ultra or /visual-pass auto light|full|off.');
