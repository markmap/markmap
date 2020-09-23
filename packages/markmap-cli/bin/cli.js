#!/usr/bin/env node

const { Command } = require('commander');
const open = require('open');
const markmap = require('..');

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
.action(async (input, cmd) => {
  const options = {
    input,
    output: cmd.output,
    mathJax: cmd.enableMathjax,
    prism: cmd.enablePrism,
  };
  if (cmd.watch) {
    return markmap.develop({
      ...options,
      open: cmd.open,
    });
  }
  const output = await markmap.createMarkmap(options);
  if (cmd.open) open(output);
});

program.parse(process.argv);
