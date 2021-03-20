#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const { main } = require('..');
const pkg = require('../package.json');

const notifier = updateNotifier({ pkg });
notifier.notify();
main(pkg.version);
