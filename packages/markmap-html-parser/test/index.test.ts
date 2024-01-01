import { parseHtml, convertNode } from '../src/index';

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
<li>item 3</li>
<li>item 4</li>
</li>
</ul>
</ul>
<ol>
<li>item 5</li>
<li>item 6</li>
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
