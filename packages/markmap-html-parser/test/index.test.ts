import { expect, test } from 'vitest';
import { convertNode, parseHtml } from '../src/index';

test('parseHtml', () => {
  const root = parseHtml(`
<body>
<div class="container">
<h1 data-id="h1">heading 1</h1>
<p>text here will be ignored.</p>
<ul>
<li>this list</li>
<li>is ignored</li>
</ul>
<h2 data-id="h2">heading 2 <!-- markmap: foldAll --></h2>
<p>text also ignored</p>
<ul>
<li><p>item 1</p></li>
<li><p>item 2</p>
<ul>
<li><p>item 3</p></li>
<li><p>item 4</p><p>additional text</p></li>
</li>
</ul>
</ul>
<ol>
<li>item 5</li>
<li>item 6</li>
<li>item 7
<ul>
<li>item 7.1
<ul>
<li>item 7.1.1</li>
<li>item 7.1.2</li>
</ul>
</li>
<li>item 7.2</li>
</ul>
</li>
</ol>
<h2>A table</h2>
<table>
<tr>
<td>
<ul><li>this list is ignored</li></ul>
</td>
</tr>
</table>
<p><img src="image1.png"></p>
<p><img src="image2.png"></p>
</div>
</body>
`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('parseHtml with data', () => {
  const root = parseHtml(`
<ul data-lines="0,4">
<li data-lines="0,4">l1
<ul data-lines="1,4">
<li data-lines="1,2">l1.1</li>
<li data-lines="2,4">l1.2
<ul data-lines="3,4">
<li data-lines="3,4">l1.2.1</li>
</ul></li>
</ul></li>
</ul>`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('li > pre', () => {
  const root = parseHtml(`<body>
<ul>
<li>hello</li>
<li><pre><code>code block</code></pre></li>
</ul>
</body>`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});

test('ol > li', () => {
  const root = parseHtml(`<body>
<ol start="3">
<li>hello</li>
<li>world</li>
</ol>
</body>`);
  expect(root).toMatchSnapshot();
  expect(convertNode(root)).toMatchSnapshot();
});
