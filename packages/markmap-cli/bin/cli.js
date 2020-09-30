#!/usr/bin/env node

const fs = require('fs').promises;
const { Command } = require('commander');
const open = require('open');
const updateNotifier = require('update-notifier');
const markmap = require('..');
const pkg = require('../package.json');

const notifier = updateNotifier({ pkg });
notifier.notify();

const program = new Command();
program
.version(require('../package.json').version)
.description('Create a markmap from a Markdown input file')
.arguments('<input>')
.option('-o, --output <output>', 'specify filename of the output HTML')
.option('--no-open', 'do not open the output file after generation')
.option('-w, --watch', 'watch the input file and update output on the fly, note that this feature is for development only')
.action(async (input, cmd) => {
  const content = await fs.readFile(input, 'utf8');
  const output = cmd.output || `${input.replace(/\.\w*$/, '')}.html`;
  if (cmd.watch) {
    await markmap.develop({
      input,
      output,
      open: cmd.open,
    });
  }
  await markmap.createMarkmap({
    content,
    output,
    open: cmd.open,
  });
});

program.parse(process.argv);
