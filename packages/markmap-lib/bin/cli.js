#!/usr/bin/env node

const COLOR_MAP = {
  red: 31,
  green: 32,
  yellow: 33,
};
function colored(text, color) {
  color = COLOR_MAP[color] || color;
  return `\x1b[1;${color}m${text}\x1b[0m`;
}

console.error(colored(`
DEPRECATED: The CLI feature of markmap-lib is moved to markmap-cli since v0.9.0,
please consider using markmap-cli instead.
`, 'red'));
console.error(colored('Using npx:', 'yellow'));
console.error(`
    npx markmap-cli note.md
`);
console.error(colored('Using yarn:', 'yellow'));
console.error(`
    yarn global remove markmap-lib
    yarn global add markmap-cli
    markmap note.md
`);
console.error(colored('Using npm:', 'yellow'));
console.error(`
    npm uninstall --global markmap-lib
    npm install --global markmap-cli
    markmap note.md
`);
