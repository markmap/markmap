declare interface Window {
  mm: import('markmap-view').Markmap;
  markmap: typeof import('markmap-toolbar') &
    typeof import('markmap-view') & {
      cliOptions?: unknown;
    };
}
