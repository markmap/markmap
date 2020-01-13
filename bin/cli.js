#!/usr/bin/env node

const { Command } = require('commander');
const { createMarkmap } = require('..');

const program = new Command();
program
.version(require('../package.json').version)
.description('Create a markmap from a Markdown input file')
.arguments('<input>')
.option('-o, --output <output>', 'specify filename of the output HTML')
.option('--no-open', 'do not open the output file after generation')
.action((input, cmd) => {
  return createMarkmap({
    open: cmd.open,
    input,
    output: cmd.output,
  });
});

program.parse(process.argv);
