var e={title:`@markmap/view`},t=`<p>The interactive map: zoom, pan, fold, animation and note popovers. For most apps, <a href="element">@markmap/element</a> is simpler and uses this underneath.</p>
<h2 id="installation">Installation</h2>
<pre><code class="hljs language-sh">npm install @markmap/parse @markmap/view</code></pre><h2 id="usage">Usage</h2>
<pre><code class="hljs language-html"><span class="hljs-tag">&lt;<span class="hljs-name">svg</span> <span class="hljs-attr">id</span>=<span class="hljs-string">&quot;map&quot;</span> <span class="hljs-attr">style</span>=<span class="hljs-string">&quot;width: 800px; height: 600px&quot;</span>&gt;</span><span class="hljs-tag">&lt;/<span class="hljs-name">svg</span>&gt;</span></code></pre><pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { parse } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/parse&#x27;</span>;
<span class="hljs-keyword">import</span> { <span class="hljs-title class_">Markmap</span> } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/view&#x27;</span>;

<span class="hljs-keyword">const</span> { root } = <span class="hljs-title function_">parse</span>(markdown);
<span class="hljs-keyword">const</span> mm = <span class="hljs-title class_">Markmap</span>.<span class="hljs-title function_">create</span>(<span class="hljs-variable language_">document</span>.<span class="hljs-title function_">querySelector</span>(<span class="hljs-string">&#x27;#map&#x27;</span>), root);</code></pre><p>To update the map, call <code>mm.setTree(root)</code>. Folded branches stay folded, so this suits live editing.</p>
<h2 id="options">Options</h2>
<p>Pass <code>ViewOptions</code> as the third argument of <code>Markmap.create</code>, or with <code>setTree</code> and <code>setOptions</code>. They include everything in <a href="../guide/options">Options</a>, where <code>theme</code> and <code>layout</code> are objects instead of names, plus:</p>
<table>
<thead>
<tr>
<th>Option</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>plugins</code></td>
<td><code>ContentPlugin[]</code></td>
<td>Inline content renderers. Defaults to <code>defaultContentPlugins</code></td>
</tr>
<tr>
<td><code>highlight</code></td>
<td><code>boolean</code></td>
<td>Color code in notes. Defaults to <code>true</code></td>
</tr>
<tr>
<td><code>measurer</code></td>
<td><code>Measurer</code></td>
<td>How text is measured. Defaults to a canvas measurer</td>
</tr>
</tbody></table>
<p>To apply options from a document, including names and theme options:</p>
<pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { parse } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/parse&#x27;</span>;
<span class="hljs-keyword">import</span> { <span class="hljs-title class_">Markmap</span>, resolveViewOptions } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/view&#x27;</span>;

<span class="hljs-keyword">const</span> { root, frontmatter } = <span class="hljs-title function_">parse</span>(markdown);
<span class="hljs-keyword">const</span> { options, warnings } = <span class="hljs-title function_">resolveViewOptions</span>({}, frontmatter.<span class="hljs-property">markmap</span>);
<span class="hljs-keyword">const</span> mm = <span class="hljs-title class_">Markmap</span>.<span class="hljs-title function_">create</span>(svg, root, options);</code></pre><h2 id="methods">Methods</h2>
<table>
<thead>
<tr>
<th>Method</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>setTree(root, options?)</code></td>
<td>Show a new tree, keeping folds for ids that still exist</td>
</tr>
<tr>
<td><code>setOptions(options)</code></td>
<td>Replace all options and redraw</td>
</tr>
<tr>
<td><code>fit()</code></td>
<td>Scale and center the drawing to fill the element</td>
</tr>
<tr>
<td><code>zoomIn()</code>, <code>zoomOut()</code>, <code>zoomBy(k)</code></td>
<td>Zoom around the center</td>
</tr>
<tr>
<td><code>toggle(id)</code>, <code>setFolded(id, folded)</code></td>
<td>Fold or unfold a node</td>
</tr>
<tr>
<td><code>expandAll(id?)</code>, <code>foldAll(id?)</code></td>
<td>Fold or unfold a subtree, the whole tree by default</td>
</tr>
<tr>
<td><code>foldToLevel(level)</code></td>
<td>Show the tree down to a level</td>
</tr>
<tr>
<td><code>setFoldedIds(ids, { animate })</code></td>
<td>Restore a saved fold state</td>
</tr>
<tr>
<td><code>focusNode(id, { scale, animate })</code></td>
<td>Unfold a node&#39;s ancestors and center on it</td>
</tr>
<tr>
<td><code>openNotes(id)</code>, <code>closeNotes()</code></td>
<td>Show or hide a node&#39;s notes</td>
</tr>
<tr>
<td><code>on(type, listener)</code></td>
<td>Listen to <code>render</code>, <code>zoom</code> or <code>fold</code>; returns an unsubscribe function</td>
</tr>
<tr>
<td><code>destroy()</code></td>
<td>Remove the map</td>
</tr>
</tbody></table>
<p><code>mm.result</code> is the latest render, which you can pass to <code>toSVGString</code> or <code>toPNG</code>. <code>mm.foldedIds</code> and the node ids make links to a particular view easy to build.</p>
<h2 id="export">Export</h2>
<pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { toPNG } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/canvas&#x27;</span>;
<span class="hljs-keyword">import</span> { toSVGString } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/render&#x27;</span>;

<span class="hljs-keyword">const</span> svg = <span class="hljs-title function_">toSVGString</span>(mm.<span class="hljs-property">result</span>);
<span class="hljs-keyword">const</span> png = <span class="hljs-keyword">await</span> <span class="hljs-title function_">toPNG</span>(mm.<span class="hljs-property">result</span>, { <span class="hljs-attr">colorScheme</span>: <span class="hljs-string">&#x27;dark&#x27;</span> });</code></pre><p>An image whose server does not allow cross-origin use shows its alt text in a PNG. To export without a browser, see <a href="../guide/use-with-nodejs">Use with Node.js</a>.</p>
<h2 id="math">Math</h2>
<p><code>remarkMath</code> parses <code>$…$</code>, and <code>mathContent</code> draws it. MathJax is loaded the first time a formula is drawn, so maps without math do not pay for it.</p>
<pre><code class="hljs language-sh">npm install @markmap/plugin-math</code></pre><pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { parse } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/parse&#x27;</span>;
<span class="hljs-keyword">import</span> { mathContent, remarkMath } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/plugin-math&#x27;</span>;
<span class="hljs-keyword">import</span> { defaultContentPlugins } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/render&#x27;</span>;
<span class="hljs-keyword">import</span> { <span class="hljs-title class_">Markmap</span> } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/view&#x27;</span>;

<span class="hljs-keyword">const</span> { root } = <span class="hljs-title function_">parse</span>(markdown, { <span class="hljs-attr">plugins</span>: [remarkMath] });
<span class="hljs-title class_">Markmap</span>.<span class="hljs-title function_">create</span>(svg, root, { <span class="hljs-attr">plugins</span>: [...defaultContentPlugins, mathContent] });</code></pre><p>With <code>&lt;markmap-view&gt;</code>:</p>
<pre><code class="hljs language-js">view.<span class="hljs-property">parseOptions</span> = { <span class="hljs-attr">plugins</span>: [remarkMath] };
view.<span class="hljs-property">options</span> = { <span class="hljs-attr">plugins</span>: [...defaultContentPlugins, mathContent] };</code></pre><h2 id="toolbar">Toolbar</h2>
<p>With <code>&lt;markmap-view&gt;</code>, add the <code>toolbar</code> attribute. Otherwise:</p>
<pre><code class="hljs language-sh">npm install @markmap/toolbar</code></pre><pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { createToolbar } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/toolbar&#x27;</span>;

<span class="hljs-keyword">const</span> toolbar = <span class="hljs-title function_">createToolbar</span>(mm);
<span class="hljs-variable language_">document</span>.<span class="hljs-property">body</span>.<span class="hljs-title function_">append</span>(toolbar.<span class="hljs-property">element</span>);</code></pre><p>The element is not positioned, so style <code>.markmap-toolbar</code> to place it. <code>items</code> takes <code>zoom-in</code>, <code>zoom-out</code>, <code>fit</code>, <code>expand-all</code> and <code>fold-level</code>, in the order you want them, and buttons of your own:</p>
<pre><code class="hljs language-js"><span class="hljs-title function_">createToolbar</span>(mm, {
  <span class="hljs-attr">items</span>: [<span class="hljs-string">&#x27;zoom-in&#x27;</span>, <span class="hljs-string">&#x27;zoom-out&#x27;</span>, { <span class="hljs-attr">label</span>: <span class="hljs-string">&#x27;Save&#x27;</span>, <span class="hljs-attr">onClick</span>: <span class="hljs-function">(<span class="hljs-params">mm</span>) =&gt;</span> <span class="hljs-title function_">save</span>(mm.<span class="hljs-property">foldedIds</span>) }],
});</code></pre><h2 id="canvas">Canvas</h2>
<p>For very large maps, pass a canvas backend instead of an element. With <code>&lt;markmap-view&gt;</code>, set <code>renderer=&quot;canvas&quot;</code>.</p>
<pre><code class="hljs language-sh">npm install @markmap/canvas</code></pre><pre><code class="hljs language-js"><span class="hljs-keyword">import</span> { <span class="hljs-title class_">CanvasBackend</span> } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/canvas&#x27;</span>;
<span class="hljs-keyword">import</span> { <span class="hljs-title class_">Markmap</span> } <span class="hljs-keyword">from</span> <span class="hljs-string">&#x27;@markmap/view&#x27;</span>;

<span class="hljs-keyword">const</span> mm = <span class="hljs-keyword">new</span> <span class="hljs-title class_">Markmap</span>(<span class="hljs-keyword">new</span> <span class="hljs-title class_">CanvasBackend</span>(canvas), options);</code></pre><p>Canvas skips what is out of view and draws small text as bars, so it stays smooth with thousands of nodes. It has no accessibility tree yet, so use SVG unless your map needs this.</p>
`;export{e as frontmatter,t as html};