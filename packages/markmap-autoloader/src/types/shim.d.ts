declare interface Window {
  markmap: typeof import('markmap-lib') &
    typeof import('markmap-view') & {
      autoLoader?: import('.').AutoLoaderOptions;
    };
}
