#!/usr/bin/env node

const { Command } = require('commander');
const { createMarkmap } = require('..');

const program = new Command();
program
.version(require('../package.json').version)
.description('Create a markmap from a Markdown input file')
.arguments('<input>')
.option('-o, --output <output>', 'specify filename of the output HTML')
.option('--enable-mathjax', 'enable MathJax support')
.option('--enable-prism', 'enable PrismJS support')
.option('--no-open', 'do not open the output file after generation')
.action((input, cmd) => {
  return createMarkmap({
    open: cmd.open,
    input,
    output: cmd.output,
    mathJax: cmd.enableMathjax,
    prism: cmd.enablePrism,
  });
});

program.parse(process.argv);
