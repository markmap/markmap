#!/bin/sh

set -e

npx typedoc --out api --titleLink / \
  packages/markmap-common/src/index.ts \
  packages/markmap-html-parser/src/index.ts \
  packages/markmap-lib/src/index.ts \
  packages/markmap-render/src/index.ts \
  packages/markmap-toolbar/src/index.ts \
  packages/markmap-view/src/index.ts
