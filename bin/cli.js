#!/usr/bin/env node

const { Command } = require('commander');

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
