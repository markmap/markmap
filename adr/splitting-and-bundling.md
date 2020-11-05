# Splitting and Bundling

## Context

coc-markmap / markmap-cli has an incredibly large size in `node_modules`. (~30MB)

### Redundant dependencies

In markmap-lib@0.9.x transforming and rendering share the same package, but they have quite different dependencies and are used in quite different scenarios. In other words many of the dependencies are useless most of the time.

For example, transforming usually occurs locally when creating a markmap, while rendering happens in the browser when the markmap is opened. So if we are trying to create a markmap, it's likely that we don't need d3 and its friends. If we are exploring a markmap it's likely that we don't need all those transforming tools like remarkable and katex.

### Extraneous bundles

Some packages build multiple bundles to support different types of import. For example, `index.js` for `cjs`, and `index.min.js` for minimized `cjs` bundle, and several more. As a result, each of the bundle contains a copy of code, leading to a huge size.

After bundling into a single package, we get a single copy of the code, and optionally minimized.

## Decision

- Split rendering code from `markmap-lib` into a new package `markmap-view`.

  By splitting the packages we can manage dependencies more independently, and get rid of unused ones.

  In most cases, `markmap-view` can be used as a prebuilt bundle, even without installation by leveraging CDNs.

- Use rollup to bundle code in `markmap-cli`.

  Under the hood, `coc-markmap` depends on `markmap-cli`, and `markmap-cli` depends on `markmap-lib`.

  `markmap-lib` is supposed to be used in applications with bundlers, so it's better to keep simple and externalize the dependencies.

  `markmap-cli` is a standalone command-line tool. It should be installed without dependency bloat. So it is a good idea to bundle everything in it and get rid of additional dependency packages.

  `coc-markmap` is a thin layer on top of `markmap-cli` so we can just leave it as is.

## Consequences

- Smaller `node_modules` size

  ~30MB -> 6.3MB

- Breaking changes

  ```diff
  - import { Markmap } from 'markmap-lib';
  + import { Markmap } from 'markmap-view';
  ```
