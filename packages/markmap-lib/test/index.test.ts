import { Transformer } from '../src/index';

test('plugins', () => {
  const transformer = new Transformer();
  expect(transformer.plugins.map((plugin) => plugin.name)).toEqual([
    'frontmatter',
    'katex',
    'hljs',
    'npmUrl',
  ]);
  const assets = transformer.getAssets();
  expect(assets).toMatchSnapshot();
});

test('custom url provider', () => {
  const transformer = new Transformer();
  transformer.urlBuilder.setProvider('local', (path) => `/local/${path}`);
  transformer.urlBuilder.provider = 'local';
  const assets = transformer.getAssets();
  expect(assets).toMatchSnapshot();
});

test('content without frontmatter', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
- l1
  - l1.1
  - l1.2
    - l1.2.1
`);
  expect(result).toMatchSnapshot();
});

test('content with frontmatter', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
---
markmap:
  color: blue
---

- l1
  - l1.1
  - l1.2
    - l1.2.1
`);
  expect(result).toMatchSnapshot();
});

test('content with line endings of CRLF', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
---
markmap:
  color: blue
---

- l1
  - l1.1
  - l1.2
    - l1.2.1
`.replace(/\n/g, '\r\n'));
  expect(result).toMatchSnapshot();
});

test('content with only katex enabled', () => {
  const transformer = new Transformer();
  const result = transformer.transform(`\
---
markmap:
  color: blue
---

- $x = {-b \pm \sqrt{b^2-4ac} \over 2a}$
`);
  expect(result).toMatchSnapshot();
  expect(transformer.getUsedAssets(result.features)).toMatchSnapshot();
});
