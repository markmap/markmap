#!/usr/bin/env node

import { main } from '../dist/index.js';

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
