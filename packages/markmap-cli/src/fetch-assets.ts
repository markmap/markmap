import { program } from 'commander';
import { fetchAssets } from './util/assets-fetcher';

program
  .description('Fetch assets for markmap-cli')
  .option('--ignoreErrors', 'Ignore errors when failing to download assets')
  .option('--verbose', 'Show verbose logs')
  .action(async (cmd) => {
    try {
      await fetchAssets({ verbose: cmd.verbose });
    } catch (err) {
      console.error(err);
      if (!cmd.ignoreErrors) process.exitCode = 1;
    }
  });

program.parse();
