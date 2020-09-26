#!/usr/bin/env node

const { Command } = require('commander');

const COLOR_MAP = {
  red: 31,
  green: 32,
  yellow: 33,
};
function colored(text, color) {
  color = COLOR_MAP[color] || color;
  return `\x1b[1;${color}m${text}\x1b[0m`;
}

const program = new Command();
program
.version(require('../package.json').version)
.description('Create a markmap from a Markdown input file')
.arguments('<input>')
.option('-o, --output <output>', 'specify filename of the output HTML')
.option('--enable-mathjax', 'enable MathJax support')
.option('--enable-prism', 'enable PrismJS support')
.option('--no-open', 'do not open the output file after generation')
.option('-w, --watch', 'watch the input file and update output on the fly, note that this feature is for development only')
.action((input, cmd) => {
  console.error(colored(`
DEPRECATED: The CLI feature of markmap-lib will be removed in v0.9.0,
please consider using markmap-cli instead.
`, 'yellow'));

  const options = {
    open: cmd.open,
    input,
    output: cmd.output,
    mathJax: cmd.enableMathjax,
    prism: cmd.enablePrism,
  };
  if (cmd.watch) {
    return require('../dist/dev-server').develop(options);
  }
  return require('..').createMarkmap(options);
});

program.parse(process.argv);
