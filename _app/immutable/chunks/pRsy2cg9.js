var e={title:`Migrating from 0.18`},t=`<p>Markmap was rebuilt so that a node holds structured content instead of an HTML string. That is what makes clean exports, canvas, and rendering without a browser possible. It is a clean break: the <code>markmap-*</code> packages are replaced by <code>@markmap/*</code>, with new APIs.</p>
<h2 id="packages">Packages</h2>
<table>
<thead>
<tr>
<th>Before</th>
<th>Now</th>
</tr>
</thead>
<tbody><tr>
<td><code>markmap-lib</code></td>
<td><code>@markmap/parse</code></td>
</tr>
<tr>
<td><code>markmap-view</code></td>
<td><a href="packages/view">@markmap/view</a></td>
</tr>
<tr>
<td><code>markmap-render</code></td>
<td><code>@markmap/render</code> for layout and SVG, <code>@markmap/page</code> for HTML</td>
</tr>
<tr>
<td><code>markmap-toolbar</code></td>
<td><code>@markmap/toolbar</code></td>
</tr>
<tr>
<td><code>markmap-autoloader</code></td>
<td><a href="packages/autoloader">@markmap/autoloader</a></td>
</tr>
<tr>
<td><code>markmap-cli</code></td>
<td><a href="packages/cli">@markmap/cli</a></td>
</tr>
</tbody></table>
<h2 id="code">Code</h2>
<pre><code class="hljs language-js"><span class="hljs-comment">// Before</span>
<span class="hljs-keyword">const</span> transformer = <span class="hljs-keyword">new</span> <span class="hljs-title class_">Transformer</span>();
<span class="hljs-keyword">const</span> { root } = transformer.<span class="hljs-title function_">transform</span>(markdown);
<span class="hljs-title class_">Markmap</span>.<span class="hljs-title function_">create</span>(svg, <span class="hljs-literal">undefined</span>, root);

<span class="hljs-comment">// Now</span>
<span class="hljs-keyword">const</span> { root } = <span class="hljs-title function_">parse</span>(markdown);
<span class="hljs-title class_">Markmap</span>.<span class="hljs-title function_">create</span>(svg, root);</code></pre><p>There are no assets to load from a CDN any more: everything comes with the packages. Other changes:</p>
<table>
<thead>
<tr>
<th>Before</th>
<th>Now</th>
</tr>
</thead>
<tbody><tr>
<td><code>mm.setData(root, options)</code></td>
<td><code>mm.setTree(root, options)</code></td>
</tr>
<tr>
<td><code>deriveOptions(json)</code></td>
<td><code>resolveViewOptions(options, json)</code></td>
</tr>
<tr>
<td><code>mm.rescale(k)</code></td>
<td><code>mm.zoomBy(k)</code>, <code>mm.zoomIn()</code>, <code>mm.zoomOut()</code></td>
</tr>
<tr>
<td><code>mm.toggleNode(node)</code></td>
<td><code>mm.toggle(id)</code>, <code>mm.setFolded(id, folded)</code></td>
</tr>
<tr>
<td><code>mm.ensureVisible(node)</code></td>
<td><code>mm.focusNode(id)</code></td>
</tr>
<tr>
<td><code>fillTemplate(root, assets)</code></td>
<td><a href="packages/cli"><code>markmap file.md</code></a> for one HTML file, or <code>&lt;markmap-view&gt;</code></td>
</tr>
</tbody></table>
<h2 id="options">Options</h2>
<table>
<thead>
<tr>
<th>Before</th>
<th>Now</th>
</tr>
</thead>
<tbody><tr>
<td><code>initialExpandLevel</code></td>
<td><code>foldLevel</code>, where the root is depth 0, and no <code>-1</code></td>
</tr>
<tr>
<td><code>maxWidth</code></td>
<td><code>wrapWidth</code></td>
</tr>
<tr>
<td><code>spacingHorizontal</code></td>
<td><code>levelGap</code></td>
</tr>
<tr>
<td><code>spacingVertical</code></td>
<td><code>siblingGap</code></td>
</tr>
<tr>
<td><code>colorFreezeLevel</code></td>
<td><code>colorDepth</code></td>
</tr>
<tr>
<td><code>paddingX</code></td>
<td>Set by the theme</td>
</tr>
<tr>
<td><code>lineWidth</code></td>
<td>Set by the theme</td>
</tr>
<tr>
<td><code>extraJs</code>, <code>extraCss</code></td>
<td>Removed. Use plugins in code</td>
</tr>
<tr>
<td><code>embedAssets</code></td>
<td>Removed. Exported HTML always works offline</td>
</tr>
<tr>
<td><code>htmlParser</code></td>
<td>Removed. Only headings and list items become nodes</td>
</tr>
<tr>
<td><code>activeNode</code></td>
<td>Removed</td>
</tr>
</tbody></table>
<h2 id="markdown">Markdown</h2>
<ul>
<li>Raw HTML is dropped, except <a href="guide/magic-comments">magic comments</a> and a single <a href="guide/writing#images"><code>&lt;img&gt;</code> tag</a>.</li>
<li>Paragraphs, code blocks and tables are now <a href="guide/writing#notes">notes</a>, not nodes.</li>
<li>Math uses MathJax instead of KaTeX, and still needs no setup on this site.</li>
<li>Autoloader blocks use <code>&lt;script type=&quot;text/markdown&quot;&gt;</code> instead of <code>text/template</code>, and there is no <code>window.markmap.autoLoader</code>.</li>
</ul>
`;export{e as frontmatter,t as html};