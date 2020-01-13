#!/usr/bin/env node

const { Command } = require('commander');
const { createMarkmap } = require('..');

const program = new Command();
program
.version(require('../package.json').version);

program
.command('create <input>')
.description('Create a markmap from a Markdown input file')
.option('-o, --output <output>', 'Specify filename of the output HTML')
.option('--no-open', 'Do not open the output file after generation')
.action((input, cmd) => {
  createMarkmap(input, {
    open: cmd.open,
    output: cmd.output,
  });
});

program.parse(process.argv);
